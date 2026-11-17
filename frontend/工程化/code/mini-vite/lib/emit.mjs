// 产物输出：generateBundle → 写盘 → HTML → closeBundle。
//
// 为什么"改产物"要挂在 generateBundle 而不是 transform？
// 因为 transform 阶段还没有 bundle（只有单个模块的源码），renderChunk 阶段只有代码、没有文件名，
// 只有 generateBundle 能同时看到"文件名 + 内容"，这是改产物结构唯一安全的窗口。
//
// 对应 Rollup 的 generateBundle / writeBundle / closeBundle。
import fs from 'node:fs'
import path from 'node:path'

/** 把 index.html 里的入口 script 换成打包后的文件 */
function rewriteEntry(html, fileName) {
    return html.replace(
        /<script([^>]*)\bsrc=["'][^"']+["']([^>]*)><\/script>/,
        `<script$1src="./${fileName}"$2></script>`
    )
}

export async function emitBundle({ container, root, outDir, code, fileName }) {
    const bundle = { [fileName]: { type: 'chunk', fileName, isEntry: true, code } }

    // 1. generateBundle：唯一能同时看到文件名与内容的地方
    await container.generateBundle({ dir: outDir, format: 'es' }, bundle)

    // 2. 写盘
    fs.mkdirSync(path.join(outDir, path.dirname(fileName)), { recursive: true })
    fs.writeFileSync(path.join(outDir, fileName), bundle[fileName].code)

    // 3. HTML 也要产出（并且经过 transformIndexHtml，与 dev 侧同一个钩子）
    const html = rewriteEntry(fs.readFileSync(path.join(root, 'index.html'), 'utf-8'), fileName)
    const outHtml = await container.transformIndexHtml(html, { path: '/index.html', bundle })
    fs.writeFileSync(path.join(outDir, 'index.html'), outHtml)

    // 4. closeBundle：产物已落盘
    await container.closeBundle()

    return { bundle, outHtml }
}
