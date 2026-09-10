'use strict';

// ZSet 排行榜：整体榜 + 加分 + 查自身排名 + 按日期的当日榜（自动过期）
require('dotenv').config();
const redis = require('./client');

const PREFIX = 'demo:rank:';

async function main() {
  console.log('\n===== ZSet 排行榜（ZADD / ZREVRANGE / ZINCRBY / ZREVRANK）=====');
  const rankKey = PREFIX + 'game';
  await redis.del(rankKey);

  const players = [
    ['射手', 1500],
    ['法师', 1800],
    ['战士', 1200],
    ['刺客', 2000],
    ['辅助', 900],
  ];
  for (const [name, score] of players) {
    await redis.zadd(rankKey, score, name);
  }

  console.log('Top 3（分数从高到低）：');
  const top = await redis.zrevrange(rankKey, 0, 2, 'WITHSCORES');
  for (let i = 0; i < top.length; i += 2) {
    console.log(`  #${i / 2 + 1}  ${top[i]} - ${top[i + 1]} 分`);
  }

  // ZINCRBY 加分，再用 ZREVRANK 查排名（0 表示第 1 名）
  await redis.zincrby(rankKey, 300, '辅助');
  const rank = await redis.zrevrank(rankKey, '辅助');
  const score = await redis.zscore(rankKey, '辅助');
  console.log(`\n辅助 +300 后：当前分数 ${score}，排名第 ${rank + 1}`);

  // 按时间窗口的排行榜：key 带日期，自动过期
  console.log('\n===== 按时间窗口的排行榜（key 带日期，自动过期）=====');
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const dateKey = PREFIX + 'daily:' + today;
  await redis.zadd(dateKey, 500, 'userX', 800, 'userY');
  await redis.expire(dateKey, 86400); // 当天有效，跨天后自然失效
  const dayTop = await redis.zrevrange(dateKey, 0, -1, 'WITHSCORES');
  console.log('当日榜 key =', dateKey, '（已设 24h 过期）');
  console.log('当日榜：', dayTop);
}

main()
  .then(async () => {
    const keys = await redis.keys(PREFIX + '*');
    if (keys.length) await redis.del(keys);
    console.log('\n已清理排行榜 key。');
    await redis.quit();
  })
  .catch(async (e) => {
    console.error('执行出错：', e);
    await redis.quit();
    process.exit(1);
  });
