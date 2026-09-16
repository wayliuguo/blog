'use strict';

// 加载 .env 中的配置（若没有 .env 则用默认值）
require('dotenv').config();

const Redis = require('ioredis');

const options = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  db: Number(process.env.REDIS_DB) || 0,
  // 连接断开时按指数退避重连，最多每 2 秒一次
  retryStrategy: (times) => Math.min(times * 200, 2000),
};

// 密码为空时不传 password，否则 ioredis 会向无密码的 Redis 发起 AUTH 而报错
if (process.env.REDIS_PASSWORD) {
  options.password = process.env.REDIS_PASSWORD;
}

const redis = new Redis(options);

// 连接成功日志
redis.on('connect', () => {
  console.log('[client] 已连接到 Redis');
});

// 连接错误日志（例如 Redis 未启动、网络不通、密码错误）
redis.on('error', (err) => {
  console.error('[client] Redis 连接出错：', err.message);
});

module.exports = redis;
