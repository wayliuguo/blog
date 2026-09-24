# E2E 与稳定性

## 一、守什么：关键路径

E2E 的成本结构决定了它不能铺开：一条用例几秒到几十秒，还要维护浏览器环境与测试数据。放进去的应该是**挂了就是事故**的路径：

| 该进 E2E | 不该进 E2E |
| --- | --- |
| 登录 / 注册 / 退出 | 组件的分支细节（组件测试已覆盖） |
| 下单支付主流程 | 边界值与金额计算（单测已覆盖） |
| 跨页面的核心跳转 | 各种表单校验组合 |
| 与第三方的关键集成（支付回调、OAuth） | 视觉与布局细节（交给截图对比） |

经验规模：几十条，而不是几百条。超过这个量级，套件就会从"保护"变成"负担"。

## 二、怎么写：骨架与定位器

> 说明：Playwright 需要额外安装 `@playwright/test` 与浏览器二进制，本仓库的配套脚本里没有运行它，下面这段是结构示例。

> 示意片段（无配套脚本）

```ts
import { test, expect } from '@playwright/test'

test('用户可以登录并进入首页', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('用户名').fill('阿白')
    await page.getByLabel('密码').fill('secret')
    await page.getByRole('button', { name: '登录' }).click()

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText('欢迎回来，阿白')).toBeVisible()
})
```

几个要点：

- **定位器语义化和组件测试是同一套思路**：`getByRole` / `getByLabel` / `getByText` 优先，CSS 选择器和 XPath 兜底。用 `.btn-primary` 定位，改个 class 就红。
- **每个用例自带完整前置**：`test` 的第二个参数 `page` 是全新上下文，天然隔离 —— 不要为了"快一点"在用例之间共享登录态，那是顺序依赖的开始。
- **不要断言 URL 字符串相等**，用正则匹配关键部分，避免 query 参数变化带来的脆弱。

## 三、怎么等：自动等待不写 sleep

Playwright 的断言是 "web-first" 的：`expect(locator).toBeVisible()` 会**自动重试**直到超时（默认 5 秒），而不是此刻立刻判定。这意味着"元素还没渲染出来"这类时序问题被框架吸收了。

所以：

```
// 反例：睡一秒再看 —— 慢机器上不够，快机器上白等
await page.waitForTimeout(1000)
expect(await page.getByText('欢迎回来').isVisible()).toBe(true)

// 正例：等条件成立
await expect(page.getByText('欢迎回来')).toBeVisible()
```

同理，导航不要用 `waitForTimeout`，用 `page.waitForURL` 或断言 URL；请求不要用固定等待，用 `page.waitForResponse`。

## 四、怎么控环境：数据与网络拦截

E2E 不稳，一半的原因是**数据不可控**。三条纪律：

1. **每个用例用独立数据**：用户账号、订单号都带随机后缀或用例 ID，避免并发跑时互相踩。
2. **前置数据用 API 造，不用 UI 造**：跑一遍注册流程来准备"已登录用户"既慢又脆，直接调接口或写库。
3. **外部依赖要拦截**：第三方支付、短信、地图这类服务在 CI 里既不可用也不稳定，用 `page.route` 拦截并返回固定响应。

> 示意片段（无配套脚本）

```ts
// 把第三方接口钉死，让用例只验证"前端怎么用它"
await page.route('**/api/pay/**', (route) =>
    route.fulfill({ status: 200, json: { success: true, orderId: 'fixed-order-id' } })
)
```

反过来，**不要拦截自己系统的接口**（除非在测降级分支）—— 那会让 E2E 退化成组件测试，失去发现真实集成问题的价值。

## 五、为什么 flaky：四个可复现根因

flaky 的定义是：同一份代码、同一条用例，跑多次结果不同。它的危害不在浪费 CI 时间，而在**消耗信任** —— 一旦大家习惯"红了重跑一次就好"，真 bug 混在里面也没人看。

下面这组实验把四个根因全部复现了一遍，每个都配修法。先看被测代码：

> 摘自 `./code/test-lab/src/flaky/streak.js`

```js
// 被测源码：跨天判断 + 一个共享的模块级集合（用来复现"用例之间串味"）

export function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// 同一件事的另一种写法：只认 UTC，不受运行环境的时区影响
export function isSameDayUtc(a, b) {
    return (
        a.getUTCFullYear() === b.getUTCFullYear() &&
        a.getUTCMonth() === b.getUTCMonth() &&
        a.getUTCDate() === b.getUTCDate()
    )
}

export function signInStreak(lastSignIn, now) {
    if (!lastSignIn) return 1
    if (isSameDay(lastSignIn, now)) return 0 // 今天已签到
    const diffDays = (now - lastSignIn) / 86400000
    return diffDays < 2 ? 1 : 0 // 断签则重新开始
}

const visited = []

export function markVisited(path) {
    visited.push(path)
    return visited.length
}

export function visitCount() {
    return visited.length
}
```

