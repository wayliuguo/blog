# 面试题 · Docker 与部署

> 对齐知识体系：node 模块六·工程化与拓展（部署与工程化）。
> 项目结合点：赴演记服务端（Docker 部署）+ 监控配置脚手架（CLI/npm）。红线：定位全栈拓展；K8s 只答概念层，不深吹。

## 一、Docker 原理

### 1. Docker 和虚拟机的区别？容器本质是什么？

**结论：容器不是虚拟机——它是宿主机上一个被 Namespace 隔离、被 Cgroups 限制资源的普通进程，共享宿主内核；虚拟机是硬件级虚拟化带完整操作系统。所以容器秒级启动、MB 级开销、隔离性弱于 VM。**

- 对比表

| 维度 | Docker | 虚拟机 |
| --- | --- | --- |
| 隔离层级 | 进程级（共享内核） | 硬件级（独立内核） |
| 启动 | 秒级 | 分钟级 |
| 资源占用 | MB 级 | GB 级 |
| 隔离/安全 | 较弱（共享内核） | 强 |
| 性能 | 接近原生 | 有 5~20% 损耗 |

- 三大底层技术（面试加分三件套）
  - **Namespace**：管「看到什么」——PID/网络/挂载点/主机名等隔离
  - **Cgroups**：管「能用多少」——CPU/内存/IO 限额
  - **UnionFS**：管「怎么叠」——镜像分层与写时复制
- 追问：一句话总结容器与 VM？
  - Namespace 管隔离，Cgroups 管限额，VM 管的是「再造一台机器」

### 2. Docker 镜像为什么要分层？写时复制是什么？

**结论：镜像由只读层叠加而成，容器启动时在顶部加一个可写层——分层带来复用（多镜像共享基础层）、增量传输（只拉缺失层）、构建缓存（未变化层直接复用）三大收益；修改文件时才从只读层拷贝到可写层，即写时复制（COW）。**

- 要点
  - Dockerfile 每条指令对应一层；层可被缓存与共享
  - 容器删了可写层就没了——持久化数据必须走 volume（见后）
  - 构建缓存实践：**变动少的步骤放前面**（先 COPY package.json 装依赖，再 COPY 源码）——源码改动不触发依赖重装
- 追问：为什么 `.dockerignore` 重要？
  - 减小构建上下文（node_modules/.git 不进上下文）——构建更快，也避免敏感文件进层

## 二、Dockerfile 与镜像优化

### 3. CMD 和 ENTRYPOINT 的区别？

**结论：CMD 提供默认命令或参数、可被 `docker run` 的参数完全覆盖；ENTRYPOINT 定义固定入口命令、参数追加不覆盖；最佳实践是 ENTRYPOINT 固定命令 + CMD 提供默认参数。**

```dockerfile
ENTRYPOINT ["node", "server.js"]
CMD ["--port", "3000"]
# docker run myapp --port 4000 → node server.js --port 4000
```

- 追问：COPY 和 ADD 的区别？
  - COPY 纯拷贝，行为明确；ADD 额外支持自动解压 tar 与远程 URL——官方推荐一律 COPY，ADD 的「智能」容易带来意外

### 4. 怎么减小镜像体积？多阶段构建好在哪？

**结论：五招——alpine 精简基础镜像、多阶段构建（builder 装依赖编译，runner 只拷产物）、合并 RUN 减层数并清缓存、.dockerignore 排除无关文件、只装生产依赖；Node 项目常见从 1GB+ 优化到 200MB 以内。**

- Node 多阶段模板（必会）

