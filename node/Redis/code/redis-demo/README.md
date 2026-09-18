# redis-demo

《Node.js 后端知识体系》模块四「数据与缓存 / Redis」配套可运行示例，对应博客 `node/06-Redis/01-Redis 基础与数据类型` 到 `05-Redis 进阶` 五篇文章。每个脚本演示一种真实机制，读者可以亲手跑一遍，而不只是看 API。

## 环境要求

- Node.js 18 及以上
- Redis 6 及以上（推荐 7）

## 2 步跑起来

### ① 启动 Redis

方式一：Docker（推荐）

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

方式二：本地安装

```bash
# macOS
brew install redis && brew services start redis

# Ubuntu
sudo apt-get install redis-server && sudo service redis-server start

# Windows：下载安装 https://github.com/microsoftarchive/redis/releases
```

### ② 安装依赖并逐个运行脚本

```bash
cp .env.example .env   # 按需修改连接配置
npm install            # 安装 ioredis 与 dotenv
npm run types         # 依次运行下列脚本清单中的命令
```

## 脚本清单

| 脚本 | 演示什么 | 运行命令 | 你该观察到什么 |
| --- | --- | --- | --- |
| `01-data-types.js` | 五大基本数据类型 | `npm run types` | 依次打印 String 缓存/计数、Hash 对象、List 队列、Set 去重、ZSet 排行榜与延时队列的结果，结尾自动清理 key |
| `02-expire.js` | 键过期与淘汰策略 | `npm run expire` | EXPIRE/TTL/PERSIST/SET EX 的返回值；SET NX EX 第二次返回 null；每 300ms 打印 TTL，约 1s 后 EXISTS 变 0；结尾列出 8 种 maxmemory-policy |
| `03-cache.js` | 缓存实战（穿透/击穿/雪崩） | `npm run cache` | 第一次读缓存 miss 约 100ms，第二次 hit <1ms，加速约 100 倍；空值防穿透、互斥锁防击穿、TTL 抖动防雪崩的具体输出 |
| `04-lock.js` | 分布式锁 | `npm run lock` | 客户端A 抢锁成功、B 返回 null；Lua 比对 token 安全释放返回 1；旧 token 释放返回 0（保护了别人的锁） |
| `05-rate-limit.js` | 三种限流算法 | `npm run limit` | 200 次请求下固定窗口/滑动窗口/令牌桶各自「通过 50 次，拒绝 150 次」，并说明三者取舍 |
| `06-rank.js` | ZSet 排行榜 | `npm run rank` | 格式化输出 Top3 排行榜、辅助 +300 后的排名变化、带日期且自动过期的当日榜 |
| `07-pubsub.js` | 发布订阅 | `npm run pubsub` | 订阅后逐条收到 3 条消息并打印，收齐后自动 unsubscribe 并退出，不留悬挂进程 |

## 本项目的 7 个机制分别解决什么问题

1. **数据类型（01）**：选对数据结构是性能与代码简洁的基础——计数器用 String、对象用 Hash、队列用 List、去重用 Set、排序/排行用 ZSet。
2. **过期与淘汰（02）**：控制内存增长（TTL），并在内存打满时按策略淘汰，避免 Redis 撑爆或丢数据。
3. **缓存模式与三大问题（03）**：用 Cache-Aside 提速；用空值/布隆过滤器防穿透、用互斥锁防击穿、用 TTL 抖动防雪崩。
4. **分布式锁（04）**：在多个进程/服务间互斥执行临界操作（如扣库存、下单），并保证只释放自己的锁。
5. **限流（05）**：保护系统不被突发流量打垮，固定窗口最简单、滑动窗口最平滑、令牌桶容忍突发。
6. **排行榜（06）**：用 ZSet 高效实现实时排序、加分与名次查询，以及按日期自动过期的时段榜。
7. **发布订阅（07）**：实现轻量级的实时消息广播（如通知、配置变更推送）。

## 常见问题

**连不上 Redis（Error: connect ECONNREFUSED）**
确认 Redis 已启动（`redis-cli ping` 应返回 `PONG`），且 `REDIS_HOST` / `REDIS_PORT` 配置正确。

**Protected mode 报错（DENIED Redis is running in protected mode）**
Redis 默认开启保护模式且未设密码时只允许本机 127.0.0.1 访问。若是远程/容器访问，请在 `redis.conf` 中设置 `requirepass` 并配置 `bind`，再在 `.env` 填写 `REDIS_PASSWORD`；本机开发保持 `127.0.0.1` 即可。

**键没设 TTL 导致内存涨**
务必给缓存类 key 设置过期时间（如 `SET ... EX` 或 `EXPIRE`）。本项目的 `demo:` 前缀 key 在脚本结束时会自动清理，但若手动写入请记得加 TTL，并配合合适的 `maxmemory-policy`。

## 预期输出

- 前置：需可用 Redis（Docker `docker run -d -p 6379:6379 redis:7-alpine` 或本地安装），`cp .env.example .env` 并 `npm install`。
- `npm run types` 依次打印 String/Hash/List/Set/ZSet 结果，结尾自动清理 key。
- `npm run cache` 首次读 miss 约 100ms、二次 hit <1ms，加速约 100 倍；`npm run lock` 演示客户端 A 抢锁成功、B 返回 null，Lua 比对 token 安全释放。
- `npm run limit` 在 200 次请求下「通过 50、拒绝 150」；`npm run pubsub` 订阅后收到 3 条消息并打印，收齐后自动退出。
- 若连不上 Redis，脚本报 `ECONNREFUSED`，请先确认 Redis 已启动且地址/端口正确。