### 根因一：用 sleep 赌时间

> 摘自 `./code/test-lab/src/flaky/flaky.test.js`

```js
it.fails('以为 50ms 够了，实际要 80ms', async () => {
    let done = false
    setTimeout(() => {
        done = true
    }, 80)

    await sleep(50)
    expect(done).toBe(true) // 慢机器上 50ms 不够，快机器上刚好够 —— 典型的 flaky
})

it('修法：等待"条件成立"而不是等待"时间过去"', async () => {
    let done = false
    setTimeout(() => {
        done = true
    }, 80)

    await vi.waitFor(() => {
        expect(done).toBe(true)
    })
})
```

第一条用 `it.fails` 标成"预期失败"：它在本机必然失败（80 > 50），但在一台足够慢的机器上，事件循环的调度延迟可能让 50ms 的 sleep 实际耗时超过 80ms，于是它就"莫名通过"了。这正是 flaky 最难查的地方 —— **它取决于机器负载**。

修法是等条件成立（`waitFor` / `findBy*` / 自动重试断言），而不是等一段时间。

### 根因二：用例之间共享可变状态

> 摘自 `./code/test-lab/src/flaky/flaky.test.js`

```js
describe('flaky 来源二：用例之间共享了可变状态', () => {
    it('A 用例访问了首页', () => {
        expect(markVisited('/home')).toBe(1)
    })

    it.fails('B 用例期望从零开始 —— 但 A 已经写过数据了', () => {
        expect(visitCount()).toBe(0)
    })
})
```

`visited` 是一个模块级数组，A 用例往里写了一条，B 就再也拿不到 0 了。这两条用例之间存在**隐式顺序依赖**：按 A→B 跑，B 必失败；按 B→A 跑，B 通过。

把顺序打乱就能看到它时红时绿。同一条命令跑两次：

```
> vitest run src/flaky --sequence.shuffle
      Running tests with seed "1789777062007"

 ✓ src/flaky/flaky.test.js (7 tests) 218ms

 Test Files  1 passed (1)
      Tests  4 passed | 3 expected fail (7)
```

```
> vitest run src/flaky --sequence.shuffle
      Running tests with seed "1789777066673"

 ❯ src/flaky/flaky.test.js (7 tests | 1 failed) 218ms
   ❯ flaky 来源二：用例之间共享了可变状态 (2)
     ✓ A 用例访问了首页 1ms
     × B 用例期望从零开始 —— 但 A 已经写过数据了 3ms

 Test Files  1 failed (1)
      Tests  1 failed | 4 passed | 2 expected fail (7)
```

一次绿、一次红，代码一行没改。**修法**：每个用例结束把共享状态恢复原样（`beforeEach` 重置 / `afterEach` 清理），或者干脆把状态做成每个用例独立构造的对象。同时，日常就用 `--sequence.shuffle` 跑套件，让顺序依赖在第一时间暴露。

### 根因三：依赖"现在"这个会变的值

> 摘自 `./code/test-lab/src/flaky/flaky.test.js`

```js
it.fails('跨过零点后，同一个断言会得到不同结果', () => {
    vi.useFakeTimers()
    // 把"现在"钉在 23:59:59.900（本地时间）
    vi.setSystemTime(new Date('2026-01-01T23:59:59.900'))
    const now = new Date()
    const lastSignIn = new Date('2026-01-01T00:00:00')

    // 业务希望：同一天签到不算连续天数
    const streak = signInStreak(lastSignIn, now)

    // 再拨 200ms 就跨天了
    vi.advanceTimersByTime(200)
    expect(signInStreak(lastSignIn, new Date())).toBe(streak)
})
```

拨表前后只差 200 毫秒，业务结论就变了：同一天签到返回 0，跨天后返回 1。真实世界里这条用例会在**每天 23:59:5x 那几秒**突然变红，第二天早上又自己好了 —— 经典的"午夜幽灵"。

**修法**：把时间当成需要注入的依赖，用例里显式设定，别用"跑测试的那个时刻"：

> 摘自 `./code/test-lab/src/flaky/flaky.test.js`

```js
it('修法：把时间也当成要注入的依赖', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T10:00:00'))
    const now = new Date()

    // 同一天签到 → 连续天数不增加
    expect(signInStreak(new Date('2026-01-01T09:00:00'), now)).toBe(0)
    // 昨天 23:00 签到，今天 10:00 再签 → 跨天但未断签
    expect(signInStreak(new Date('2025-12-31T23:00:00'), now)).toBe(1)
    // 从未签到 → 从 1 开始
    expect(signInStreak(null, now)).toBe(1)
})
```

### 根因四：时区

> 摘自 `./code/test-lab/src/flaky/flaky.test.js`

