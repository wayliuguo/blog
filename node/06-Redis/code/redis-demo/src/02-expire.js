'use strict';

// 演示键过期：EXPIRE / TTL / PERSIST / SET EX，以及惰性删除与定期删除的行为
require('dotenv').config();
const redis = require('./client');

const PREFIX = 'demo:expire:';

async function main() {
  // ===== EXPIRE / TTL / PERSIST / SET EX =====
  console.log('\n===== EXPIRE / TTL / PERSIST / SET EX =====');
  const k1 = PREFIX + 'a';
  await redis.set(k1, 'hello');
  await redis.expire(k1, 100); // 设置 100 秒过期
  console.log('EXPIRE 100 后 TTL =', await redis.ttl(k1), '(秒)');

  await redis.persist(k1); // 取消过期
  console.log('PERSIST 后 TTL =', await redis.ttl(k1), '（-1 表示永不过期）');

  const k2 = PREFIX + 'b';
  await redis.set(k2, 'world', 'EX', 200); // 写入时直接带过期
  console.log('SET ... EX 200 后 TTL =', await redis.ttl(k2), '(秒)');

  // ===== SET NX EX：原子抢占（分布式锁的基础）=====
  console.log('\n===== SET NX EX：原子抢占 =====');
  const lockKey = PREFIX + 'lock';
  const r1 = await redis.set(lockKey, 'token1', 'NX', 'EX', 30);
  console.log('第一次 SET NX EX：', r1, '（返回 OK，抢占成功）');
  const r2 = await redis.set(lockKey, 'token2', 'NX', 'EX', 30);
  console.log('第二次 SET NX EX：', r2, '（返回 null，key 已存在，抢锁失败）');
  await redis.del(lockKey);

  // ===== 惰性删除与定期删除行为观察 =====
  console.log('\n===== 惰性删除与定期删除行为观察（TTL=1s，每 300ms 采样）=====');
  const k3 = PREFIX + 'lazy';
  await redis.set(k3, 'temp', 'EX', 1);

  const timer = setInterval(async () => {
    const ttl = await redis.ttl(k3);
    const exists = await redis.exists(k3);
    console.log('  TTL=' + ttl + 's, EXISTS=' + exists);
  }, 300);

  // 5 秒后收尾：此时键应已被 Redis 删除
  setTimeout(async () => {
    clearInterval(timer);
    const exists = await redis.exists(k3);
    console.log('过期后 EXISTS 返回', exists, '（0 表示 key 已不存在，由 Redis 删除）');
    console.log('\n说明：Redis 采用惰性删除（访问到过期键才删）+ 定期删除（后台随机抽样）组合策略。');

    console.log('\n===== maxmemory-policy 8 种淘汰策略与适用场景 =====');
    console.log('noeviction    ：内存满时新写入直接报错（默认）。适合不允许丢数据的场景。');
    console.log('allkeys-lru   ：对所有 key 按 LRU 淘汰。最常用，适合纯缓存。');
    console.log('volatile-lru  ：只对设了 TTL 的 key 按 LRU 淘汰。缓存与持久数据混用时用。');
    console.log('allkeys-lfu   ：对所有 key 按 LFU（访问频率）淘汰。适合有明显热点且长期访问不均。');
    console.log('volatile-lfu  ：只对设了 TTL 的 key 按 LFU 淘汰。');
    console.log('allkeys-random：随机淘汰所有 key。性能最好但命中率差，少见。');
    console.log('volatile-random：随机淘汰设了 TTL 的 key。');
    console.log('volatile-ttl  ：优先淘汰剩余 TTL 最短的 key。');

    // 清理本次写入的 key
    const keys = await redis.keys(PREFIX + '*');
    if (keys.length) await redis.del(keys);
    console.log('\n已清理演示 key。');
    await redis.quit();
  }, 5000);
}

main().catch(async (e) => {
  console.error('执行出错：', e);
  await redis.quit();
  process.exit(1);
});
