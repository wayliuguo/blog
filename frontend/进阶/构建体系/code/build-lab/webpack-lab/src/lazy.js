import { shared } from './shared.js'

// 动态加载的模块：它会成为独立的 chunk
export function lazyWork() {
    return 'lazy:' + shared()
}
