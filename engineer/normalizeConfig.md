# eslint

eslint 是一个代码检测工具，用于检测代码中潜在的问题和错误，作用提高代码质量和规范

## 安装

```
npm install eslint
```

## 构建配置文件

```
npm init @eslint/config

// 解决与eslint冲突
npm i  eslint-config-prettier eslint-plugin-prettier -D
```

## .eslintrc.js

```
module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    extends: ['eslint:recommended', 'prettier'],
    overrides: [
        {
            env: {
                node: true
            },
            files: ['.eslintrc.{js,cjs}'],
            parserOptions: {
                sourceType: 'script'
            }
        }
    ],
    plugins: ['prettier'],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        indent: ['error', 4] // 用于指定代码缩进的方式，这里配置为使用四个空格进行缩进
    }
}
```

关于 rules 可以按照[文档](https://github.com/eslint/eslint)进行配置

在配置中extends 与 plugins 增加了 `prettier`用于解决冲突

# prettier

用于代码的格式化

## 安装

```
npm install prettier --save-dev
```

## 配置

- .prettierrc.js

  ```
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
  ```

- .prettierignore

  ```
  node_modules
  dist
  package.json
  ```

# husky

husky 是一个 Git 钩子（Git hooks）工具，它可以让你在 Git 事件发生时执行脚本，进行代码格式化、测试等操作。

常见的钩子：

- `pre-commit`：在执行 Git `commit` 命令之前触发，用于在提交代码前进行代码检查、格式化、测试等操作。
- `commit-msg`：在提交消息（commit message）被创建后，但提交操作尚未完成之前触发，用于校验提交消息的格式和内容。
- `pre-push`：在执行 Git `push` 命令之前触发，用于在推送代码前进行额外检查、测试等操作。

## 安装

```
npm install husky --save-dev
```

## 启用 git 钩子配置

```
npm pkg set scripts.prepare="husky install"
```

安装成功后 package.json 中 script 生成命令，且自动生成hasky目录

```
 "prepare": "husky install"
```

## 创建 git 挂钩

用于在 git 提交之前做 eslint 语法校验。

### 创建钩子文件

```
npx husky add .husky/pre-commit "npm run lint"

npx husky add .husky/commit-msg
```

执行成功，.husky 目录多出一个 pre-commit 和 commit-msg 文件。

### 对暂存区检测

下方代码添加到 pre-commit 文件中。`lint-staged`模块， 用于对 git 暂存区检测

```
npx --no-install lint-staged
```

`npx --no-install lint-staged` 是一个命令，用于在不安装 lint-staged 的情况下运行该工具。`npx --no-install` 命令用于从远程下载并执行指定的命令。

# lint-staged

作用：lint-staged 可以让你在 Git 暂存（staged）区域中的文件上运行脚本，通常用于在提交前对代码进行格式化、静态检查等操作。

使用方式：你可以在项目中使用 lint-staged 配合 husky 钩子来执行针对暂存文件的脚本。具体的使用步骤如下：

```
npm install lint-staged --save-dev
```

在 `package.json` 文件中添加以下配置：

```
"lint-staged": {
	"src/**/*.{js,jsx,ts,tsx}": [
		"prettier --write",
		"eslint --fix"
	]
}
```

- `"src/**/*.{js,jsx,ts,tsx}"` 是指定要针对的暂存文件模式，你可以根据自己的项目需求来配置。
- `["prettier --write","eslint --fix"]`为校验命令，可执行 eslint 、prettier 等规则
- 配置后，在commit 前就会进行 prettier 和 eslint 的命令执行

# Commitizen

是一个命令行工具，用于以一致的方式编写规范的提交消息。在使用Commitizen之前，你需要安装Commitizen及其适配器。

## cz-conventional-changelog

是Commitizen的一个适配器，它实现了符合约定式提交（Conventional Commits）规范的提交消息。该规范定义了提交消息的格式和结构，并推荐了一些常用的提交类型和范围。

## 安装和使用步骤

1. 安装

```
npm install --save-dev commitizen cz-conventional-changelog
```

2. package.json 添加 config

```
"config": {
  "commitizen": {
    "path": "cz-conventional-changelog"
  }
}
```

3. packge.json 添加 scripts 下 commit

```
"commit": "git-cz"
```

4. 使用

   ```
   git add .
   ```

   ```
   npm run commit
   ```

   选择提交类型

   ```
   ? Select the type of change that you're committing: (Use arrow keys)
   > feat:     A new feature //新功能
     fix:      A bug fix //错误修复
     docs:     Documentation only changes //仅文档更改
     style:    [样式]Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
     refactor: [重构] A code change that neither fixes a bug nor adds a feature
     perf:     A code change that improves performance
     test:     Adding missing tests or correcting existing tests
   ```

   根据提示填写提交内容

   ```
   ? What is the scope of this change // 此更改的范围是什么
   ? Write a short, imperative tense description of the change//【必填】 简短的描述这个变化
   ? Provide a longer description of the change//提供变更的详细说明：
   ? Are there any breaking changes? //有什么突破性的变化吗？【y/n】
   ? Does this change affect any open issues? (y/N) //此更改是否会影响任何悬而未决的问题（是/否）
   
   // 完成提交，输出打印日志：
   [master 2cf55e0] docs: 修改commitzen文档
    1 file changed, 2 insertions(+), 2 deletions(-)
   ```

   
