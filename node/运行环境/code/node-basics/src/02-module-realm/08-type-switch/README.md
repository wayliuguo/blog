# 08-type-switch：`type` 字段与后缀强制

这一组文件专门演示同一个目录下两套模块系统怎么共存。

## 文件构成

| 文件 | 解析方式 | 由谁决定 |
| --- | --- | --- |
| `package.json` | —— | `{ "type": "module" }`，本目录的「整包开关」 |
| `esm-default.js` | ESM | 后缀无强制，继承本目录的 `type: module` |
| `cjs-forced.cjs` | CommonJS | `.cjs` 后缀强制指定，优先级高于 `type` |
| `run.cjs` | CommonJS | 入口脚本，本身也是 `.cjs` |

## 怎么跑

在仓库 `node-basics` 目录下：

```bash
npm run mr08
# 等价于 node src/02-module-realm/08-type-switch/run.cjs
```

也可以单独看某一个文件被解析成了什么：

```bash
node src/02-module-realm/08-type-switch/esm-default.js
node src/02-module-realm/08-type-switch/cjs-forced.cjs
```

注意：直接 `node src/02-module-realm/08-type-switch/esm-default.js` 会按 ESM 解析，
但如果把这个文件复制到别的、没有 `"type": "module"` 的目录里，它会被当成 CommonJS 并因 `import` 语法报错。
决定权在「离它最近的 package.json」，不是文件名。

## 该观察到什么

`run.cjs` 会依次以独立入口运行另外两个文件，输出里能看到：

- `esm-default.js`：`typeof require = undefined`、`typeof __dirname = undefined`，有 `import.meta.url`；
- `cjs-forced.cjs`：`typeof require = function`，`__dirname` 可用，`module.exports` 是对象；
- 两者处在同一个目录、受同一份 `package.json` 管辖，唯一区别就是文件后缀。

结论：**后缀强制 > package.json 的 type 字段**。
