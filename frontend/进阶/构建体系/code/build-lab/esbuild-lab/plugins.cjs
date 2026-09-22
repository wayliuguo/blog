// esbuild 插件机制：onResolve / onLoad / onEnd —— 三个钩子管"解析、内容、收尾"
// 运行：npm run esbuild:plugins
const path = require('node:path')
const esbuild = require('esbuild')

const ROOT = __dirname
const ENTRY = path.join(ROOT, 'src-plugins/index.js')

// ---- 插件 A：虚拟模块 —— 构建期注入"构建信息" ----
// 真实场景：把"这包是哪次构建、什么分支"烙进产物，线上排障能立刻对到源码版本。
// 磁盘上根本不存在 build-info 文件，靠 onResolve + onLoad 凭空提供内容。
const versionInfo = {
    name: 'version-info',
    setup(build) {
        // onResolve：import 'build-info' 在磁盘上找不到，划到我们的 namespace
        build.onResolve({ filter: /^build-info$/ }, () => ({
            namespace: 'virtual',
            path: 'build-info'
        }))
        // onLoad：对 namespace 为 virtual 的模块，返回我们现造的内容
        build.onLoad({ filter: /.*/, namespace: 'virtual' }, () => ({
            loader: 'js',
            contents: `export const commit = 'a1b2c3d'
export const branch = 'main'`
        }))
    }
}

// ---- 插件 B：onEnd 收尾 —— 产物体积门禁（预算从外部注入）----
// 真实场景：体积回退不会让测试变红，最容易悄悄混进代码库。构建结束称一次重，超预算就 fail。
function sizeGate(limitBytes) {
    return {
        name: 'size-gate',
        setup(build) {
            build.onStart(() => {
                console.log(`  预算 ${limitBytes} 字节`)
            })
            // onEnd 在所有产物生成之后调用：这里读到的 outputFiles 就是最终落盘内容
            build.onEnd(result => {
                const files = result.outputFiles.map(f => ({
                    name: path.basename(f.path),
                    raw: f.contents.length
                }))
                const total = files.reduce((s, f) => s + f.raw, 0)
                for (const f of files) console.log(`    ${f.name.padEnd(18)} ${String(f.raw).padStart(6)} 字节`)
                if (total > limitBytes) {
                    throw new Error(`[size-gate] 产物超预算：${total}B > ${limitBytes}B`)
                }
                console.log(`  onEnd 合计 ${total} 字节 —— 在预算内，通过`)
            })
        }
    }
}

async function run(label, plugins) {
    console.log(`\n---- ${label} ----`)
    try {
        const { outputFiles } = await esbuild.build({
            entryPoints: [ENTRY],
            bundle: true,
            write: false,
            format: 'esm',
            plugins
        })
        console.log('  含 commit 常量（来自不存在的虚拟模块）：', outputFiles[0].text.includes('a1b2c3d'))
        console.log('  产物字符数：', outputFiles[0].text.length)
    } catch (e) {
        console.log(`  构建被中断： ${e.message}`)
    }
}

async function main() {
    // 三组都带上 versionInfo，保证 build-info 能被解析；只有 sizeGate 的有无/预算不同
    await run('① 虚拟模块注入构建信息', [versionInfo])
    await run('② 体积门禁 · 预算宽松（不超）', [versionInfo, sizeGate(2000)])
    await run('③ 体积门禁 · 预算压紧（必超）', [versionInfo, sizeGate(30)])
}
main()