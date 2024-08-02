# 脚手架开发流程

## 开发流程

- 创建`npm`项目

- 创建脚手架入口文件，最上方添加：

  ```
  #!/usr/bin/env node
  ```

- 配置`package.json`，添加`bin`属性

  - 通过`bin`属性及对应的入口文件地址

- 编写脚手架代码

- 将脚手架发布到`npm`

## 难点解析

- 分包：将复杂的系统拆分成若干个模块
- 命令注册,如：

```
vue create
vue add
vue invoke
```

- 参数解析：

```
vue command [options] <params>
```

- options全称：`--version`、`--help`

- options简写：`-v`、`-h`

- 带 params 的options：`--path /Users/well/xxx`

- 帮助文档

  - global help
    - Usage
    - Options
    - Commands

- 示例：`vue`的帮助信息

  - 脚手架帮助信息

  ```
  Usage: vue <command> [options]
  
  Options:
    -V, --version                              output the version number
    -h, --help                                 display help for command
  
  Commands:
    create [options] <app-name>                create a new project powered by vue-cli-service
    add [options] <plugin> [pluginOptions]     install a plugin and invoke its generator in an already created project
    invoke [options] <plugin> [pluginOptions]  invoke the generator of a plugin in an already created project
    inspect [options] [paths...]               inspect the webpack config in a project with vue-cli-service
    serve                                      alias of "npm run serve" in the current project
    build                                      alias of "npm run build" in the current project
    ui [options]                               start and open the vue-cli ui
    init [options] <template> <app-name>       generate a project from a remote template (legacy API, requires @vue/cli-init)  
    config [options] [value]                   inspect and modify the config
    outdated [options]                         (experimental) check for outdated vue cli service / plugins
    upgrade [options] [plugin-name]            (experimental) upgrade vue cli service / plugins
    migrate [options] [plugin-name]            (experimental) run migrator for an already-installed cli plugin
    info                                       print debugging information about your environment
    help [command]                             display help for command
  
    Run vue <command> --help for detailed usage of given command.
  ```

  - 脚手架帮助信息：`vue <command> --help`，如 `vue create --help`

  ```
  Usage: vue create [options] <app-name>
  
  create a new project powered by vue-cli-service
  
  Options:
    -p, --preset <presetName>       Skip prompts and use saved or remote preset
    -d, --default                   Skip prompts and use default preset
    -i, --inlinePreset <json>       Skip prompts and use inline JSON string as preset
    -m, --packageManager <command>  Use specified npm client when installing dependencies
    -r, --registry <url>            Use specified npm registry when installing dependencies (only for npm)
    -g, --git [message]             Force git initialization with initial commit message
    -n, --no-git                    Skip git initialization
    -f, --force                     Overwrite target directory if it exists
    --merge                         Merge target directory if it exists
    -c, --clone                     Use git clone when fetching remote preset
    -x, --proxy <proxyUrl>          Use specified proxy when creating project
    -b, --bare                      Scaffold project without beginner instructions
    --skipGetStarted                Skip displaying "Get started" instructions
    -h, --help                      display help for command
  ```

- 其他

  - 命令行交互
  - 日志打印
  - 命令行文字变色
  - 网络通信：HTTP/WebSocket
  - 文件处理

# 第一个脚手架

## 快速发布第一个脚手架

1. 文件路径

   ```
   weicli
   	- bin
   		- index.js
   package.json
   ```

2. `package.json`

```
"name": "@well_haha/weicli",
"bin": {
    "weicli": "bin/index.js"
}
```

3. `bin/index.js`

```
#!/usr/bin/env node

console.log('一个最简单的脚手架！')
```

4. `npm login`，`npm publish`

登录的过程中遇到高版本`node`无法登录的情况，在切换`node`版本后登录上再切换回来

5. 使用

```
npm i @well_haha/weicli -g

weicli
```

## 如何调试本地脚手架

1. 在文件目录执行 npm link

```
// weicli 目录
npm link
```

此时，我们的npm 全局模块上就会增加生成软链

![image-20231215235603959](cliBasic.assets/image-20231215235603959.png)

2. 解除本地链接

```
npm unlink weicli
```

试了不行，就直接到全局模块上删掉软链入口就好了

## 调试库文件

1. 在库的目录下，执行`npm link`, 使其作为一个软链接
1. 在使用到这个库的地方，npm link 库名称
1. 例子如下：

3.1 文件目录：

```
// 文件目录
weiclilib
  - lib
    - index.js
package.json
```

3.2 package.json

此包名为 weiclilib

```
// package.json
{
 "name": "weiclilib"
}
```

3.3 本地引用

```
// 在此文件根目录(package.json目录)，则生成软链接了
npm link

```

![image-20240802234603908](image-20240802234603908.png)

3.4 在使用到该库的时候，引用本地的库
tips: 需先删除之前通过线上安装的

```
npm link weiclilib
```



## 脚手架命令注册和参数解释

### 参数解释

```
// weicli/bin/index.js
#!/usr/bin/env node

console.log(require('process').argv)
```

执行 `weicli  init    `

```
[
  'C:\\Program Files\\nodejs\\node.exe',
  'C:\\Program Files\\nodejs\\node_modules\\@well_haha\\weicli\\bin\\index.js',
  'init'
]
```

可以通过 argv[2]来获取参数

### 简单demo

```
// weiclilib/lib/index.js

module.exports = {
    init({ option, param }) {
        console.log('执行init流程', option, param)
    }
}

```

```
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
```

1. 解析命令并调用库文件的方法

```
weicli init --name well 
// 执行init流程 name well
```

2. 测试全局函数

```
weicli -version
// 1.0.0
```



# 脚手架yargs框架

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

# 脚手架command