```dockerfile
# 阶段一：构建
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 阶段二：运行
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

- 加分点
  - `npm ci` 优于 `npm install`（按 lockfile 精确安装）
  - 非 root 用户运行（USER node）是安全标配
  - HEALTHCHECK / 健康检查接口配合编排层的探活
- 追问：为什么 runner 阶段要 `ENV NODE_ENV=production`？
  - 跳过 devDependencies、关闭调试输出——体积与启动行为都受它影响

### 5. 容器的数据持久化怎么做？网络模式有哪几种？

**结论：持久化三方式——volume（Docker 管理，推荐）、bind mount（挂宿主机目录，开发期代码同步）、tmpfs（内存，临时敏感数据）；网络四种——bridge（默认网桥）、host（共享宿主网络）、none（隔离）、overlay（跨主机）。**

- 持久化对比

| 方式 | 特点 | 场景 |
| --- | --- | --- |
| volume | Docker 管理生命周期，可备份迁移 | 数据库数据、上传文件 |
| bind mount | 直接映射宿主路径 | 开发环境热更新 |
| tmpfs | 内存态，容器停即失 | 临时凭证 |

- 网络：bridge 下容器间用容器名互访（同一自定义网络内自带 DNS）；host 性能最好但端口冲突
- 追问：容器里数据没挂 volume 会怎样？
  - 存在可写层里，容器删除数据全丢——「无状态容器 + 有状态外置（volume/云盘/数据库）」是基本原则

### 6. 容器启动就退出 / 一直重启，怎么排查？

**结论：容器必须有一个持续运行的前台进程，主进程退出容器即停；排查三板斧——`docker logs`（加 `--previous`/`--tail`）、`docker inspect`（看退出码与 OOMKilled）、`kubectl describe pod`（K8s 场景看事件）。**

- 常见退出码含义

| 退出码 | 含义 |
| --- | --- |
| 0 | 正常退出（主进程执行完了——比如 CMD 写了会结束的命令） |
| 1 | 应用错误 |
| 125 / 126 / 127 | Docker 自身错误 / 命令不可执行 / 找不到命令 |
| 137 | SIGKILL——OOMKilled 或手动 kill（高频） |
| 143 | SIGTERM 正常停止 |

- 重启策略：`unless-stopped`（自动恢复但尊重手动 stop）是生产推荐；`CrashLoopBackOff` = 反复崩溃重启
- 追问：137 大概率是什么问题？
  - 内存超限被 kill——检查应用内存泄漏或调大容器 limit（结合 Node 篇 OOMKilled 话题）

## 三、部署与交付

### 7. Docker Compose 了解吗？和单容器部署的区别？

**结论：Compose 用一份 YAML 声明多容器应用（应用 + MySQL + Redis）的编排——一键 `up` 拉起整套、内置网络互通、依赖顺序（depends_on + 健康检查）；单机小规模的标准答案，规模化才上 K8s。**

- 要点
  - 服务间用服务名做主机名（同一网络内置 DNS）
  - `depends_on` 只管启动顺序，真正的「等就绪」要配 healthcheck
  - 环境差异用 `.env` + 多份 compose 文件（override）
- 追问：什么时候 Compose 不够用？
  - 多机调度、自动扩缩容、滚动更新与自愈——那就是 K8s 的领域

### 8. PM2 了解多少？什么时候用 PM2 什么时候用 Docker？

**结论：PM2 是 Node 进程管理器——cluster 模式多进程榨核、零停机 reload（逐个换进程）、日志管理与开机自启；单机/Node 生态内 PM2 够用，要跨环境一致、编排与扩缩容就交给容器。**

- 要点
  - `pm2 start --name app -i max`：cluster 模式按 CPU 数起进程
  - reload vs restart：reload 逐个换进程保服务不断；restart 全量重启有瞬断
  - PM2 也能包 Docker 场景：容器内用 PM2 管多进程是可选项（容器通常一容器一进程更纯粹）
- 追问：容器时代还需要 PM2 吗？
  - K8s/Swarm 已提供进程级编排与自愈，容器内单进程 + 编排器重启更符合「一个容器一个职责」；PM2 的价值集中在无容器平台的单机部署

### 9. 线上日志怎么做？结构化日志的要点？

**结论：结构化 JSON 日志 + 分级 + traceId 串联请求链路 + 按天切割轮转控制磁盘；错误日志对接告警——「能检索、能串联、能告警」三个能力缺一不可。**

- 要点
  - winston/pino：分级（error/warn/info/debug）、JSON 输出、pino 性能更好
  - traceId：网关生成或本地生成，全程透传（日志中间件里挂上）——跨服务排查的生命线
  - 轮转：logrotate 或 winston-daily-rotate-file 按天切割，避免磁盘打爆
  - 容器场景：日志输出到 stdout，交给 Docker/编排层收集（别在容器里自己管文件）
- 追问：为什么容器里日志写 stdout 而不是文件？
  - 十二要素应用原则——容器文件系统是临时的，stdout 交给收集器统一处理，避免容器膨胀与日志丢失

### 10. 限流怎么做？几种算法的区别？

**结论：计数器（固定窗口，有边界突刺）、滑动窗口（平滑）、令牌桶（允许突发，匀速补充）、漏桶（恒定速率整形）——单机用 NestJS Throttler 中间件按路由配置，分布式用 Redis 计数（Lua 保证原子）。**

- 算法对比

| 算法 | 特点 | 局限 |
| --- | --- | --- |
| 固定窗口计数 | 简单 | 窗口边界双倍突刺 |
| 滑动窗口 | 平滑 | 实现稍复杂 |
| 令牌桶 | 允许突发（攒令牌） | 参数要调 |
| 漏桶 | 恒定速率输出 | 无法应对突发 |

- 分布式限流：多实例下内存计数各自为政——Redis `INCR + EXPIRE`（Lua 原子化）做全局限流
- 追问：限流之后的拒绝怎么返回？
  - 429 + Retry-After 头；网关层再兜一层熔断降级

### 11. 线上一个接口变慢，怎么排查？

**结论：先测量再下结论——traceId 串日志定位到慢请求，把耗时拆成「应用计算 / DB 查询 / 外部调用」三段计时，分别对症：应用段看 CPU 与事件循环，DB 段看慢查询与 EXPLAIN，外部段看超时与重试配置。**

- 答题框架
  1. 定位：traceId 找到慢请求的完整日志
  2. 分段计时：中间件/拦截器里对三段分别打点（不靠感觉）
  3. 归因
     - 应用段：事件循环延迟、同步阻塞（结合 Node 篇排障）
     - DB 段：慢查询日志 + EXPLAIN（结合 MySQL 篇三步法）
     - 外部段：超时配置是否合理、重试是否放大故障
  4. 验证：改动后对比分段耗时，数字说话
- 追问：外部依赖变慢怎么防雪崩？
  - 给外部调用设超时（永不无限等）、重试带上限与退避、必要时熔断降级——故障隔离三件套

### 12. K8s 了解多少？说几个核心概念即可

**结论：概念层了解即可——Pod 是最小调度单元（一或多个容器共享网络与存储）、Deployment 管副本与滚动更新、Service 提供稳定的访问入口；核心能力是自愈、扩缩容、滚动更新。能说清「和 Compose 的边界」就是合格的前端/全栈答案。**

- 核心概念速览

| 概念 | 一句话 |
| --- | --- |
| Pod | 最小调度单元，容器共享 IP 与卷 |
| Deployment | 声明副本数，滚动更新（新旧 ReplicaSet 渐替）+ 回滚 |
| Service | 一组 Pod 的稳定访问入口（标签选择器） |
| ConfigMap / Secret | 明文 / 敏感配置注入（env 或卷挂载） |
| 探针 | livenessProbe 探活（失败重启）、readinessProbe 探就绪（失败摘出 Service） |

- 与 Compose 的边界：单机编排 Compose；多机调度、自动扩缩、自愈上 K8s
- 追问：livenessProbe 和 readinessProbe 的区别？
  - liveness 失败 → 重启容器；readiness 失败 → 从 Service 后端摘除（不接流量但不重启）——启动慢的应用还要配 startupProbe 防止启动期被误杀
