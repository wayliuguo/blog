# WebGL 与 Three.js

> 级别：高级

按本书四层推进：

- **入门使用**：会用 Three.js 的 `Scene / PerspectiveCamera / WebGLRenderer` 三大件摆出并转动一个立方体；
- **进阶**：理解 WebGL 管线与顶点/片元着色器分工，掌握几何体、材质、灯光与 `requestAnimationFrame` 渲染循环；
- **实战**：加载 GLTF 模型、接入 OrbitControls 交互，做减少 draw call 与防止显存泄漏的 3D 性能优化；
- **最小实现掌握原理**：到 `code/frontend/10-visualize` 运行 `webgl-triangle.html`，用原生 WebGL（无任何库）画一个旋转三角形，亲手体会着色器如何工作。

前面两篇文章搞定了 2D 图表；当需要**3D 场景、海量粒子、真实光照、游戏/数字孪生/3D 大屏**时，Canvas 2D 与 SVG 都有心无力。这时的主角是 **WebGL**——一个直接把"绘制指令交给 GPU"的底层光辉器（rasterizer）接口。但裸写 WebGL 极其繁琐，工程上几乎都会用 **Three.js** 这类封装库。掌握了 WebGL 的管线原理 + Three.js 的"场景/相机/渲染器"三大件，你才能在生产里写出既丰富又流畅的 3D 效果。

这篇文章先讲清 WebGL 是什么、Shader（着色器）如何工作、GPU 管线；然后带你走完 Three.js 的核心体系（场景、相机、渲染器、几何体、材质、灯光、动画），最后给出 3D 渲染的性能优化实战。

## 一、WebGL 原理

### 1. 什么是 WebGL

WebGL 是一个基于 OpenGL ES 的 **JavaScript API**，允许网页直接调用 GPU 进行 2D/3D 渲染。它不是 DOM，也没有"画矩形"这种高级 API——你喂给它**顶点数据**，写**着色器（shader）**，GPU 按管线逐像素渲染。

```html
<canvas id="gl" width="512" height="512"></canvas>
```

```js
const canvas = document.getElementById("gl");
const gl = canvas.getContext("webgl"); // 或 "webgl2"
if (!gl) console.log("你的浏览器或环境不支持 WebGL");
```

> 一句话：**WebGL 是"JS 写给 GPU 的并行指令集"**。它适合海量定点、逐帧高帧率的场景，这正是 Canvas 2D 的短板。

### 2. GPU 渲染管线（图形流水线）

绘制任何东西都要走这条管线，理解它是看懂 Shader 的前提：

```
顶点数据(Vertex) → 顶点着色器(Vertex Shader) → 图元装配/光栅化(Rasterize)
                → 片元着色器(Fragment Shader) → 逐像素输出(Framebuffer)
```

- **顶点着色器**：对每个顶点做坐标变换（模型/视图/投影），输出裁剪坐标。
- **图元与光栅化**：把顶点连成点/线/三角形，再离散成屏幕上的"片元"（像素候选）。
- **片元着色器**：对每个片元计算最终颜色（含光照、纹理、透明度）。

## 二、着色器（Shader）基础

### 1. 从一段最小三角形说起

裸 WebGL 最常见的例子是"画一个三角形"，需要**两个着色器**：

```glsl
// ---- 顶点着色器 vertex shader ----
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
```

```glsl
// ---- 片元着色器 fragment shader ----
precision mediump float;
void main() {
  gl_FragColor = vec4(1.0, 0.4, 0.2, 1.0);
}
```

JS 侧编译、链接、喂数据：

```js
function compile(type, source) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  return sh;
}
const vs = compile(gl.VERTEX_SHADER, vertexSrc);
const fs = compile(gl.FRAGMENT_SHADER, fragmentSrc);

const program = gl.createProgram();
gl.attachShader(program, vs);
gl.attachShader(program, fs);
gl.linkProgram(program);
gl.useProgram(program);
```

### 2. WebGL 中的缓冲区（Buffer）

GPU 需要数组数据，但 JS 与 GPU 不共享内存，需把顶点数据放进 **`ArrayBuffer`（如 `Float32Array`）** 再上传到 **`VBO`**：

```js
const vertices = new Float32Array([0, 0, 1, 0, 0, 1]);

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// 告诉 GPU 如何解析这个 buffer 里的数据
const loc = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(loc);
gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

gl.drawArrays(gl.TRIANGLES, 0, 3);
```

