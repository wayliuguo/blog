'use strict'

var lodashEs = require('lodash-es')

function f1(num) {
    return num++
}

lodashEs.compact([1, 2, 3])
const res2 = f1(1)
console.log(res2)
