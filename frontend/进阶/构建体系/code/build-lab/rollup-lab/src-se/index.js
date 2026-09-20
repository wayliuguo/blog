// 入口：只用 lib 的导出，顺带引入 pure.js（只图它的副作用）
import { calc } from './lib.js'
import './pure.js'

console.log(calc(1, 2))
