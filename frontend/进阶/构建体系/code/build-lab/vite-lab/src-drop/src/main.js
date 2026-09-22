import { hi } from './helper.js'
import './mock.js'
import './main.spec.js'
import React from 'react'

// TODO: 上线前补全
console.log('调试日志，构建期应被清掉')
document.body.dataset.env = 'dev'

export const msg = 'main:' + hi
console.log(msg)
