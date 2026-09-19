# eng-lab · 工程实践与架构配套实验台

零依赖，只用 Node 内置能力，**不需要 `npm install`**。每个场景自带的 HTTP 服务都用 `listen(0)` 交给系统分配端口，跑完即关，所以这个实验台不占固定端口，也不会和板块里别的 lab 撞车。

## 运行

```bash
node cli.mjs list      # 看有哪些场景
node cli.mjs layers    # 依赖分层扫描
node cli.mjs auth      # RBAC 权限判定
node cli.mjs upload    # 切片上传、断点续传、秒传
node cli.mjs vscroll   # 虚拟滚动的区间计算
node cli.mjs request   # 请求层：拦截器 / 竞态 / 去重 / 并发上限 / 缓存
node cli.mjs all       # 一次跑完，正文里的实测输出都出自这里
```

也可以用 `npm run layers` 这样的短名，脚本名与正文里的「运行：`npm run xxx`」逐字一致。

## 目录

```
eng-lab/
  cli.mjs              场景入口：按名字动态 import scenarios/<name>.mjs
  harness/table.mjs    中英混排对齐表格（中文按 2 列宽算）、耗与字节换算
  harness/server.mjs   临时 HTTP 服务（listen 0）+ 读 body + JSON 响应
  harness/pool.mjs     带并发峰值统计的并发池，串行只是 limit=1 的特例
  fixtures/shop/       被扫描的示例业务目录，故意埋了 4 类架构违规
  scenarios/           一个现象一个脚本，每个都能单跑
```

## fixtures/shop 是故意写坏的

它是一份**看起来正常、实际违反分层规约**的示例代码：`utils/validate.js` 认识「当前登录用户」、`store/cart.js` 引用了上层的 `hooks/`、`views/order/OrderList.js` 绕过 api 层直接 fetch、`OrderDetail.js` 伸手去拿 `views/user/` 的内部文件。19 个文件、33 条内部 import，被 `layers` 场景扫出 5 条违规。

抄这份目录去练手时，先自己找违规、再用脚本对答案。

## 脚本与篇目对照

| npm script | 命令 | 对应篇目 | 覆盖小节 |
|---|---|---|---|
| `list` | `node cli.mjs list` | — | 列出全部场景 |
| `layers` | `node cli.mjs layers` | 前端架构与分层 | 层间依赖矩阵 · 违规判定 · 扇入与影响面 |
| `auth` | `node cli.mjs auth` | 权限系统设计 | 通配匹配 · 菜单树过滤 · 按钮级判定 · 字段级 |
| `request` | `node cli.mjs request` | 请求层与缓存设计 | 拦截器洋葱 · 竞态 · 去重 · 并发上限 · TTL 与 SWR |
| `upload` | `node cli.mjs upload` | 大文件上传与断点续传 | 串行与并发 · 断点续传 · 秒传 · 完整性校验 · 指纹代价 |
| `vscroll` | `node cli.mjs vscroll` | 虚拟滚动与大数据渲染 | 定高区间 · 全量对照 · 缓冲区 · 不定高二分 · 滚动锚定 |
| `all` | `node cli.mjs all` | 全模块 | 依次跑完上面五个 |

## 读数字的注意事项

- 所有耗时都是**本机实跑**，绝对值随机器变化，但对照组之间的比例关系稳定（例如 20 个 120ms 请求串行 2491ms、并发 4 条 694ms）。引用时请连对照条件一起引用。
- `upload` 场景的文件内容由固定种子的伪随机生成，所以 sha256 每次都一样（`5e7d7dc8135f13c8…`），换了文件大小或算法就会变。
- `vscroll` 的查找耗时是 2000 次循环取中位数，单位 µs；定高方案只做一次除法，所以它那格写的是「常数时间」而不是具体数值 —— 微秒级的对象分配开销会让它看起来比二分还慢，那是测量方式的假象，不是算法事实。
