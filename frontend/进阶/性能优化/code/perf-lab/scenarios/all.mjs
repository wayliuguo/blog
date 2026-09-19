/**
 * 场景：一次跑完所有实验（浏览器会逐个启动，耗时较长）
 * 运行：npm run all
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

export default async function run() {
    const failed = []
    for (const name of names) {
        console.log(`\n\n############ 场景：${name} ############`)
        try {
            const mod = await import(new URL(`./${name}.mjs`, import.meta.url))
            await mod.default()
        } catch (err) {
            failed.push({ name, err })
            console.log(`[${name}] 失败：${err.message}`)
        }
    }

    console.log(`\n\n${'='.repeat(64)}`)
    console.log(`共 ${names.length} 个场景，成功 ${names.length - failed.length}，失败 ${failed.length}`)
    for (const f of failed) console.log(`  ✗ ${f.name}: ${f.err.message}`)

    if (failed.length) {
        process.exitCode = 1
    }
}
