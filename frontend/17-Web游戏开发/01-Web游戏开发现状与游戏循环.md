# Web 游戏开发现状与游戏循环

> 级别：中级

按本书四层推进——先入门：理解 Web 游戏生态、引擎选型与所有游戏的心脏**主循环（game loop）**；再进阶：交代 rAF、deltaTime、固定步长这些引擎都会用到的底层机制；实战与最小实现见本层尾部：到 `code/frontend/17-game` 跑 `game-loop.html`，手写一个主循环把一个方块动起来，用最少的代码看清"更新 + 渲染"与 deltaTime 的原理。

Web 游戏是前端领域最容易令人上瘾的方向之一：不需要下载安装、点击链接即开即玩、天然跨端。从最早的 Flash 小游戏，到如今 WebGL/WebGPU 驱动的 3A 试玩，再到微信/抖音小程序里海量的"H5 小游戏"，Web 已经成了游戏分发的巨大平台。这一章我们先建立对 Web 游戏生态的整体认知，再深入理解所有游戏引擎都绕不开的**核心心脏——游戏主循环（game loop）**。

接着我们会横向对比主流 2D/3D 引擎（PixiJS、Phaser、Three.js、Babylon.js、Cocos），最后回顾 H5 小游戏与小程序游戏的异同，以及 Web 容器到底给了我们哪些能力。掌握了这些地图，后面几章逐层深入就不会迷路。

## 一、Web 游戏的形态与分类

### 1. 按渲染技术划分

| 形态 | 渲染核心 | 代表场景 | 特点 |
| --- | --- | --- | --- |
| HTML/CSS 游戏 | DOM + CSS3 | 简单打地鼠、记忆翻牌 | 开发快，性能低，只适合极简游戏 |
| Canvas 2D 游戏 | Canvas 2D API | 休闲小游戏、贪吃蛇 | 性能尚可，2D 拼接动画友好 |
| WebGL 2D/3D 游戏 | WebGL 1.0/2.0 | 2D 精灵游戏、3D 场景 | 能上 GPU，目前主流 |
| WebGPU 游戏 | WebGPU | 新一代 3D 渲染 | 新一代标准，性能逼近原生 |
| 原生小程序渲染 | Canvas/WebGL 子集 | 微信/抖音小游戏 | 环境受限，需按平台裁剪 |

### 2. 按分发渠道划分

- **网页即玩（Web）**：PC 浏览器打开即玩，如各类 `.io` 游戏、3D 试玩、赛车 Demo。
- **H5 小游戏（嵌于 APP）**：微信、抖音、QQ 等宿主内的游戏，通过内置 WebView 或专用 JS 环境运行。
- **小程序小游戏**：不是普通 H5，而是运行在宿主提供的小游戏运行时中（如微信小游戏基于开放的 Canvas/WebGL 能力）。

### 3. 游戏引擎 vs 游戏框架

| 概念 | 说明 | 例子 |
| --- | --- | --- |
| 渲染引擎 | 只负责"把画面画出来" | PIXI.js、Three.js |
| 游戏框架 | 在渲染之上再加场景管理、输入、音频、物理等 | Phaser、Cocos、LayaAir |
| 游戏引擎 | 一体化工具链，含编辑器、资源管线、跨端打包 | Cocos Creator、Unity（可导出 Web） |

> 一句话区分：**PIXI/Three 是"画笔"，Phaser/Cocos 是"完整的游戏工作室"**。项目规模小选画笔，规模大选工作室。

## 二、游戏引擎概览与选型

### 1. 主流 2D 引擎

**PIXI.js**：高性能 2D WebGL 渲染引擎，聚焦"渲染管线"本身，专注、轻量、组件式（Container/Sprite）。适合做自定义游戏逻辑 + 引擎渲染的组合方案。

```js
import { Application, Sprite } from "pixi.js";

const app = new Application();
await app.init({ width: 800, height: 600 });
document.body.appendChild(app.canvas);

const sprite = Sprite.from("hero.png");
sprite.x = 100; sprite.y = 100;
app.stage.addChild(sprite);
```

**Phaser**：完整 2D 游戏框架，内置场景系统、物理（Arcade/Matter）、动画、音频、粒子，API 开箱即用，是学习 2D 游戏概念的绝佳入门。

```js
class MainScene extends Phaser.Scene {
  preload() { this.load.image("hero", "hero.png"); }
  create() { this.add.image(400, 300, "hero"); }
  update() { /* 每帧逻辑 */ }
}
new Phaser.Game({ type: Phaser.AUTO, width: 800, height: 600, scene: MainScene });
```

### 2. 主流 3D 引擎

**Three.js**：业界最流行的 WebGL 3D 库，场景图（场景/相机/渲染器/几何体/材质/灯光）模型清晰，生态庞大（GLTF 加载、后处理、布点矩阵），是 3D 学习的首选。