```js
it('同一对时间戳，时区不同结论就不同', () => {
    const a = new Date('2026-01-01T00:00:00Z')
    const b = new Date('2026-01-01T23:00:00Z')

    // isSameDay 用 getFullYear/getDate 等本地方法：东八区下 a 是 1 号 08:00、b 是 2 号 07:00
    // 所以这段逻辑在开发者机器和 CI（常见 UTC）上会给出不同结果
    expect(isSameDayUtc(a, b)).toBe(true)
    expect(typeof isSameDay(a, b)).toBe('boolean')
    console.log(`本机时区偏移 ${-new Date().getTimezoneOffset() / 60} 小时，isSameDay 结果 = ${isSameDay(a, b)}`)
})
```

两个时间戳在 UTC 下是同一天，但 `isSameDay` 用的是 `getFullYear` / `getDate` 这些**本地时间方法**，东八区一换算就串天了。这类 bug 的表现是"我机器上好好的，CI 上红"。

本机实测输出：

```
本机时区偏移 8 小时，isSameDay 结果 = false
```

**修法**：先想清楚业务口径 —— 按用户的本地日历算，就用本地方法并固定时区（`TZ=Asia/Shanghai` 跑 CI）；按数据本身的日期算，就统一用 `getUTC*` 方法。两条路都行，但不能默认。

### 四个根因一览

| 根因 | 典型症状 | 修法 |
| --- | --- | --- |
| 用 sleep 赌时间 | 慢机器上偶发失败 | 等条件成立（`waitFor` / 自动重试断言） |
| 用例间共享状态 | shuffle 后时红时绿 | beforeEach 重置 / 每用例独立构造 |
| 依赖"现在" | 每天固定时段红 | 时间注入 + 固定系统时间 |
| 时区 | 本地好、CI 红 | 明确业务口径，固定 `TZ` 或统一 UTC 方法 |

跑一遍这一组（默认顺序，全部符合预期）：

```
> test-lab@1.0.0 test:flaky
> vitest run src/flaky

 ✓ src/flaky/flaky.test.js (7 tests) 196ms

 Test Files  1 passed (1)
      Tests  4 passed | 3 expected fail (7)
```

`3 expected fail` 是用 `it.fails` 显式声明的三个反例 —— 它们稳定失败，所以套件稳定为绿。这是把"反例"留在代码里的正确姿势：**反例必须是确定性的**，不能自己也是 flaky。

## 六、怎么规模化：并行、分片与报告

E2E 套件变大后，靠加机器比靠优化用例更有效：

- **并行 worker**：Playwright 默认多 worker 并行，前提是每个用例的数据独立（见第四节）。
- **分片（shard）**：CI 上把用例切成 N 份跑在不同机器上，`--shard=1/4`。分片要用**稳定顺序**切（按文件名排序），否则重试时容易漏跑。
- **trace / 视频 / 截图**：只在失败时保留（`trace: 'on-first-retry'`），全量保留会把存储吃光。
- **重试**：CI 上允许 `retries: 1`，但**重试次数不是治理 flaky 的手段**，它只是降低噪音；必须配一个"连续 N 次重试才通过就报警"的机制。

## 七、怎么治理：flaky 治理流程

1. **先量化**：统计每条用例最近 30 天的失败率，列出 Top 10。治理要有的放矢。
2. **隔离（quarantine）**：把 Top flaky 暂时移出门禁（单独一个 job），保证主流程门禁可信；同时给它们设一个修复 deadline。
3. **定位**：用 trace 看失败那一刻的 DOM 与网络；对照上面四个根因逐个排除。
4. **修根因，不加 sleep**：加 `waitForTimeout` 是"修好了"的假象。
5. **回归验证**：修完用 `--repeat=20`（或 shuffle 多跑几次）确认真的稳定。
6. **立规矩**：主分支红了必须当天处理；连续三天红的用例直接删掉或隔离 —— 一条没人信的测试不如没有。

## 配套代码

本篇示例来自 `code/test-lab`（独立的 npm 项目，首次运行前先 `npm install`）。

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/test-lab/src/flaky/streak.js` | 被测源码：签到连续天数 + 共享访问记录 | 五、为什么 flaky：四个可复现根因 |
| `./code/test-lab/src/flaky/flaky.test.js` | 四个根因的复现与修法（含 `it.fails` 反例） | 五、为什么 flaky：四个可复现根因 |
| `./code/test-lab/package.json` | `test:flaky`（默认顺序）/ `test:shuffle`（打乱顺序） | 五、为什么 flaky：四个可复现根因 |

运行：`cd code/test-lab && npm install && npm run test:flaky`，再跑几次 `npm run test:shuffle` 观察时红时绿。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[组件测试](./组件测试.md)
- 下一篇：[测试基建与门禁](./测试基建与门禁.md)
- [Playwright 官方文档](https://playwright.dev/docs/intro)
- [Vitest 测试顺序与 shuffle](https://vitest.dev/config/#sequence)
