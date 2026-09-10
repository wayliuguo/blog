# 2D 游戏与 PixiJS

> 级别：中级 → 高级

按本书四层推进——本章向上承接 01 的主循环，属进阶：入门到 PixiJS 的渲染管线与舞台树；进阶到精灵表、逐帧动画与 AABB 碰撞；实战与最小实现见 `code/frontend/17-game` 的 `sprite-anim.html`（逐帧精灵动画）与 `minigame.html`（可玩小游戏），用原生 Canvas 等价演示"精灵切帧 + 碰撞计分"，原理自足是本层的核心目标。

2D 游戏是 Web 游戏最大的盘子，而 PixiJS 是其中最"纯粹"的高性能渲染引擎——它不绑定你的游戏逻辑，只把"把东西高效画到屏幕上"这件事做到极致。理解 PixiJS 的渲染管线，你就理解了所有基于 WebGL 的 2D 引擎（Phaser、Cocos 的渲染层多多少少借鉴了它）。

这一章我们从 PixiJS 的渲染管线（WebGL / Canvas / WebGPU 回退与升级）讲起，深入舞台（Stage）与显示对象（DisplayObject）、Sprite 与纹理、滤镜、游戏对象管理、输入与碰撞基础，最后到精灵表（Spritesheet）与逐帧动画。每一个点都用能直接跑起来的代码支撑。

## 一、PixiJS 渲染管线

### 1. 渲染后端：WebGL / Canvas / WebGPU

PixiJS v8 的渲染架构是"按能力自动选择后端"：

| 后端 | 优先级 | 说明 |
| --- | --- | --- |
| WebGPU | 高 | 新一代 GPU API，性能与功能更强，桌面 Chrome 已支持 |
| WebGL 2.0 | 中 | 当前主流移动/桌面最稳的组合 |
| WebGL 1.0 | 低 | 老设备回退 |
| Canvas 2D | 兜底 | 设备不支 WebGL 时用软件绘制 |

```js
import { Application } from "pixi.js";

const app = new Application();
await app.init({
  width: 800,
  height: 600,
  antialias: true,   // 抗锯齿
  autoDensity: true, // 自动适配 DPR
  resolution: window.devicePixelRatio || 1, // 高清屏适配
});
document.body.appendChild(app.canvas);
```

看全局把渲染后端选成了谁：

```js
console.log(app.renderer);      // WebGLRenderer / WebGPURenderer
console.log(app.renderer.type ?? "webgl");
```

### 2. 渲染管线的工作阶段

WebGL 下，一帧渲染大致经历：**清屏 → 遍历舞台树 → 为每个显示对象提交绘制指令 → GPU 光栅化 → 输出到画布**。PixiJS 帮你隐藏了 shader、buffer、uniform 等大量细节。

- **顶点阶段**：把每个 Sprite 的四角顶点 + 纹理坐标交给 GPU。
- **片元阶段**：采样纹理颜色，叠加 blend、滤镜、alpha。
- **合批优化**：PixiJS 自动把使用同一纹理的相邻 Sprite 合并成一次 `drawCall`。

## 二、舞台（Stage）与显示对象

### 1. 舞台树（Scene Graph）

PixiJS 用一棵**显示对象树**组织游戏内容。根是 `Application.stage`（一个 `Container`），所有可见对象都挂在这棵树上，靠 `x/y` 与父容器决定最终位置。

```
Stage (Container)
├── Background (Sprite)
├── Player (Container)
│   ├── Body (Sprite)
│   └── Gun (Sprite，相对 Player 定位)
└── Bullets (Container)
    └── bullet_1 / bullet_2 ... (Sprite)
```

### 2. Container、Sprite 与继承

- **Container**：只负责组织/变换（position、rotation、scale、alpha），本身不绘制。
- **Sprite**：Container 的升级版，能显示一张纹理。
- 其他显示对象：`Graphics`（画矢量）、`Text`（文字）、`TilingSprite`（平铺）、`AnimatedSprite`（逐帧）。

```js
import { Container, Sprite, Graphics, Text } from "pixi.js";

const app = new Application();
await app.init({ width: 800, height: 600 });
document.body.appendChild(app.canvas);

// 用容器把"坦克"的多个部件组合
const tank = new Container();
tank.x = 200; tank.y = 300;

const hull = Sprite.from("tank_body.png");
const turret = Sprite.from("tank_turret.png");
turret.position.set(40, 20);      // 相对 tank 的局部坐标
tank.addChild(hull, turret);

// 画一个红色矢量矩形
const g = new Graphics().rect(0, 0, 100, 60).fill(0xff0000);

// 文字
const label = new Text({ text: "HP: 100", style: { fontSize: 24, fill: 0xffffff } });

app.stage.addChild(tank, g, label);
```

