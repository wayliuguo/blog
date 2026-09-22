// esbuild 插件机制演示的打包入口：引用一个磁盘上不存在的"虚拟模块"
import { commit, branch } from 'build-info'

console.log(`构建信息：${branch}@${commit}`)
