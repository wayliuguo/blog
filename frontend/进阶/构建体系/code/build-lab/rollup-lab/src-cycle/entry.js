// 循环依赖样本：entry → a → b → a
import { fa } from './a.js'

console.log(fa())
