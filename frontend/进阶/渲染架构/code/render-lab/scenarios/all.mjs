/**
 * 依次跑完全部场景。任一场景抛错就记下并继续，最后以非 0 退出码结束，方便当 CI 用。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const names = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.mjs') && f !== 'all.mjs')
    .map((f) => f.replace(/\.mjs$/, ''))
    .sort()

const failed = []
for (const name of names) {
    const mod = await import(new URL(`./${name}.mjs`, import.meta.url))
    try {
        await mod.default()
    } catch (error) {
        failed.push(name)
        console.error(`\n[${name}] 失败：${error.message}`)
    }
}
console.log(`\n===== 共 ${names.length} 个场景，失败 ${failed.length} 个${failed.length ? '：' + failed.join(' ') : ''} =====`)
process.exit(failed.length ? 1 : 0)