**Babylon.js**：功能更"引擎化"的 3D 框架，内置物理、GUI、动画编辑器、WebXR，自带的 inspector 调试器非常强大，适合工具链完善的项目。

| 维度 | Three.js | Babylon.js |
| --- | --- | --- |
| 定位 | 轻量 3D 库，灵活 | 完整 3D 游戏引擎 |
| 上手曲线 | 较低 | 中高 |
| 工具链 | 需自行搭建 | 自带 inspector/编辑器 |
| 后处理/物理 | 靠生态扩展 | 内置集成 |
| 社区 | 最大，教程海量 | 官方文档完善 |

### 3. 国产跨端引擎

**Cocos Creator / Laya / Egret**：主打"一次开发、多端发布"，可一键导出到 Web、微信小游戏、抖音小游戏、原生 App，是国产 H5 小游戏团队的主力。

### 4. 选型决策表

| 场景 | 推荐引擎 |
| --- | --- |
| 纯 2D 精灵、粒子、UI 混合 | PIXI.js |
| 2D 游戏含物理/场景/动画，快速开发 | Phaser |
| 3D 展示、可视化、Web 3D 游戏 | Three.js |
| 复杂 3D 游戏、需要引擎级工具链 | Babylon.js |
| 需要多端发布（含小游戏） | Cocos / Laya |

## 三、游戏主循环（Game Loop）原理

### 1. 什么是游戏主循环

一切实时游戏都是同一套骨架：**每帧"更新状态 + 渲染画面"，循环往复**。这个"update + render"无限循环就叫主循环。

```js
while (true) {
  update();  // 更新逻辑：移动、检测碰撞、AI、计分
  render();  // 渲染画面
}
```

浏览器里没有原生 `while(true)` 主导的同步循环（会卡死页面），所以必须借助 **`requestAnimationFrame`（rAF）**——浏览器在每一帧刷新前回调一次，天然与屏幕刷新率同步。

```js
let last = 0;
function gameLoop(timestamp) {
  const dt = timestamp - last;   // 本帧距上一帧的毫秒数
  last = timestamp;

  update(dt);                    // 逻辑更新
  render();                      // 渲染

  requestAnimationFrame(gameLoop); // 请求下一帧
}
requestAnimationFrame(gameLoop);
```

### 2. rAF 为什么比 setInterval 好

| 维度 | `setInterval(fn, 16)` | `requestAnimationFrame` |
| --- | --- | --- |
| 触发时机 | 定时触发，可能挤在两次绘制之间 | 跟随屏幕刷新，刚好在绘制前 |
| 掉帧 | 可能积压回调、出现卡顿 | 自动丢弃已过时的帧 |
| 页面隐藏 | 继续跑，浪费资源 | 自动暂停，省电 |
| 时间精度 | 手动算时间，容易漂移 | 回调自带高精度时间戳 |

### 3. deltaTime（帧间隔）与恒定速度

**固定 FPS vs 帧间隔**：不能假设每帧都是 16.67ms。如果一帧耗时 30ms，"每帧移动 10px"就会忽快忽慢。正确做法是**用 `dt`（deltaTime）缩放位移**，让速度与帧率解耦。

```js
const SPEED = 300; // 每秒移动 300px

// 错误：依赖帧率，60fps 与 30fps 速度不同
sprite.x += 10;

// 正确：按时间缩放（dt 单位毫秒，除以 1000 转成秒）
sprite.x += (SPEED * dt) / 1000;
```

### 4. 固定步长（fixed timestep）物理

用真实 `dt` 直接跑物理会有累积误差。严谨的物理引擎常采用**固定步长**：把时间切成一格一格的固定长度（如 1/60s），用累加器累积真实时间，达到一个固定步长就更新一次物理。这样物理行为与帧率完全无关，且可复现。

```js
const FIXED_STEP = 1000 / 60; // 每 1/60 秒更新一次物理
let accumulator = 0;

function fixedUpdate(dt) {
  accumulator += dt;
  while (accumulator >= FIXED_STEP) {
    physics.step(FIXED_STEP); // 固定步长更新物理
    accumulator -= FIXED_STEP;
  }
}
```

### 5. update 与 render 分离

主循环最关键的设计是**把"逻辑"和"绘制"分离**：

- `update`：纯计算，不改 DOM，可用固定步长，可回放、可暂停、可倍速。
- `render`：只负责把状态画出来，可能被优化（如只在状态变化时渲染）。
- 两者的解耦让"网络同步"、"断点快照"、"时间缩放（慢动作）"都变得容易。

## 四、H5 小游戏与小程序游戏

### 1. H5 小游戏是什么

