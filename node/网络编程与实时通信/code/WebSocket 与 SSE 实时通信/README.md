# WebSocket 与 SSE 实时通信

Node.js 后端知识体系 —— 《WebSocket 与 SSE 实时通信》配套实验代码。脚本清单、运行命令与正文 `## 配套代码` 表一一对应。

## 运行

```bash
npm run <脚本>       # 见下方清单；依赖 `ws` 的脚本先 `npm install`
```

| 脚本 | 运行命令 |
| --- | --- |
| `sse.js` | `npm run sse` |
| `websocket.js` | `npm run websocket` |

## 注意事项

- `websocket` 依赖 `ws`，运行前先 `npm install`；
- 服务类脚本占用的端口结束后记得 Ctrl+C 释放。
