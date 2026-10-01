import { BUILD_INFO } from 'virtual-build-info'

export function info() {
    return BUILD_INFO
}

// 加一处真实使用，否则打包器的 tree-shaking 会把未被引用的导出连同内容一起删掉
console.log('build info:', info())