> 可见裸 WebGL 的"上帝复杂"：编译着色器、创建 program、上传 buffer、绑定 attribute…… 这正是我们需要 **Three.js** 的原因。

## 三、Three.js 快速入门

### 1. 安装与三大件总览

Three.js 的核心抽象是 **Scene（场景）/ Camera（相机）/ Renderer（渲染器）**。渲染一次 = 把相机"拍摄"到的场景"印"到画布上。

```js
import * as THREE from "three";

// 1. 渲染器：把 GPU 画面画到 canvas
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 2. 场景：装下所有物体与光的"世界"
const scene = new THREE.Scene();

// 3. 相机：决定"从哪看、看多广"
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;
```

### 2. 绘制一个立方体

几何体（geometry）+ 材质（material）合成**网格（Mesh）**，放进场景，相机拍摄，渲染器输出：

```js
// 几何体：形状（顶点、面）
const geometry = new THREE.BoxGeometry(1, 1, 1);
// 材质：表面外观（颜色、光照响应）
const material = new THREE.MeshStandardMaterial({ color: 0x4a90d9 });
// 网格 = 几何体 + 材质
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
```

### 3. 渲染循环与动画

用 `requestAnimationFrame` 驱动逐帧渲染；这是 Three.js 动画的标准写法：

```js
function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.01;      // 每帧转一点，产生旋转
  cube.rotation.y += 0.01;
  renderer.render(scene, camera); // 一帧：场景+相机 → 画布
}
animate();
```

## 四、相机与坐标系

### 1. 投影相机

| 相机 | 用途 | 关键参数 |
| --- | --- | --- |
| `PerspectiveCamera` | 透视（近大远小），模拟人眼，最常用 | `fov, near, far, aspect` |
| `OrthographicCamera` | 正交（无透视），等尺寸，适合 2D/UI/俯视 | `left right top bottom near far` |

```js
// 透视相机：视场角 75°，宽高比取容器
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(3, 3, 3);
camera.lookAt(0, 0, 0);
```

### 2. 近裁面 / 远裁面

`near`、`far` 决定哪些物体被裁剪：太近、太远的物体不渲染。far 设过大且 Z-fighting 明显时，可调大 `near` 或调小 `far` 优化深度精度。

### 3. 坐标系

Three 使用**右手坐标系**：x 向右、y 向上、z 朝屏幕外。`camera.position.z = 5` 即"相机放在 z 轴正向 5 处往回看"。

## 五、几何体与材质

### 1. 常用几何体

| 几何体 | 说明 |
| --- | --- |
| `BoxGeometry` | 立方体 |
| `SphereGeometry` | 球体 |
| `CylinderGeometry` | 圆柱/圆锥 |
| `PlaneGeometry` | 平面（常做地面/UI 面板） |
| `ConeGeometry` | 圆锥 |
| `TorusGeometry` | 圆环 |
| `BufferGeometry` + `BufferAttribute` | 自定义顶点（进阶） |

### 2. 材质体系

| 材质 | 特点 |
| --- | --- |
| `MeshBasicMaterial` | 无光照，纯色/贴图，最省 |
| `MeshLambertMaterial` | 漫反射光照，较省 |
| `MeshPhongMaterial` | 漫反射+高光，经典 |
| `MeshStandardMaterial` | **PBR 物理渲染**，金属/粗糙度，效果好 |
| `MeshPhysicalMaterial` | 在标准上再加透明/清漆等 |

```js
const mat = new THREE.MeshStandardMaterial({
  color: 0xffa500,
  roughness: 0.4,   // 粗糙度
  metalness: 0.5,   // 金属感
});
```

## 六、灯光

没有光，`MeshStandardMaterial` 就是黑的（因为它要靠光才能算出颜色）。

| 灯 | 说明 |
| --- | --- |
| `AmbientLight` | 环境光，均匀照亮（无方向） |
| `DirectionalLight` | 平行光（模拟太阳），有方向 |
| `PointLight` | 点光源（灯泡），向四周辐射、随距离衰减 |
| `SpotLight` | 聚光灯（手电筒） |
| `RectAreaLight` | 面光源 |

```js
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(5, 10, 5);
scene.add(dir);
```

## 七、Three.js 工程化与进阶能力

### 1. 模型加载

真实项目常加载外部模型（GLTF/GLB 是 Web 的标准格式），用官方加载器：

