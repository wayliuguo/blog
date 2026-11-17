import { hi } from './helper.js'
import { greet } from 'tiny-lib'
import { mode } from 'virtual:build-info'

console.log(hi('mini-vite'))
console.log(greet())
console.log('mode =', mode)
