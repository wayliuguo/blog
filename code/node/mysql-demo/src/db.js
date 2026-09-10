// db.js：统一的数据访问入口
// 用 mysql2/promise 建立连接池（连接复用，避免每次请求都建连）
// 配置从 .env 读取，因此必须先加载 dotenv 再连接
require('dotenv').config();
const mysql = require('mysql2/promise');

// 从环境变量取配置，给默认值方便本地起服务
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mysql_demo',
  charset: 'utf8mb4',          // 与库表一致，防止中文/emoji 乱码
  waitForConnections: true,    // 连接不够时排队，而不是直接报错
  connectionLimit: 10,
  queueLimit: 0,
});

// 便捷函数：只返回行，省得每个调用处都写 const [rows] = await pool.query(...)
async function query(sql, params) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

module.exports = { pool, query };
