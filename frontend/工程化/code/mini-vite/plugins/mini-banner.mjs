// 给产物加一行 banner。
//
// 演示「生效端」：renderChunk 是 build 专属钩子（Rollup 侧产物钩子），
// `apply: 'build'` 让它只在 build 的插件表里生效。
export function miniBanner(text = '/* built by mini-vite */') {
    return {
        name: 'mini-banner',
        apply: 'build',
        enforce: 'post', // 排在其它 renderChunk 之后，拿到的才是最终代码
        renderChunk(code) {
            console.log('  [mini-banner] renderChunk：给产物加 banner')
            return `${text}\n${code}`
        }
    }
}
