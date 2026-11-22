// 08-pool-stats.js：连接池参数、计数与容量估算
// 只建池、不发查询，所以本机没装 MySQL 也能跑——它演示的是"池本身"的配置与观测
// 运行： npm run pool
const mysql = require('mysql2/promise')

// ---------- 1. 生产级连接池配置 ----------
// 敏感信息交给 .env；这里刻意把常用参数都列出来，方便逐项对照
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mysql_demo',

    // 核心参数
    connectionLimit: 10, // 最大连接数（默认 10）
    queueLimit: 0, // 等待队列上限（0 表示不限制）
    waitForConnections: true, // 无可用连接时是否排队等待

    // 超时配置
    acquireTimeout: 10000, // 老 mysql 库的参数，mysql2 已不认（会被忽略并打警告）
    connectTimeout: 10000, // 连接数据库的超时时间（ms）
    idleTimeout: 60000, // 空闲连接多久后被回收（ms，默认 60 秒）

    // 健康检查
    enableKeepAlive: true, // 开启心跳保活
    keepAliveInitialDelay: 0, // 心跳延迟

    // 高级配置
    charset: 'utf8mb4', // 字符集（支持 emoji）
    timezone: '+08:00' // 时区
})

// ---------- 2. 配置核对 ----------
// 传进去的选项不一定都被接受，建完池回读一遍"真正生效的值"最踏实
function dumpConfig(pool) {
    const cc = pool.pool.config.connectionConfig
    console.log('=== 1. 实际生效的连接配置 ===')
    console.log('  host / port / user / database =', cc.host, cc.port, cc.user, cc.database)
    console.log('  charsetNumber =', cc.charsetNumber, '（45 就是 utf8mb4）')
    console.log('  timezone =', cc.timezone)
    console.log('  connectTimeout =', cc.connectTimeout, 'ms')
    console.log('  enableKeepAlive =', cc.enableKeepAlive, '，keepAliveInitialDelay =', cc.keepAliveInitialDelay)

    console.log('')
    console.log('=== 2. 传了却不生效的选项 ===')
    console.log('  acquireTimeout 生效值 =', cc.acquireTimeout, '（undefined = 被忽略，警告见 stderr）')
    console.log(
        '  另外几个池级参数：connectionLimit =',
        pool.pool.config.connectionLimit,
        '，queueLimit =',
        pool.pool.config.queueLimit,
        '，waitForConnections =',
        pool.pool.config.waitForConnections,
        '，idleTimeout =',
        pool.pool.config.idleTimeout,
        'ms'
    )
}

// ---------- 3. 连接数估算 ----------
function sizingGuide() {
    console.log('')
    console.log('=== 3. 连接数估算 ===')
    console.log('  公式：最大连接数 = (CPU 核心数 × 2) + 有效磁盘数')
    console.log('  或按业务估算：QPS × 平均查询时间')
    console.log('  4 核 8G    建议 20~50 个连接')
    console.log('  8 核 16G   建议 50~100 个连接')
    console.log('  16 核 32G  建议 100~200 个连接')
    console.log('  注意：连接过多 → MySQL 上下文切换开销大 → 性能反而下降')
}

// ---------- 4. 连接池监控 ----------
// mysql2 的 pool 上没有 totalConnectionCount 这类便捷属性（取值恒为 undefined），
// 真实计数在底层 pool 的三个内部集合上
function getPoolStatus(pool) {
    const p = pool.pool
    return {
        totalConnections: p._allConnections.length, // 已创建的全部连接
        freeConnections: p._freeConnections.length, // 空闲（可复用）的连接
        activeConnections: p._allConnections.length - p._freeConnections.length, // 活跃连接
        pendingRequests: p._connectionQueue.length // 排队等连接的请求数
    }
}

// 阈值告警：活跃连接占比超 80%、等待队列积压超 100，都该先去查慢查询
function checkHealth(pool) {
    const status = getPoolStatus(pool)
    const alerts = []
    if (status.totalConnections > 0 && status.activeConnections / status.totalConnections > 0.8) {
        alerts.push('连接池告警：活跃连接数超过 80%')
    }
    if (status.pendingRequests > 100) {
        alerts.push('连接池告警：等待队列积压（大概率是慢查询占着连接不释放）')
    }
    return { status, alerts }
}

function monitor(pool) {
    console.log('')
    console.log('=== 4. 连接池监控 ===')
    const status = getPoolStatus(pool)
    console.log('  当前计数 =', JSON.stringify(status))
    console.log('  说明：此刻还没发过查询，池是懒加载的，一条连接都没建')
    console.log('  pool.totalConnectionCount 这些属性并不存在，监控要从 pool.pool 的')
    console.log('  _allConnections / _freeConnections / _connectionQueue 上取')
    const { alerts } = checkHealth(pool)
    console.log('  健康检查告警 =', alerts.length ? alerts.join('；') : '无')
}

;(async () => {
    dumpConfig(pool)
    sizingGuide()
    monitor(pool)

    // 全程没发过查询，池里不会有真实连接，这里只是把池关掉
    await pool.end()
    process.exit(0)
})().catch(e => {
    console.error('运行出错：', e)
    process.exit(1)
})