### 3. 局部坐标与世界坐标

容器挂子节点后，子节点的 `x/y` 是**相对父容器**的（局部坐标），最终屏幕上位置由整条父链的变换叠加得到。用 `toGlobal()` 把局部坐标转屏幕：

```js
const worldPos = turret.toGlobal(new Point(0, 0));
console.log("屏幕坐标:", worldPos.x, worldPos.y);
```

## 三、Sprite 与 Texture

### 1. Texture 与缓存

**Texture** 是"一张可被 GPU 使用的图像数据"。PixiJS 有**全局纹理缓存**，同名资源只加载一次，`Sprite.from` 在内部查缓存，显著省内存。

```js
import { Assets, Sprite, Texture } from "pixi.js";

// 异步加载 + 自动入缓存
const texture = await Assets.load("player.png");
const sprite = Sprite.from("player.png"); // 复用缓存，不再重复加载
```

### 2. 纹理的九宫格（9-slice）

UI 用九宫格纹理，保证圆角窗口在拉伸时不变形：

```js
import { Texture, NineSliceSprite } from "pixi.js";

const tex = await Assets.load("panel.png");
const panel = new NineSliceSprite({ texture: tex, width: 300, height: 200 });
// 指定边框宽度（画布四边各 40px 不拉伸，中间区域拉伸）
await panel.initNineSlice({ defaultWidth: 40, defaultHeight: 40 });
app.stage.addChild(panel);
```

### 3. 滤镜（Filter）

滤镜在 GPU 上对精灵做后处理。PixiJS 内置常用滤镜，并可用 shader 自定义：

```js
import { BloomFilter } from "@pixi/filter-bloom";
import { OutlineFilter } from "@pixi/filter-outline";

const effect = new BloomFilter({ strength: 0.8 });
sprite.filters = [effect];               // 给精灵加辉光
enemy.filters = [new OutlineFilter(2, 0xff0000)]; // 敌人红色描边
```

> 滤镜会打断合批、额外耗时，尽量只给"需要"的对象加，避免全屏大量滤镜。

## 四、游戏对象管理与更新

### 1. 用类封装游戏对象

为了让坦克、子弹、敌人有各自的逻辑，通常继承 `Container` 或 `Sprite`，把行为封装进对象内部，并在主循环里遍历更新：

```js
class Bullet extends Sprite {
  constructor(texture, vx, vy) {
    super(texture);
    this.vx = vx; this.vy = vy;
    this.active = true;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y < -50) this.active = false; // 出屏标记回收
  }
}

const bullets = new Container();
app.stage.addChild(bullets);

// 主循环（挂在 Application.ticker 上，每帧回调）
app.ticker.add((ticker) => {
  const dt = ticker.deltaMS / 1000; // 秒
  for (const b of bullets.children) b.update(dt);
  removeDead(bullets);              // 惰性移除 inactive
});
```

### 2. 对象生命周期管理

成熟项目用**对象池**减少 GC 压力：

```js
class BulletPool {
  static pool = [];
  static get(texture) { return this.pool.pop() ?? new Bullet(texture, 0, -300); }
  static release(b) { b.active = false; this.pool.push(b); }
}
// 发射：取用复用；死亡：释放回池
const b = BulletPool.get(tex); bullets.addChild(b);
// ... b.active === false 时 BulletPool.release(b)
```

## 五、输入与碰撞基础

### 1. 键盘 / 鼠标 / 触摸输入

不与画面绑定点直接挂钩，PixiJS 推荐监听全局事件，坐标统一转到世界坐标：

```js
window.addEventListener("keydown", e => keys.add(e.code));
window.addEventListener("keyup", e => keys.delete(e.code));

// 鼠标/触摸统一事件
app.stage.eventMode = "static";      // 开启交互
app.stage.on("pointerdown", (e) => {
  const { x, y } = e.global;         // 屏幕坐标
  player.moveTo(x, y);
});
```

### 2. AABB 碰撞检测

游戏最常见的碰撞是**轴对齐包围盒 AABB**——用"两个矩形的四条边界是否相交"判断，性能极高：

```js
function rectsOverlap(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

// 子弹 vs 敌人
const enemyBox = { x: e.x, y: e.y, width: e.w, height: e.h };
if (rectsOverlap(bulletBox, enemyBox)) {
  e.hp -= 1;
  bullet.active = false;   // 命中即回收子弹
}
```

> 进阶：圆与圆用 `中心距 < 半径之和`；圆与 AABB、圆形精灵用圆形碰撞更贴合；复杂凸多边形可交给物理引擎（见第 4 章）。

