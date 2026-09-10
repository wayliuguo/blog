# 3D 游戏与 Three.js

> 级别：中级 → 高级

按本书四层推进——属进阶：入门 Three.js 场景图五大件；进阶到网格变换、相机光照、GLTF 加载、射线拾取与 3D 动画；实战与最小实现用 `code/frontend/17-game` 的 `game-loop.html` 回看 3D 主循环的最小骨架——Three.js 只是把 `render()` 换成 `renderer.render(scene, camera)`，原理本层自足。

2D 说完，来到天花板更高的 3D。Three.js 是 Web 上最流行的 WebGL 3D 库，它把复杂的着色器、矩阵、相机数学封装成"场景 / 相机 / 渲染器 / 灯光 / 几何体 / 材质"这样一套清晰的对象模型。学会 Three.js，你不仅能做 3D 展示，也能搭建可玩的 3D 小游戏原型。

这一章我们从场景图的基础开始，逐步覆盖网格与变换、GLTF 模型加载、交互与射线检测（Raycaster）、3D 动画，最后给出小游戏项目实际的落地建议。所有示例都保持简洁可运行。

## 一、Three.js 场景图基础

### 1. 五大核心对象

Three.js 的灵魂是一个**场景图**，核心成员如下：

| 对象 | 作用 |
| --- | --- |
| `Scene` | 世界的根容器，包含所有物体、灯光、辅助物 |
| `Camera` | 决定"从哪个视角看世界"，常见 `PerspectiveCamera` |
| `Renderer` | 把场景渲染到 `<canvas>`，如 `WebGLRenderer` |
| `Mesh` | 网格 = 几何体 + 材质，是"看得见的物体" |
| `Light` | 光源，决定物体明暗 |

```js
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// 1. 场景
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// 2. 相机（透视相机：视角、宽高比、近裁剪、远裁剪）
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 3, 8);
camera.lookAt(0, 0, 0);

// 3. 渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制大屏采样
document.body.appendChild(renderer.domElement);
```

### 2. 主循环与渲染

跟 2D 一样用 rAF 驱动，持续渲染：

```js
function animate() {
  requestAnimationFrame(animate);
  // 每帧更新物体/控制器/动画
  controls.update();
  renderer.render(scene, camera);
}
animate();
```

## 二、网格（Mesh）与变换

### 1. 几何体 + 材质 = 网格

`Mesh(geometry, material)` 把"形状"和"表面外观"拼成一个物体：

```js
// 几何体：立方体
const geometry = new THREE.BoxGeometry(1, 1, 1);
// 材质：标准材质（受光照影响）
const material = new THREE.MeshStandardMaterial({ color: 0x4a90d9, roughness: 0.4 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// 常用几何体
new THREE.SphereGeometry(radius, segmentsW, segmentsH); // 球
new THREE.PlaneGeometry(w, h);                           // 平面
new THREE.CylinderGeometry(topR, bottomR, h, segments);  // 圆柱
new THREE.BoxGeometry(w, h, d);                          // 立方体
```

### 2. 变换：位置 / 旋转 / 缩放

每个 `Object3D`（Scene、Camera、Mesh 的基类）都有 `position`、`rotation`（弧度）、`scale`、`quaternion`：

```js
cube.position.set(2, 1, 0);        // 位置
cube.rotation.x = Math.PI / 4;     // 绕 X 轴转 45°
cube.rotation.y += 0.01;           // 每帧自转
cube.scale.set(1.5, 1.5, 1.5);     // 缩放
```

> **单位**：Three.js 以米为直觉单位，但实际任意；**角度用弧度**（`Math.PI` = 180°）。父子变换与 2D 的舞台树同理——子物体相对父物体的局部坐标系变换。

`Object3D` 都通过 `.add()` 挂到父节点，摄像机也可以挂到某个"出场跟随"节点上。

## 三、相机、灯光与材质

### 1. 两种相机

| 相机 | 说明 | 适用 |
| --- | --- | --- |
| `PerspectiveCamera` | 透视投影，近大远小 | 第一/第三人称视角，近风景 |
| `OrthographicCamera` | 正交投影，无透视 | RTS/棋类游戏、等距视角 |

```js
// 正交相机：left/right/top/bottom/near/far 设定一个"视锥盒"
const ortho = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
```

### 2. 灯光类型

| 灯光 | 特点 |
| --- | --- |
| `AmbientLight` | 全局环境光，无方向，把阴影打亮 |
| `DirectionalLight` | 平行光（如太阳），无衰减，适合模拟日光 |
| `PointLight` | 点光源，从一点向四周衰减（灯泡） |
| `SpotLight` | 聚光灯，带角度与锥体（手电） |

```js
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(10, 20, 5);
scene.add(sun);
```

### 3. 常见材质

| 材质 | 特点 | 受光 |
| --- | --- | --- |
| `MeshBasicMaterial` | 纯色，不看光 | 否 |
| `MeshLambertMaterial` | 传统漫反射，性能好 | 部分 |
| `MeshStandardMaterial` | 基于物理（PBR），金属/粗糙度 | 是 |
| `MeshPhysicalMaterial` | PBR 增强，透光/清漆 | 是 |
| `MeshNormalMaterial` | 法线可视化，调试用 | 否 |

## 四、GLTF 模型加载

### 1. GLTF 是什么

**GLTF**（glTF 2.0）是 3D 领域的"JPEG"——业界标准交换格式，支持嵌入材质、纹理、骨架、动画。Three.js 用 `GLTFLoader` 加载 `.gltf` / `.glb`（.glb 是二进制，推荐）：

