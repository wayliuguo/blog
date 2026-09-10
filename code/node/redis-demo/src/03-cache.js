'use strict';

// 缓存实战：Cache-Aside 模式 + 穿透 / 击穿 / 雪崩 三类问题的防护演示
require('dotenv').config();
const redis = require('./client');

const PREFIX = 'demo:cache:';

// 模拟一次很慢的数据库查询（约 100ms）
function slowQuery(id) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // 假设数据库里只有 id=1 这条记录
      if (id === 1) resolve({ id, name: '商品A', price: 99 });
      else resolve(null);
    }, 100);
  });
}

async function main() {
  // ===== Cache-Aside：先查缓存，miss 则查库并回写 =====
  console.log('\n===== Cache-Aside 模式：先查缓存，miss 回源并回写 =====');
  async function getProduct(id) {
    const cacheKey = PREFIX + 'product:' + id;
    const cached = await redis.get(cacheKey);
    if (cached) return { data: JSON.parse(cached), hit: true };
    const db = await slowQuery(id);
    if (db) await redis.set(cacheKey, JSON.stringify(db), 'EX', 60); // 回写并设 TTL
    return { data: db, hit: false };
  }

  let t0 = Date.now();
  const r1 = await getProduct(1);
  const t1 = Date.now();
  let t2 = Date.now();
  const r2 = await getProduct(1);
  const t3 = Date.now();
  console.log(`第一次：缓存 miss，查库回写，耗时 ${t1 - t0}ms`);
  console.log(`第二次：缓存 hit，耗时 ${t3 - t2}ms`);
  const ratio = (t1 - t0) / Math.max(t3 - t2, 0.01);
  console.log(`结论：命中缓存后耗时降低约 ${ratio.toFixed(0)} 倍`);

  // ===== 缓存穿透：查询不存在的数据 =====
  console.log('\n===== 缓存穿透防护：缓存空值 =====');
  const missKey = PREFIX + 'product:999';
  const cachedMiss = await redis.get(missKey);
  if (cachedMiss === null) {
    const db = await slowQuery(999); // 数据库也查不到
    if (db === null) {
      // 缓存空值（短 TTL），让后续相同请求直接命中空值，不再打到数据库
      await redis.set(missKey, JSON.stringify(null), 'EX', 60);
      console.log('查不存在的 id，回源为空，缓存空值 60s');
      console.log('补充：更彻底的方案是在入口用布隆过滤器拦截非法 id，永远不查库。');
    }
  } else {
    console.log('命中缓存空值，直接返回，不再访问数据库');
  }

  // ===== 缓存击穿：热点 key 过期瞬间大量并发重建 =====
  console.log('\n===== 缓存击穿防护：互斥锁重建 =====');
  const hotKey = PREFIX + 'hot:1';
  const lockKey = PREFIX + 'lock:hot:1';

  async function getHotWithLock(requester) {
    const cached = await redis.get(hotKey);
    if (cached) {
      console.log(`  [${requester}] 命中缓存，直接返回`);
      return;
    }
    // 抢锁：只有一个请求能拿到锁去查库重建
    const locked = await redis.set(lockKey, requester, 'NX', 'EX', 5);
    if (!locked) {
      console.log(`  [${requester}] 未获取到锁，稍后重试`);
      await new Promise((r) => setTimeout(r, 50));
      return getHotWithLock(requester);
    }
    console.log(`  [${requester}] 抢到锁，开始重建缓存`);
    const db = await slowQuery(1);
    await redis.set(hotKey, JSON.stringify(db), 'EX', 60);
    await redis.del(lockKey);
  }

  // 场景一：正常抢锁重建，第二次直接命中
  await redis.del(hotKey);
  await redis.del(lockKey);
  await getHotWithLock('请求1');
  await getHotWithLock('请求2');

  // 场景二：模拟 key 已失效且锁被他人持有，演示“抢不到锁则等待重试”
  await redis.del(hotKey);
  await redis.set(lockKey, '其他请求', 'NX', 'EX', 1); // 人为持锁 1 秒
  console.log('此时锁被他人持有且 key 已失效：');
  await getHotWithLock('请求3'); // 会等待直到锁过期后再重建

  // ===== 缓存雪崩：大量 key 同一时刻集中过期 =====
  console.log('\n===== 缓存雪崩防护：TTL 随机抖动 =====');
  const baseTTL = 60;
  const uniform = [];
  const jittered = [];
  for (let i = 0; i < 10; i++) {
    uniform.push(baseTTL); // 统一 TTL
    jittered.push(baseTTL + Math.floor(Math.random() * 60)); // 加 0~60s 抖动
  }
  const uSpread = Math.max(...uniform) - Math.min(...uniform);
  const jSpread = Math.max(...jittered) - Math.min(...jittered);
  console.log('统一 TTL 分布跨度 =', uSpread, 's（同一时刻集体过期 => 雪崩）');
  console.log('抖动 TTL 分布跨度 =', jSpread, 's（过期时刻分散，避免集中失效）');
  console.log('结论：给 TTL 加随机抖动，可把过期冲击打散到不同时间点。');
}

main()
  .then(async () => {
    const keys = await redis.keys(PREFIX + '*');
    if (keys.length) await redis.del(keys);
    console.log('\n已清理缓存 key，演示结束。');
    await redis.quit();
  })
  .catch(async (e) => {
    console.error('执行出错：', e);
    await redis.quit();
    process.exit(1);
  });
