/**
 * 环境变量的兜底加载：本地读 .env 文件，容器/CI 用注入
 *
 * 容器（Docker Compose / K8s）与 CI 会直接把环境变量注入进程，
 * 这时再去读 .env 文件，仓库里的旧值就会盖掉真实注入值 —— 所以先判断"是否已注入"。
 * 判断依据取一个必填项（DB_HOST）：它存在就说明环境变量是外部给的，直接返回。
 *
 * 运行：npm run 01loadenv
 */
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const dotenv = require('dotenv')

/**
 * @param {string} defaultEnv 没有 NODE_ENV 时兜底的环境名（如 'development'）
 */
function loadEnv(defaultEnv) {
    // 已通过容器/CI 注入环境变量（以 DB_HOST 判断），无需加载 .env 文件
    if (process.env.DB_HOST) return

    const envFile = `.env.${process.env.NODE_ENV || defaultEnv}`
    if (fs.existsSync(envFile)) {
        dotenv.config({ path: envFile })
    }
}

module.exports = { loadEnv }

// ===== 下面是可直接运行的验证：两种场景各跑一遍 =====
if (require.main === module) {
    const TMP = path.join(os.tmpdir(), 'deploy-lab-loadenv')
    fs.rmSync(TMP, { recursive: true, force: true })
    fs.mkdirSync(TMP, { recursive: true })
    fs.writeFileSync(path.join(TMP, '.env.development'), 'DB_HOST=file-db.internal\nAPP_PORT=3001\n')

    // 场景 A：本地开发 —— 环境变量没注入，应当去读 .env.development
    process.chdir(TMP)
    delete process.env.DB_HOST
    delete process.env.NODE_ENV
    loadEnv('development')
    console.log('=== 场景 A：本地开发（未注入环境变量）===')
    console.log('  读到的 DB_HOST =', process.env.DB_HOST, '（来自 .env.development）')
    console.log('  读到的 APP_PORT =', process.env.APP_PORT)

    // 场景 B：容器/CI —— 环境变量已注入，跳过 dotenv，注入值不被旧文件覆盖
    process.env.DB_HOST = 'prod-rds.internal'
    process.env.APP_PORT = '8080'
    loadEnv('development')
    console.log('\n=== 场景 B：容器/CI（已注入 DB_HOST）===')
    console.log('  DB_HOST =', process.env.DB_HOST, '（注入值保持不变，.env 文件被跳过）')
    console.log('  APP_PORT =', process.env.APP_PORT, '（同理，文件里的 3001 没有生效）')

    fs.rmSync(TMP, { recursive: true, force: true })
}
