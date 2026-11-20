# 环境变量与常用内置模块

《环境变量与常用内置模块》配套实验代码：环境变量读取、os 机器信息、path 路径处理、fs 读写与目录遍历。

对应博客：`node/运行环境/环境变量与常用内置模块.md`。

## 环境要求

- Node.js 20.6+（`node --env-file` 需要 20.6+）
- 本目录 `package.json` 设了 `"type": "commonjs"`，`.js` 文件按 CommonJS 解析
- 全部使用 Node 内置模块（`node:` 前缀），**无第三方依赖**，无需 `npm install`

## 脚本清单

| 脚本 | 演示什么 | 运行命令 | 预期输出 |
| --- | --- | --- | --- |
| `src/env/env.js` + `env/.env` | `process.env` 读取、缺省回退、`--env-file` 加载 `.env` | `npm run env` | `NODE_ENV = development`、`DB_HOST = localhost`、`PORT = 3000` |
| `src/os/os.js` | os 机器信息与并行度决策 | `npm run os` | 核数、总/空闲内存、主目录、临时目录、平台（数值随机器而异） |
| `src/path/path.js` | `__dirname`/`__filename`、path 拼接/取片段/解析 | `npm run path` | `__dirname`、`path.join`、`basename`/`dirname`/`extname`、`resolve`、`parse`、`sep` 各一行 |
| `src/fs/fs.js` | `fs/promises` 写/读/追加/目录遍历/删除 | `npm run fs` | 写入 → 读出 → 追加 → 遍历 `[文件] data.json`/`[文件] hello.txt` → 清理 output/ |

## 注意事项

- `env/.env` 是**演示用假值**（`DB_PASSWORD=demo-not-a-real-secret`），可以提交；真实项目里 `.env` 含密钥必须进 `.gitignore`，仓库只放 `.env.example`。
- `fs/fs.js` 会在自己目录下临时创建 `output/` 演示读写与遍历，结束前自动删除。
