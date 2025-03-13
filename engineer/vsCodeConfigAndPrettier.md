## .vsCode/setting.json
- 作用
用于覆盖 VS Code 的默认全局配置，或者添加新的设置来制定特定项目的配置。
- 参考简单配置
通过 `"editor.formatOnSave": true` 开启保存时自动格式化  
通过 `"[javascript]": {  "editor.defaultFormatter": "esbenp.prettier-vscode" } ,对于 JavaScript，使用 Prettier 作为默认格式化器  
`
```
{  
    "editor.fontSize": 14,  
    "editor.formatOnSave": true, // 开启保存时自动格式化  
  
    // 对于 JavaScript，使用 Prettier 作为默认格式化器  
    "[javascript]": {  
        "editor.defaultFormatter": "esbenp.prettier-vscode",  
    },  
  
    // 对于 JSON，您可以选择使用 VS Code 自带的格式化器，或者如果您希望使用 Prettier，也可以更改这里的设置  
    "[json]": {  
        "editor.defaultFormatter": "esbenp.prettier-vscode" // 如果希望 JSON 也使用 Prettier 格式化  
    },  
  
    "security.workspace.trust.untrustedFiles": "open",  
  
    // 这里是保存时触发的代码操作，比如 ESLint 的修复等  
    "editor.codeActionsOnSave": {  
        // 例如，使用 ESLint 修复可修复的问题  
        "source.fixAll.eslint": true  
    },  
  
    // ESLint 相关的设置（如果安装了 ESLint 插件）  
    "eslint.codeActionsOnSave.rules": null, // 如果需要，可以指定某些规则在保存时执行  
    "eslint.execArgv": null, // ESLint 执行的参数，通常不需要设置  
  
    "compile-hero.ignore": "" // 其他插件的配置  
}
```


## Prettier
- 作用
通过其达成格式化代码作用，这里需要注意的是：通过vscode 插件安装和 npm 安装的使用场景不一致。

- 通过 vscode 插件安装
如果编译器配置开启了自动化格式代码&使用prettier作用默认格式化器，则会在编译器进行保存的时候，prettier 插件会自动读取prettierrc.js 中的配置进行代码格式化。

- 通过 npm 安装
通过npm 包的方式，只能通过命令行进行使用。通过此方式使用的主要原因是通过git hooks 强制提交代码前格式化代码，保证代码仓库的代码风格统一。

- 安装
```
npm install prettier --save-dev

```

- 配置
```
// .prettierrc.js
module.exports = {
    semi: false, //强制在语句末尾不使用分号。
    trailingComma: 'none', //不允许在多行结构的最后一个元素或属性后添加逗号。
    singleQuote: true, //使用单引号而不是双引号来定义字符串。
    printWidth: 120, //指定每行代码的最大字符宽度，超过这个宽度的代码将被换行
    tabWidth: 4, //指定一个制表符（Tab）等于多少个空格。
    singleQuote: true, //使用单引号
    arrowParens: 'avoid', //  箭头函数括号
    endOfLine: 'auto', // 结尾换行自动
    jsxBracketSameLine: true
}

// .prettierignore
node_modules
dist
package.json
```

- 拓展
结合 husky + eslint 进行进一步规范化配置
