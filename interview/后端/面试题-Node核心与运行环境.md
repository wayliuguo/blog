# 面试题 · Node 核心与运行环境（全覆盖版）

> 对齐知识体系：node 模块一·运行环境 + 模块二·网络底层。
> 高频常考为主，项目结合点：赴演记服务端（NestJS + Docker）+ 监控配置脚手架（CLI/npm）。红线：定位「能独立完成服务端开发与部署的全栈拓展」，不吹后端专家；运行时事实以博客实跑结论为准。

## 一、事件循环（必考核心）

**Q1：Node 事件循环和浏览器的区别？**
- 六阶段：timers → pending callbacks → poll → check（setImmediate）→ close；微任务在阶段间与宏任务后执行
- 与浏览器差异：process.nextTick 优先级最高（阶段切换前清空）；Promise 微任务排在 nextTick 之后
- 经典题：setTimeout(fn,0) 与 setImmediate 顺序在主模块不确定，在 I/O 回调内 setImmediate 先执行

**Q2：nextTick、setImmediate、Promise.then 三者顺序？**
- 同一轮同步代码后：nextTick 队列最先清空 → 微任务（Promise.then）→ 进下一阶段
- nextTick 递归调用会饿死事件循环（starvation）——官方文档明确警告，库代码慎用
- 实测口径：顺序结论以博客「运行环境」模块探针实跑为准，不背二手结论

**Q3：CPU 密集任务怎么办？**
- 事件循环单线程，CPU 密集阻塞所有请求——拆分计算、worker_threads 跑并行线程、或下沉到服务
- worker_threads 与 child_process 选型：CPU 密集共享内存用 worker；隔离运行、复用 Node 环境用 child_process

## 二、Stream 与 Buffer

**Q4：Stream 是什么？背压怎么处理？**
- 四类流：Readable / Writable / Duplex / Transform；处理大文件不占内存、可管道组合
- 背压：消费慢于生产时，write 返回 false → 暂停读取（drain 后恢复），pipeline 自动处理
- 场景：文件上传下载、日志写入、抓取页面的落盘
- 为什么 pipeline 优于 pipe：错误与清理回调统一，pipe 出错不会自动销毁两端

**Q5：Buffer 是什么？什么场景用？**
- 二进制字节序列（堆外内存，不经 V8 对象结构），处理 TCP 流 / 文件流的原始数据
- 编码：utf-8 默认；多字节字符被 chunk 切断会出现乱码——string_decoder 或流拼接（concat 后统一 toString）
- Buffer 内存不占 V8 老生代，大 Buffer 仍会撑爆系统内存——上限意识

## 三、进程与稳定性

**Q6：进程与集群？**
- Node 单线程事件循环，CPU 密集会阻塞 → cluster 多进程榨干多核，pm2 cluster 模式同理
- child_process：exec/execFile/spawn/fork 用途区分（exec 缓冲输出/命令注入面；spawn 流式；fork 专用 Node IPC）
- 进程间通信 IPC：基于管道的 JSON 消息；cluster 的 master 分发连接（默认 round-robin 除 Windows）

**Q7：未捕获异常怎么兜底？**
- uncaughtException：兜最后一道，此时进程状态不可信——记日志后优雅退出（关闭 server、停止接新请求），交给 PM2/容器重启
- unhandledRejection：Node 默认行为已改为直接崩（v15+），别靠吞掉
- 防御分层：业务 try-catch → 框架统一异常过滤器 → 进程级兜底，三层各管一段

**Q8：内存泄漏怎么排查？**
- 常见原因：意外的全局变量、闭包持有大对象、未清理的定时器/监听器、缓存无上限
- 排查：process.memoryUsage 观测 → heap snapshot 对比（devtools/clinic）→ 定位持有链
- 【项目】排行榜/热搜缓存设过期与容量上限，避免无界增长

## 四、网络底层

**Q9：TCP 粘包/拆包？Node 怎么处理？**
- TCP 是字节流无消息边界，粘包是应用层要解决的问题
- 方案：定长、分隔符、长度前缀（header 声明 body 长度）；HTTP 协议自带边界（Content-Length / chunked）
- 【项目】WebSocket 收发有帧边界（协议层已解决），自定义 TCP 场景才需要手动封帧

**Q10：keep-alive 与连接复用？**
- HTTP keep-alive 复用 TCP 连接省握手；axios/undici 连接池默认开启——并发高时连接池上限要配
- 【项目】脚手架批量调用监控平台接口走 axios 复用连接，几十个请求不重建握手
