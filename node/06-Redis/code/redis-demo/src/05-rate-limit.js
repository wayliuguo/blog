'use strict';

// 三种限流算法：固定窗口 / 滑动窗口 / 令牌桶
require('dotenv').config();
const redis = require('./client');

const PREFIX = 'demo:limit:';

// 令牌桶 Lua 脚本：保证「计算+扣减」原子性，避免并发下多放
const tokenBucketScript = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local rate = tonumber(ARGV[2])      -- 每秒补充的令牌数
  local capacity = tonumber(ARGV[3])   -- 桶容量
  local tokens = tonumber(redis.call('hget', key, 'tokens') or capacity)
  local last = tonumber(redis.call('hget', key, 'ts') or now)
  local delta = math.max(0, now - last) / 1000 * rate   -- 这段时间补充的令牌
  tokens = math.min(capacity, tokens + delta)           -- 不超过容量
  local allowed = 0
  if tokens >= 1 then
    tokens = tokens - 1
    allowed = 1
  end
  redis.call('hset', key, 'tokens', tokens, 'ts', now)
  return allowed
`;

// 固定窗口：INCR + EXPIRE，窗口内计数，超过 limit 拒绝
async function fixedWindow(key, limit, total) {
  let passed = 0;
  let rejected = 0;
  for (let i = 0; i < total; i++) {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 1); // 首个请求开启 1s 窗口
    if (count <= limit) passed++;
    else rejected++;
  }
  return { passed, rejected };
}

// 滑动窗口：用 ZSet 记录每次请求时间戳，裁剪 1s 外的记录后看数量
async function slidingWindow(key, limit, total) {
  let passed = 0;
  let rejected = 0;
  for (let i = 0; i < total; i++) {
    const t = Date.now();
    await redis.zadd(key, t, t + '-' + i);
    await redis.zremrangebyscore(key, 0, t - 1000); // 删除 1s 前的记录
    const size = await redis.zcard(key);
    if (size <= limit) passed++;
    else {
      await redis.zrem(key, t + '-' + i);
      rejected++;
    }
  }
  return { passed, rejected };
}

// 令牌桶：用 Hash 存 tokens 与 lastRefill，Lua 保证原子
async function tokenBucket(key, capacity, rate, total) {
  let passed = 0;
  let rejected = 0;
  await redis.del(key);
  for (let i = 0; i < total; i++) {
    const allowed = await redis.eval(tokenBucketScript, 1, key, Date.now(), rate, capacity);
    if (allowed === 1) passed++;
    else rejected++;
  }
  return { passed, rejected };
}

async function main() {
  const TOTAL = 200; // 1 秒内模拟 200 次请求
  const LIMIT = 50; // 限流阈值：每秒最多 50 次

  console.log('\n===== 固定窗口限流 =====');
  const fk = PREFIX + 'fixed';
  await redis.del(fk);
  const f = await fixedWindow(fk, LIMIT, TOTAL);
  console.log(`固定窗口：200 次请求通过 ${f.passed} 次，拒绝 ${f.rejected} 次`);
  console.log('临界问题：窗口切换瞬间（旧窗口末尾 + 新窗口开头）可能放行 2 倍流量。');

  console.log('\n===== 滑动窗口限流 =====');
  const sk = PREFIX + 'sliding';
  await redis.del(sk);
  const s = await slidingWindow(sk, LIMIT, TOTAL);
  console.log(`滑动窗口：200 次请求通过 ${s.passed} 次，拒绝 ${s.rejected} 次`);
  console.log('说明：按真实时间裁剪，平滑无临界突发，但实现稍复杂。');

  console.log('\n===== 令牌桶限流 =====');
  const tk = PREFIX + 'token';
  const t = await tokenBucket(tk, LIMIT, LIMIT, TOTAL);
  console.log(`令牌桶：200 次请求通过 ${t.passed} 次，拒绝 ${t.rejected} 次`);
  console.log('说明：桶内预存令牌允许短时突发，限制的是平均速率。');

  console.log('\n===== 三者取舍 =====');
  console.log('固定窗口：实现最简单，但有临界突发问题，适合对精度要求不高的场景。');
  console.log('滑动窗口：无临界突发、最平滑，适合需要精确限流的 API 网关。');
  console.log('令牌桶：允许突发流量、限制平均速率，适合保护下游、容忍短时尖峰的场景。');
}

main()
  .then(async () => {
    const keys = await redis.keys(PREFIX + '*');
    if (keys.length) await redis.del(keys);
    console.log('\n已清理限流 key。');
    await redis.quit();
  })
  .catch(async (e) => {
    console.error('执行出错：', e);
    await redis.quit();
    process.exit(1);
  });
