#!/usr/bin/env node

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const arg = hideBin(process.argv)
const cli = yargs(arg)

yargs(arg)
    // 用法介绍
    .usage('Usage: weicli [command] <options>')
    // 提示
    .demandCommand(1, 'A command is required. Pass --help to see all avaliable commands and options.')
    // 严格模式
    .strict()
    // 别名
    .alias('h', 'help')
    .alias('v', 'version')
    // 设置文本宽度为terminal宽度
    .wrap(cli.terminalWidth())
    // 结尾文案
    .epilogue('Your own footer description')
    .options({
        debug: {
            type: 'boolean',
            description: 'Boostrap debug mode',
            alias: 'd'
        }
    })
    .options('registery', {
        type: 'string',
        describe: 'Define global registry',
        alias: 'r'
    })
    // 分组
    .group(['debug'], 'Dev Options:')
    .group(['registry'], 'Extra Options').argv
