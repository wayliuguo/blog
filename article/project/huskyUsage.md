## husky V6.0 前
1. 添加依赖
```
npm install -D husky
```
2. 配置 git hooks
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test", // 在commit之前先执行npm run test命令
      "commit-msg": "commitlint -e $HUSKY_GIT_PARAMS" // 校验commit时添加的备注信息是否符合我们要求的规范
    }
  }
}

## husky V6.0 后
1. 添加依赖
```
npm install -D husky
```
2. 在package.json 中添加 prepare 脚本
```
{
  "scripts": {
    "prepare": "husky install"
  }
}
```
prepare脚本会在npm install（不带参数）之后自动执行。也就是说当我们执行npm install安装完项目依赖后会执行 husky install命令，该命令会创建.husky/目录并指定该目录为git hooks所在的目录。

3. 添加钩子
```
// 暂存区钩子
npx husky add .husky/pre-commit 'npx lint-staged'

// 存储区钩子
npx husky add .husky/commit-msg  'npx --no -- commitlint --edit ${1}'
```
