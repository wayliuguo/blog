'use strict';

// 五大数据类型实操：每种类型都用贴合后端的真实用例演示
require('dotenv').config();
const redis = require('./client');

// 统一前缀，演示结束统一清理，避免污染 Redis
const PREFIX = 'demo:datatypes:';

async function main() {
  // ===== String：缓存用户信息 =====
  console.log('\n===== String：缓存用户信息 =====');
  const userKey = PREFIX + 'user:1001';
  await redis.set(
    userKey,
    JSON.stringify({ id: 1001, name: '张三', age: 28 }),
    'EX',
    60
  );
  const user = await redis.get(userKey);
  console.log('从缓存读取的用户信息：', user);

  // ===== String：计数器（INCR）=====
  console.log('\n===== String：计数器 INCR（文章阅读量 / 限流计数）=====');
  const counterKey = PREFIX + 'view:article:42';
  await redis.set(counterKey, 0);
  const c1 = await redis.incr(counterKey);
  const c2 = await redis.incrBy(counterKey, 5);
  console.log('INCR 后：', c1, ' INCRBY 5 后：', c2, '（原子自增，无需先读再写）');

  // ===== Hash：存对象 =====
  console.log('\n===== Hash：存对象 HSET / HGETALL =====');
  const hashKey = PREFIX + 'profile:1001';
  await redis.hset(hashKey, 'name', '张三', 'age', '28', 'city', '北京');
  const profile = await redis.hgetall(hashKey);
  console.log('HGETALL 结果：', profile);
  console.log('对比：Hash 可只更新单个字段（如 HSET age 29），而用 String 存 JSON 必须整体覆盖重写。');
  console.log('适用：字段会被单独更新的对象（用户资料、商品属性）。');

  // ===== List：简易队列 =====
  console.log('\n===== List：LPUSH / RPOP 简易队列 =====');
  const queueKey = PREFIX + 'queue:tasks';
  await redis.del(queueKey);
  await redis.lpush(queueKey, 'task-3', 'task-2', 'task-1'); // 依次入队
  const pop1 = await redis.rpop(queueKey); // 队头取出（先进先出）
  const pop2 = await redis.rpop(queueKey);
  console.log('按入队顺序取出：', pop1, pop2, '（LPUSH+RPOP 实现 FIFO 队列）');

  // ===== Set：去重 =====
  console.log('\n===== Set：去重（在线用户 / 标签）=====');
  const onlineKey = PREFIX + 'online';
  await redis.del(onlineKey);
  await redis.sadd(onlineKey, 'u1', 'u2', 'u1', 'u3');
  const online = await redis.smembers(onlineKey);
  console.log('在线用户（自动去重）：', online, ' 数量 SCARD =', await redis.scard(onlineKey));
  console.log('说明：重复 SADD 同一个 member 不会增加，适合去重集合。');

  // ===== ZSet：排行榜 =====
  console.log('\n===== ZSet：排行榜（按分数排序）=====');
  const rankKey = PREFIX + 'scores';
  await redis.del(rankKey);
  await redis.zadd(rankKey, 90, 'playerA', 70, 'playerB', 85, 'playerC');
  const top = await redis.zrevrange(rankKey, 0, 2, 'WITHSCORES');
  console.log('Top3（高到低）：', top);

  // ===== ZSet：延时队列 =====
  console.log('\n===== ZSet：延时队列（score 为执行时间戳）=====');
  const delayKey = PREFIX + 'delay';
  await redis.del(delayKey);
  const now = Date.now();
  await redis.zadd(delayKey, now + 1000, 'job1', now + 3000, 'job2');
  const due = await redis.zrangebyscore(delayKey, 0, now + 1500); // 取已到期任务
  console.log('当前可执行的延时任务（score <= now+1500）：', due);
}

main()
  .then(async () => {
    console.log('\n===== 清理本次写入的 key（统一前缀 ' + PREFIX + '）=====');
    const keys = await redis.keys(PREFIX + '*');
    if (keys.length) {
      await redis.del(keys);
      console.log('已删除：', keys);
    }
    await redis.quit();
  })
  .catch(async (e) => {
    console.error('执行出错：', e);
    await redis.quit();
    process.exit(1);
  });
