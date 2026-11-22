# TCP 与 Socket 编程

Node.js 后端知识体系 —— 《TCP 与 Socket 编程》配套实验代码。脚本清单、运行命令与正文 `## 配套代码` 表一一对应。

## 运行

```bash
npm run <脚本>       # 见下方清单；本项目零依赖，无需安装
```

| 脚本 | 运行命令 |
| --- | --- |
| `src/tcp-server.js` | `npm run tcp-server` |
| `src/tcp-client.js` | `npm run tcp-client` |
| `src/sticky-packet.js` | `npm run sticky-packet` |
| `src/protocol-server.js` | `npm run protocol-server` |
| `src/protocol-client.js` | `npm run protocol-client` |
| `src/backpressure.js` | `npm run backpressure` |
| `src/pipe-vs-manual.js` | `npm run pipe-vs-manual` |

## 注意事项

- `tcp-server` / `protocol-server` 常驻运行，结束后 Ctrl+C 释放端口（4000 / 4002）；
- 一 server 一 client 的组合（`tcp-server`+`tcp-client`、`protocol-server`+`protocol-client`）需开两个终端，先起服务再跑客户端；
