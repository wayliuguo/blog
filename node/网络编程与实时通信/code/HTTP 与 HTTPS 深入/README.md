# HTTP 与 HTTPS 深入

Node.js 后端知识体系 —— 《HTTP 与 HTTPS 深入》配套实验代码。脚本清单、运行命令与正文 `## 配套代码` 表一一对应。

## 运行

```bash
npm run <脚本>       # 见下方清单；本项目零依赖，无需安装
```

| 脚本 | 运行命令 |
| --- | --- |
| `src/http-server.js` | `npm run http-server` |
| `src/keepalive.js` | `npm run keepalive` |
| `src/https-server.js` | `npm run https-server` |
| `src/keepalive-timeouts.js` | `npm run keepalive-timeouts` |
| `src/http-response.js` | `npm run http-response` |

## 注意事项

- `http-server` 常驻运行，结束后 Ctrl+C 释放端口 3000；
- `https-server` 依赖项目根目录的 `server.key` / `server.cert`（openssl 生成的自签证书），脚本里临时关掉了证书校验——生产环境不能这么干；
