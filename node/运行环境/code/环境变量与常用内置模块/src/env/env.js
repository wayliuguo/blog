// 环境变量：process.env 读取 + node --env-file 加载 .env（Node 20.6+ 内置，无需 dotenv）
// 运行方式见 package.json：npm run env（等价于 node --env-file=src/env/.env src/env/env.js）

// 1) process.env 是启动时注入的环境变量对象，值一律是字符串
console.log('NODE_ENV =', process.env.NODE_ENV)
console.log('DB_HOST =', process.env.DB_HOST)

// 2) 未设置的变量是 undefined，读取时给默认值是常见写法
const port = Number(process.env.PORT) || 3000
console.log('PORT =', process.env.PORT, '，缺省回退后 =', port)