```js
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
loader.load("model/robot.glb", (gltf) => {
  const model = gltf.scene;          // 根节点
  scene.add(model);
}, undefined, (error) => {
  console.error("加载失败", error);
});
```

### 2. 遍历与获取内部对象

模型内部通常有多层嵌套，用 `.getObjectByName()` 或递归遍历取组件：

```js
const body = gltf.scene.getObjectByName("Body");   // 取名为 Body 的子节点
body.material.color.set(0xff0000);                  // 改材质颜色
```

### 3. 压缩与优化

- 用 **Draco/Gltf 压缩** 显著减小体积：`DRACOLoader` + `KHR_mesh_compression`。
- 用 **instance / lods** 减少顶点与 draw call。
- 大模型用 `.glb`，配合 `meshopt` 进一步压缩。

## 五、交互与射线检测（Raycaster）

### 1. Raycaster 原理

点击屏幕时，3D 中没有一个"坐标"是直观的：屏幕是 2D。做法是**从相机位置朝点击方向发射一条射线**，检测它与哪些三角形相交，命中首个物体即"被点中"。

```js
import * as THREE from "three";

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerMove(event) {
  // 屏幕坐标(像素) -> 归一化设备坐标 NDC，范围 [-1, 1]
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function pick() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickableList); // 按名称/标签收集可点物体
  if (hits.length > 0) {
    const hit = hits[0].object;
    console.log("点中了:", hit.name, "距离:", hits[0].distance);
  }
}
window.addEventListener("pointerdown", () => {
  onPointerMove(event);
  pick();
});
```

### 2. 射线检测的用途

- **拾取交互**：点击选中/攻击敌人。
- **视线预判**：判断相机前方是否有遮挡（视线检测）。
- **物理拾取**：抓取物体、拖拽。
- **地形拾取**：点击地面计算落点。

> 优化：射线检测是按三角形计算的，模型面数多会慢。可用**包围盒先粗筛**（`Mesh` 自动内置 `boundingBox`），或把可拾取物体放进一个较小的数组，而不是整棵场景树。

## 六、3D 动画

### 1. 骨架动画（SKinnedMesh）

GLTF 模型自带的骨骼动画用 `AnimationMixer` 播放：

```js
import { AnimationMixer } from "three";

const mixer = new AnimationMixer(gltf.scene);
const idle = mixer.clipAction(gltf.animations.find(c => c.name === "idle"));
const run  = mixer.clipAction(gltf.animations.find(c => c.name === "run"));
idle.play();

function animate(dt) {
  mixer.update(dt);   // 推进动画时钟
}
```

切换动作时 `crossFadeTo` 平滑过渡，避免突跳：

```js
run.reset(); run.crossFadeTo(run, 0.3, true); run.play();
```

### 2. 程序化动画

不靠美术导出的骨骼，直接用代码驱动物体变换做"程序动画"：

```js
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  player.position.x = Math.sin(t) * 3;   // 来回摆动
  player.position.y = Math.abs(Math.cos(t)) + 0.5; // 跳跃感
  player.rotation.y = t;                 // 自转
  renderer.render(scene, camera);
}
```

## 七、小游戏项目落地提示

1. **先规划坐标与单位**：划分世界尺度，确定 1 单位代表多少米，避免坐标爆炸。
2. **资源管线**：美术输出 .glb + 图集，用构建脚本压缩（Draco/meshopt），打进包或 CDN。
3. **性能预算**：估算面数、材质数量、光源数量、draw call 预算，超预算才上 LOD / instance / 合批。
4. **主循环与物理**：3D 也保留 update/render 分离 + 固定步长；碰撞用引擎内置或物理引擎（下一章）。
5. **移动端适配**：`setPixelRatio` 上限 2、按设备降级阴影/后处理、`resize` 时重建相机宽高比。
6. **预加载 + 加载页**：用 GLTFLoader 的 `onProgress` 显示进度条，Skeleton 转美丽加载界面。

## 小结

- 场景图五大件：**Scene / Camera / Renderer / Mesh / Light**，Mesh = 几何体 + 材质。
- `Object3D` 提供 `position / rotation / scale`，父子关系共享局部坐标系。
- 相机分透视/正交，光源分环境/平行/点/聚光，材质分基础/朗伯/标准 PBR 等。
- 用 **GLTFLoader** 加载 .glb 模型，配合压缩与优化控制体积。
- **Raycaster** 把屏幕点击转成 3D 射线做拾取与视线检测。
- 动画有**骨架动画（mixer）** 与**程序动画**两种，落地记住性能预算与移动端降级。

## 最小实现：看 3D 主循环的最小骨架

3D 的渲染循环与 2D 同源。到 `code/frontend/17-game` 打开 `game-loop.html`，它用原生 Canvas 演示同一套"rAF 更新 + 渲染"，你在 Three.js 里只是把 `render()` 换成 `renderer.render(scene, camera)`。原理一句话：无论 2D 还是 3D，主循环骨架都是"更新状态 → 渲染画面 → 请求下一帧"，引擎只是替你封装了绘制与场景管理的细节。

## 面试衔接

本节对应 `90-附录-面试体系` 的「游戏与新兴方向」板块（129-135）：WebGL/Three.js 渲染方案与射线拾取等真题。做自测后进入下一节 `04-游戏物理引擎`。

## 附录：常用代码速查

```js
// 随窗口自适应
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 网格辅助（调试看坐标轴与地面）
scene.add(new THREE.AxesHelper(5));
scene.add(new THREE.GridHelper(10, 10));