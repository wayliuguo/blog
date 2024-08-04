## 入门

```
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

```

```
PS E:\working\blog> weicli   
Usage: weicli [command] <options>

Dev Options:
  -d, --debug  Boostrap debug mode                                                        [boolean]

Extra Options
      --registry

Options:
  -r, --registery  Define global registry                                                  [string]  -h, --help       Show help                                                              [boolean]  -v, --version    Show version number                                                    [boolean]

Your own footer description

A command is required. Pass --help to see all avaliable commands and options.
```

## 高级用法

一下代码主要通过 command 注册了两个命令

```
#!/usr/bin/env node

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const { argv } = require('yargs')

const arg = hideBin(process.argv)
const cli = yargs(arg)

yargs(arg)
    // 用法介绍
    .usage('Usage: weicli [command] <options>')
    // 提示
    .demandCommand(1, 'A command is required. Pass --help to see all avaliable commands and options.')
    // 严格模式
    .strict()
    // 未识别时推荐
    .recommendCommands()
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
    // 命令
    .command(
        'init [name]',
        'Do init a project',
        yargs => {
            yargs.options('name', {
                type: 'string',
                describe: 'Name of a project'
            })
        },
        argv => {
            console.log(argv)
        }
    )
    .command({
        command: 'list', // 命令
        aliases: ['ls', 'la', 'll'], // 别名
        describe: 'List Local packages', // 描述
        builder: yargs => {
            // options 参数 （--list xxx）
            yargs.options('list', {
                type: 'string',
                describe: 'List Local packages'
            })
        },
        // 处理函数
        handler: argv => {
            console.log(argv)
        }
    })
    .group(['registry'], 'Extra Options').argv

```

```
PS E:\working\blog\code\node\weicli> weicli init --name abc
{
  _: [ 'init' ],
  name: 'abc',
  '$0': 'C:\\Program Files\\nodejs\\node_modules\\@well_haha\\weicli\\bin\\index.js'
}
PS E:\working\blog\code\node\weicli> weicli list --list  abc
{
  _: [ 'list' ],
  list: 'abc',
  '$0': 'C:\\Program Files\\nodejs\\node_modules\\@well_haha\\weicli\\bin\\index.js'
}
```

