// 入口：四种 import 形式各用一遍
import { greet, SEPARATOR } from './greet.js'
import config from './config.js'
import * as upperUtils from './utils/upper.js'
import './side-effect.js'

console.log(greet(config.name))
console.log(upperUtils.upper('namespace import'))
console.log(SEPARATOR)
console.log('版本：' + config.version)
