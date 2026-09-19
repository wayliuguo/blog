import { heavy } from './heavy.js'
import { shared } from './shared.js'
import text from './note.txt'

// 动态 import：会产生一个独立 chunk，这是 SplitChunks 与懒加载的连接点
function loadLazy() {
    return import('./lazy.js').then((m) => m.lazyWork())
}

if (__DEV__) {
    console.log('开发环境的调试输出，生产构建里应被删掉')
}

console.log('shared:', shared(), '| heavy:', heavy(), '| text:', text)
loadLazy().then((r) => console.log('lazy:', r))