### 3. 空间索引提升大规模碰撞性能

上千个对象两两检测是 `O(n²)`。用**格子碰撞 / 四叉树**把对象分到空间桶里，只检测邻近桶，复杂度降到近线性。这是粒子子弹海、大量敌人的必备优化。

```js
// 概念：把世界分成格子，objects 只记录自己所在的格
function indexObject(o) {
  const gx = Math.floor(o.x / CELL), gy = Math.floor(o.y / CELL);
  grid[gy][gx].push(o); // 每格一个数组
}
// 检测时只遍历 o 所在格及其相邻 8 格的对象
```

## 六、精灵表（Spritesheet）与动画

### 1. 什么是精灵表

**精灵表（Texture Atlas / Spritesheet）** 把大量小图合并成一张大图 + 一个描述"每张小图在哪"的 JSON 元数据。好处：**合并后只产生很少的纹理**，GPU 合批率上升、drawCall 骤降，加载也只剩一次请求。

一个典型 spritesheet JSON（PixiJS v8 使用 `TexturePacker` 或 `spritesheet-js` 生成）：

```json
{
  "meta": { "image": "atlas.png", "scale": "1" },
  "frames": {
    "walk_0": { "frame": { "x": 0,   "y": 0, "w": 64, "h": 64 } },
    "walk_1": { "frame": { "x": 64,  "y": 0, "w": 64, "h": 64 } },
    "walk_2": { "frame": { "x": 128, "y": 0, "w": 64, "h": 64 } }
  },
  "animations": {
    "walk": ["walk_0", "walk_1", "walk_2"]
  }
}
```

### 2. 加载精灵表与 AnimatedSprite

```js
import { Assets, AnimatedSprite } from "pixi.js";

// v8 用 Assets 加载 atlas，会自动解析 animations
const atlas = await Assets.load("player.json");

const anim = new AnimatedSprite(atlas.animations.walk);
anim.animationSpeed = 0.15;          // 播放速度
anim.play();
anim.x = 200; anim.y = 300;
app.stage.addChild(anim);
```

切换"朝向"或"状态"时，只需换到另一组动画帧序列：

```js
function setState(player, state) {
  player.textures = atlas.animations[state]; // 如 "walk" / "idle" / "jump"
  player.play();
}
```

### 3. 程序动画（Ticker 驱动的补间）

除了逐帧精灵，还常用**补间动画**让对象平滑移动/缩放/旋转。PixiJS 内置 `ticker`，可手写简易补间或用 Tween 库：

```js
let t = 0;
app.ticker.add(() => {
  t = (t + 0.02) % 1;
  const ease = 1 - (1 - t) * (1 - t);  // easeOutQuad
  sprite.x = 100 + ease * 500;          // 从 100 平滑滑到 600
});
```

## 七、PixiJS 与其他 2D 方案的选型

| 方案 | 定位 | 何时选 |
| --- | --- | --- |
| 原生 Canvas 2D | 简单、零依赖 | 极简游戏、快速 Demo |
| PixiJS | 高性能渲染引擎，逻辑自建 | 2D 内容量大、要极致渲染 |
| Phaser | 完整 2D 框架 | 2D 游戏，不想自己搭场景/物理/音频 |
| Cocos/Laya | 多端小游戏引擎 | 要发布到微信/抖音小游戏 & 多端 |

## 小结

- PixiJS v8 自动在 **WebGPU / WebGL 2 / WebGL 1 / Canvas** 间选择渲染后端。
- 游戏内容组织在 **舞台树（Scene Graph）** 上，`Container` 组合、`Sprite` 展示、`Graphics/Text` 辅助。
- **Texture** 有全局缓存；滤镜在不破坏合批的前提下给对象加效果。
- 用**类封装** + **对象池**管理子弹/敌人等高频对象，降低 GC。
- **AABB 碰撞**是性价比最高的碰撞，大规模对象用**空间索引**提速。
- **精灵表**合并纹理 + **AnimatedSprite** 实现高性能逐帧动画。

## 最小实现：用原生 Canvas 模拟精灵切帧

到 `code/frontend/17-game` 打开 `sprite-anim.html`：不用任何库，用 Canvas 画几个角色帧，按"帧率计数器"切帧循环播放，等价于 PixiJS `AnimatedSprite` 所做的事。原理一句话：精灵动画就是"按时间在若干张子图之间切换"——一张精灵表里存多帧，用累加的计数器决定当前该显示哪一帧，从而控制播放速度与帧率。

## 面试衔接

本节对应 `90-附录-面试体系` 的「游戏与新兴方向」板块（129-135）：2D 渲染方案、精灵表与主循环等真题。做自测后进入下一节 `03-3D游戏与Three.js`。