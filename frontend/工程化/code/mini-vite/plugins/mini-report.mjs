// 统计产物体积。
//
// 演示「改产物要挂在 generateBundle」：到这里才同时有文件名和内容。
//   transform     只有单个模块的源码，没有 bundle；
//   renderChunk   有代码，但没有最终文件名；
//   generateBundle 文件名 + 内容都在，是改产物结构唯一安全的窗口。
export function miniReport() {
    return {
        name: 'mini-report',
        apply: 'build',
        generateBundle(options, bundle) {
            console.log(`  [mini-report] generateBundle：输出目录 ${options.dir}`)
            for (const [fileName, output] of Object.entries(bundle)) {
                console.log(`    - ${fileName}  ${Buffer.byteLength(output.code)} B`)
            }
        }
    }
}