狭义的"H5 小游戏"指运行在**宿主 APP 内置 WebView** 里的网页游戏，本质还是普通 Web 页面，加载页面 + 跑 Canvas/WebGL。优点是与网页几乎无差别，缺点是受 WebView 性能限制、加载偏慢。

### 2. 小程序（小游戏）是什么

微信/抖音等企鹅系平台提供**小游戏运行时**，不完全是浏览器：它向开发者开放了 `wx` / `tt` 全局 API、一个 `canvas`、WebGL 上下文，但没有完整 DOM。所以小游戏的适配核心是**"不能碰 DOM，只能用宿主提供的 Canvas/WebGL"**。多数引擎（PIXI、Cocos）都有专门的小游戏适配层。

```js
// 微信小游戏入口（微差异，无 DOM）
GameGlobal.canvas;                   // 宿主提供的唯一画布
const gl = GameGlobal.canvas.getContext("webgl");
```

### 3. H5 vs 小程序小游戏 对比

| 维度 | H5 小游戏 | 小程序小游戏 |
| --- | --- | --- |
| 运行环境 | APP 内 WebView（近似浏览器） | 宿主小游戏运行时 |
| DOM | 有 | 无，仅 Canvas/WebGL |
| 分享/社交 | 依赖 URL 分享 | 原生拉起好友、排行榜、分享卡片 |
| 支付 | 走网页支付/H5 支付 | 原生虚拟支付 |
| 下载安装 | 无，即开即玩 | 无，即开即玩 |
| 审核 | 基本无边界控制 | 需平台审核、有内容规范 |

## 五、Web 容器的能力边界

Web 作为游戏运行环境，能给我们什么、不能给我们什么：

| 能力类别 | 可用的 API / 现状 |
| --- | --- |
| 渲染 | Canvas 2D、WebGL 1/2、WebGPU（逐步普及） |
| 音频 | WebAudio（合成、音效），但音乐版权与延迟需注意 |
| 输入 | 键盘、鼠标、触摸、Gamepad API（手柄） |
| 存储 | localStorage / IndexedDB（存档、离线资源缓存） |
| 网络 | fetch / WebSocket（多人联机、竞技排位） |
| 性能 | 多线程可用 `Worker`，但渲染必须走主线程 |
| 加密 | 前端代码天然暴露，反外挂需服务端校验 |
| 硬件访问 | 有限，无原生文件系统、无原生下载安装 |

> **核心认知**：Web 游戏的最大优势是"免安装、跨端、易分享"，最大短板是"性能上限、包体控制、代码可见、硬件能力受限"。工程化的重点就是扬长避短——用精良的加载优化、资源管理与渲染优化逼近原生体验。

## 六、从零搭一个最简主循环（综合示例）

```js
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

// 玩家坦克
const player = { x: W / 2, y: H - 60, w: 40, h: 30, speed: 240 };
const keys = new Set();
window.addEventListener("keydown", e => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));

let last = performance.now();

function update(dt) {
  const d = dt / 1000; // 秒
  if (keys.has("a") || keys.has("arrowleft"))  player.x -= player.speed * d;
  if (keys.has("d") || keys.has("arrowright")) player.x += player.speed * d;
  player.x = Math.max(0, Math.min(W - player.w, player.x)); // 边界
}

function render() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#2d6a4f";
  ctx.fillRect(player.x, player.y, player.w, player.h); // 坦克
}

function gameLoop(now) {
  const dt = now - last;
  last = now;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
```

## 最小实现：手写主循环，让方块动起来

到 `code/frontend/17-game` 打开 `game-loop.html`：用原生 `requestAnimationFrame` 手写主循环，驱动一个方块匀速移动并在边界反弹，帧间隔用 `deltaTime` 换算成秒后乘速度，保证快慢帧下速度一致。原理一句话：每帧把 `requestAnimationFrame` 回调自带的高精度时间戳相减得到 `dt`，位移 = 速度 × 秒，于是速度就和帧率解耦了。

## 面试衔接

本节对应 `90-附录-面试体系` 的「游戏与新兴方向」板块（129-135）：Web 游戏方案、主循环与 rAF、性能优化等真题。做自测后进入下一节 `02-2D游戏与PixiJS`。

## 小结

- Web 游戏按渲染分 DOM / Canvas 2D / WebGL / WebGPU，按渠道分为网页即玩、H5 小游戏、小程序小游戏。
- 渲染引擎（PIXI/Three）只负责画，游戏框架/引擎（Phaser/Cocos）提供完整游戏工作流。
- 所有实时游戏的心脏是**主循环**：`update + render` 借助 `requestAnimationFrame` 驱动。
- 用 **deltaTime** 统一速度、用**固定步长**保证物理稳定，把逻辑与渲染解耦是进阶关键。
- H5 小游戏本质是 WebView 中运行的网页游戏；小程序小游戏则运行在无 DOM 的宿主运行时。