// min-webpack 演示源码：入口（默认导入）
import greet from './greet.js'

const used = greet('min-webpack')
console.log('entry 用到: ' + used)
