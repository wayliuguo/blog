'use strict';

// 分布式锁：三要素（SET NX PX）+ 安全释放（Lua 校验 token）+ 续期思路
require('dotenv').config();
const redis = require('./client');

const PREFIX = 'demo:lock:';

// 安全释放脚本：只有当前锁的 token 与传入一致才删除，防止误删别人的锁
const releaseScript = `
  if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
  else
    return 0
  end
`;

async function main() {
  const lockKey = PREFIX + 'order:1001';

  // ===== 三要素：SET key value NX PX =====
  console.log('\n===== 分布式锁获取：SET key value NX PX 30000 =====');
  const tokenA = 'token-A-' + Math.random().toString(36).slice(2);
  const tokenB = 'token-B-' + Math.random().toString(36).slice(2);

  const gotA = await redis.set(lockKey, tokenA, 'NX', 'PX', 30000);
  console.log('客户端A 获取锁：', gotA, '（返回 OK，成功）');
  const gotB = await redis.set(lockKey, tokenB, 'NX', 'PX', 30000);
  console.log('客户端B 获取锁：', gotB, '（返回 null，未获取到锁，稍后重试）');

  // ===== 安全释放：Lua 比对 token 再 DEL =====
  console.log('\n===== 安全释放：Lua 比对 token 再 DEL =====');
  const released = await redis.eval(releaseScript, 1, lockKey, tokenA);
  console.log('客户端A 用正确 token 释放，结果 =', released, '（1 表示删除成功）');

  // ===== 反例：直接 DEL 会误删别人的锁 =====
  console.log('\n===== 反例：直接 DEL 会误删别人锁 =====');
  const gotB2 = await redis.set(lockKey, tokenB, 'NX', 'PX', 30000);
  console.log('客户端B 重新抢到锁：', gotB2, '（成功）');
  // 危险写法（注释掉，仅作说明）：
  //   await redis.del(lockKey);  // 若 A 误执行此句，会删掉 B 刚刚持有的锁
  // 正确写法：用 Lua 校验 token 后再删
  const wrongRelease = await redis.eval(releaseScript, 1, lockKey, tokenA);
  console.log('客户端A 用旧 token 释放：结果 =', wrongRelease, '（0 表示未删除，保护了 B 的锁）');

  // ===== 锁续期（watchdog）与过期时间判断 =====
  console.log('\n===== 锁续期（watchdog）思路 =====');
  console.log('若业务执行时间可能超过 30s，应在后台定时（如每 10s）用 PEXPIRE 续期；');
  console.log('判断原则：锁过期时间必须 > 业务最大执行时间，否则会出现「业务未完成锁已过期」导致并发问题。');
  console.log('（本示例仅演示续期命令，不实际启动 watchdog 定时任务）');
  const refreshed = await redis.pexpire(lockKey, 30000);
  console.log('给当前锁续期到 30s：', refreshed, '（1 表示成功）');

  await redis.del(lockKey);
}

main()
  .then(async () => {
    await redis.quit();
  })
  .catch(async (e) => {
    console.error('执行出错：', e);
    await redis.quit();
    process.exit(1);
  });