```js
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
loader.load("/models/car.glb", (gltf) => {
  scene.add(gltf.scene);
});
```

### 2. 控件与交互

`OrbitControls` 让用户拖拽/缩放旋转视角，是 3D 看板标配：

```js
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;   // 惯性阻尼，操作更跟手
```

### 3. 纹理加载

`TextureLoader` 加载图片作为材质贴图：

```js
const tex = new THREE.TextureLoader().load("/assets/wood.jpg");
const mat = new THREE.MeshStandardMaterial({ map: tex });
```

## 八、3D 性能优化

### 1. 渲染层面的三板斧

- **`requestAnimationFrame` 驱动**：与帧率同步，页面隐藏自动暂停。
- **按需重绘**：静态场景不每帧渲染；交互/动画时才 render。
- **合理 near/far + fov**：减少无谓裁剪与深度冲突。

### 2. 减少 draw call（绘制调用）

- **几何体合并**：把大量小网格 `mergeGeometry` 成一个大 BufferGeometry，一次 draw 全出。
- **`InstancedMesh`**：同网格大量相同物体（树木/粒子），用实例化一条 draw call 渲染成百上千份。

```js
const inst = new THREE.InstancedMesh(geometry, material, 1000);
// 逐个摆放 instance 的矩阵 transform
//（需求简单时，这是让上千个物体保持流畅的关键）
scene.add(inst);
```

### 3. 纹理/材质与内存

- **压缩纹理**、**贴图复用**、mipmap 控制，降低显存与带宽。
- **及时 dispose**：移除物体/纹理时 `geometry.dispose()`、`material.dispose()`、`texture.dispose()`，否则显存泄漏。
- **`renderer.setPixelRatio(min(dpr, 2))`**：抑制超高 DPR 下的过度采样开销。

```js
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

### 4. 帧率与可视区域的取舍

- 远处/背面对象：`frustumCulled`（视锥剔除）默认开启，别误关。
- LOD（Level of Detail）：远处用低模，近处用高模。
- 阴影是高开销项：少用、用低分辨率 shadow map。

## 小结

- **WebGL** 是 GPU 级渲染接口，走"顶点→顶点着色器→光栅化→片元着色器"管线；裸写繁琐。
- **Three.js 三件套**：`Scene` 放物体、`PerspectiveCamera` 选视角、`WebGLRenderer` 出画面。
- **Mesh = 几何体 + 材质**，有光照才好看；灯用 `Ambient + Directional` 起步。
- 动画靠 `requestAnimationFrame` 逐帧 `renderer.render`。
- **性能核心**：减少 draw call（合批/`InstancedMesh`）、及时 dispose 释放显存、控制 pixelRatio 与阴影开销。

## 最小实现：原生 WebGL 的最小三角形

到 `code/frontend/10-visualize` 打开 `webgl-triangle.html`，用原生 WebGL 无任何库画出一个旋转三角形，全程聚焦两条着色器代码：

- **顶点着色器（vertex shader）**：`attribute vec2 a_position; void main(){ gl_Position = vec4(a_position, 0.0, 1.0); }` —— 对每个顶点做坐标变换，输出裁剪坐标；
- **片元着色器（fragment shader）**：`precision mediump float; void main(){ gl_FragColor = vec4(r, g, b, 1.0); }` —— 对光栅化得到的每个像素计算最终颜色。

配合 `varying` 变量，三个顶点的不同颜色会被 GPU 逐像素线性插值成渐变——这正是 Three.js 材质与光照着色的底层来源。若浏览器不支持 WebGL，demo 会显示友好提示，页面文字与说明始终可见。

原理一句话：WebGL 是"JS 写给 GPU 的并行指令集"，你只喂顶点与着色器，图元装配、光栅化与逐片元计算全部由 GPU 并行完成，所以它能扛住 Canvas 2D 扛不住的海量顶点。

## 面试衔接

本节对应 `90-附录-面试体系` 的「可视化」阶段（121"Three.js 的核心概念（场景 / 相机 / 渲染器 / 网格）是什么？"，并命中 118 的 WebGL 定位）：渲染管线、顶点/片元着色器分工、`Scene / Camera / Renderer / Mesh` 职责、`InstancedMesh` 与几何体合批减少 draw call、`dispose` 防显存泄漏都要能讲清。做真题自测后，进入下一节 `05-可视化工程实践`。