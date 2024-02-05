#!/usr/bin/env node

const lib = require('weiclilib')
const argv = require('process').argv

// 脚手架第一个参数
const command = argv[2]

// 脚手架第一个参数后的参数
const options = argv.slice(3)

if (options.length) {
    let [option, param] = options
    option = option.replace('--', '')

    if (command) {
        if (lib[command]) {
            lib[command]({ option, param })
        } else {
            console.log('请输入正确命令')
        }
    } else {
        console.log('请输入命令')
    }
}

// 实现全局参数解释 --version -V
if (command.startsWith('--') || command.startsWith('-')) {
    const globalOption = command.replace(/--|-/g, '')
    if (globalOption === 'V' || globalOption === 'version') {
        console.log('1.0.0')
    }
}
