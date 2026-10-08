// 手写"剔除"插件：构建期清掉不该上线的文件与调试代码
//   (a) 测试 / mock 文件 → 返回空模块，交给 tree-shaking 把整个模块摇掉
//   (b) 注释行与 console.log 调试行 → 直接改写源码
//
// enforce: 'pre' 抢在 Vite 内置转换之前处理源码
// apply: 'build' 只在构建期加载 —— 少了这一行，dev 下 console.log 也会被删掉，调试直接失灵
const SRC_RE = /[/\\]src[/\\]/

export default function miniDrop(options = {}) {
    const dropRe = options.drop || /\.spec\.js$|mock\.js$/
    const removed = []

    return {
        name: 'mini-drop',
        enforce: 'pre',
        apply: 'build',

        transform(code, id) {
            const clean = id.split('?')[0]
            if (!SRC_RE.test(clean)) return null

            // (a) 测试 / mock 文件：清空即可，import 它的那条边会指向一个空模块
            if (dropRe.test(clean)) {
                removed.push(clean.split(/[/\\]/).pop())
                return { code: 'export {}' }
            }

            // (b) 剔除注释行与调试行（生产里往往精确到项目自己的 logger）
            const cleaned = code
                .split('\n')
                .map(l => (l.trim().startsWith('//') || /^\s*console\.log\(/.test(l) ? '' : l))
                .join('\n')
            return cleaned === code ? null : { code: cleaned }
        },

        buildEnd() {
            if (removed.length) console.log(`  [mini-drop] 已清空 ${removed.join(', ')}`)
        }
    }
}