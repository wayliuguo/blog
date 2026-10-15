# mini-pinia

Vue3 侧状态管理的同一份最小实现：响应式底座 + setup store，零依赖、可运行、可计数。

```
响应式底座（三层依赖表 / effect / computed）→ createPinia / defineStore / storeToRefs / $patch
```

目标不是"复刻 Pinia"，而是回答一个能数出来的问题：**状态变了之后，到底有多少个 effect 被唤醒？** Pinia 与 Vuex、Redux 的差别不在 API 长相，而在"这个判断在哪一层做"——响应式把判断放在 store 内部（依赖表精确到字段）。

## 运行

```bash
npm run step:reactivity # 响应式底座：改一个字段唤醒几个 effect、computed 的惰性与缓存
npm run step:pinia      # defineStore / storeToRefs / $patch 实测
npm run step:compare    # Pinia vs 直接 reactive vs Vuex 式 mutation 对照
npm test                # 11 个单测（node:test，零依赖）
```

## 脚本 × 篇目对照

| 命令 | 覆盖现象 | 关键实测 |
| ---- | ---- | ---- |
| `step:reactivity` | 三层依赖表、`computed` 惰性与缓存 | 改 `cart.items` 只唤醒 **1/3** 个 effect；`computed` 计算次数 1 → 1 → 2 → 2 |
| `step:pinia` | `defineStore`（id 即命名空间）、ref 自动解包、`storeToRefs`、`$patch` 逐键 Object.is | 两次 `useStore` 同一实例；`storeToRefs` 里 `items` 是 ref、`add` 保留为函数；`$patch` 赋同值不触发依赖 |
| `step:compare` | 三条路线跑同一份改动，数 effect 唤醒次数 | 三条路线每次改动都唤醒 **1** 个 effect；差别只在"谁能改、怎么改"的约定 |
| `npm test` | 上述行为固化成 11 条断言 | 11 passed |

## 目录

```
src/
├── reactivity.js  三层依赖表（target → key → dep）/ effect（cleanup）/ computed（脏标记 + scheduler）
├── pinia.js       createPinia / defineStore（setup 风格，id 即命名空间）/ useStore / storeToRefs / $patch / ref
steps/             三个可单跑的观察脚本
test/              reactivity 与 pinia 两份单测
```

## 与真实库的差距（有意省略）

- 没有 `createPinia` 的应用安装（Vue 插件、devtools 桥接），只有 `setActivePinia` 约定全局实例
- 没有 option store（state / getters / actions 对象写法），只有 setup store
- `$patch` 只有同步逐键赋值，没有"函数式 patch"与批量调度（真实 Pinia 靠 Vue 的 scheduler + nextTick 合并）
- 没有 `watch` / `subscribe` / 持久化插件 / 状态快照

省略的这些都是在同一套骨架上加的一层：插件是"包一层 store 实例化"，`nextTick` 是"把渲染 effect 交给 scheduler"，option store 是"把 setup 返回的对象拆成 state / getters / actions 三个桶"。核心那三个判断——**新引用算不算变了、谁读过这个字段、改完通知谁**——都在上面的代码里。

## 已知取舍

- **`storeToRefs` 只解包第一层**：ref 字段保持 ref 形态，action 原样保留；这正是它与"直接把整个 store 解构"的分界，也是模板里自动解包、脚本里手动解包这条规则的由来。
- **`$patch` 逐键 `Object.is`**：赋同值直接跳过，不触发依赖；真实 Pinia 在此基础上再做函数式批量更新。
- **`ref` 与 `signal` 同构**：依赖表的键是一个空 box 对象，值与 `get value` / `set value` 之间隔着一层访问器——这就是"signal 归位到响应式路线"的机制内核。
