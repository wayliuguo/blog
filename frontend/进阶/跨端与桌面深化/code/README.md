# 跨端与桌面深化 · 配套代码

| 目录 | 技术栈 | 实跑状态 | 对应篇目 |
| --- | --- | --- | --- |
| `rn-app/` | RN 0.73 + TS | ✅ `npm run bundle` Metro 全量编译（842KB）；设备层需真机 | React Native |
| `flutter-app/` | Flutter 3.x（Dart） | ⚠️ 完整代码交付，未实跑（环境配置见其 README） | Flutter |
| `electron-app/` | Electron 33 | ✅ `npm run smoke` 烟雾测试 4/4（真实窗口 + IPC） | Electron |
| `cross-lab/` | 零依赖 Node 探针 | ✅ `node run.cjs` 七探针全过 | 各章「最小实现」小节 |

## cross-lab 探针与篇目对照

| 探针 | 内容 | 引用篇目 |
| --- | --- | --- |
| `jsi.cjs` | Bridge vs JSI 通信基准（序列化有损 + 开销倍数） | React Native §2 |
| `mapper.cjs` | RN 原生映射器：diff 描述树 → 最小指令集 | React Native §4 |
| `three-trees.cjs` | Flutter Widget/Element/RenderObject 复用契约 | Flutter §2、§4 |
| `webview.cjs` | 容器预热池成本模型 + 离线包命中/兜底/签名 | Hybrid 与 JSBridge §二、三 |
| `bridge.cjs` | 桥协议 / 回调表 / 超时 / 批量 / 白名单 | Hybrid 与 JSBridge §四 |
| `twin.cjs` | 小程序双线程 setData 合并与增量 | Hybrid 与 JSBridge §五 |
| `electron.cjs` | IPC 往返 / contextBridge 白名单 / 更新状态机 | Electron §二、四 |
| `run.cjs` | 总入口：依次执行七探针 | 全板块 |

## 通信约定

统一业务场景为订单工作台（列表 + 详情 + 状态推进），三工程数据结构同构（`{ id, title, amount, status }`），方便横向对照同一业务在不同宿主里的写法与代价。
