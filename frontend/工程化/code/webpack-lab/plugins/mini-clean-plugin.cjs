// 手写清目录插件：官方等价物是 output.clean: true / clean-webpack-plugin
// 挂在 compiler.hooks.emit：此时产物清单（compilation.assets）已定稿、但还没写盘。
// 拿本次清单做白名单，把输出目录里不在清单上的「上次构建遗留的旧 hash 文件」删掉。
// 本工程的 clean: false——清理这件事完全交给它，用来验证机制。
'use strict'
const fs = require('node:fs')
const path = require('node:path')

class MiniCleanPlugin {
    constructor(options = {}) {
        this.dryRun = options.dryRun === true // 只报不删
        this.name = options.name || 'MiniCleanPlugin'
    }

    apply(compiler) {
        compiler.hooks.emit.tapAsync(this.name, (compilation, callback) => {
            const outDir = compiler.outputPath
            if (!fs.existsSync(outDir)) return callback()

            // 白名单：本次构建要写的所有文件（相对路径统一成 /，Windows 下也一致）
            const keep = new Set(Object.keys(compilation.assets))
            const stale = []

            const walk = dir => {
                for (const name of fs.readdirSync(dir)) {
                    const abs = path.join(dir, name)
                    if (fs.statSync(abs).isDirectory()) {
                        walk(abs)
                        continue
                    }
                    const rel = path.relative(outDir, abs).split(path.sep).join('/')
                    if (!keep.has(rel)) stale.push(abs)
                }
            }
            walk(outDir)

            for (const file of stale) {
                if (!this.dryRun) fs.unlinkSync(file)
                console.log(`  [${this.name}] 删除旧产物 ${path.relative(outDir, file)}`)
            }

            // 删完文件后，空目录一并收缩（depth-first：子目录空了才轮到父目录）
            const prune = dir => {
                let empty = true
                for (const name of fs.readdirSync(dir)) {
                    const abs = path.join(dir, name)
                    if (fs.statSync(abs).isDirectory() ? prune(abs) : false) fs.rmdirSync(abs)
                    else empty = false
                }
                return empty
            }
            prune(outDir)

            console.log(`  [${this.name}] 白名单 ${keep.size} 个文件，清理 ${stale.length} 个旧产物`)
            callback()
        })
    }
}

module.exports = MiniCleanPlugin
