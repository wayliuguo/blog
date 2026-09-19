# WebGL 与 Three.js 入门

当 Canvas 2D 也画不动了——几万个粒子、三维模型、复杂光照——就到了 WebGL 的地界。这一篇不教 Shader 编程，而是把 WebGL 的心智模型（GPU 渲染管线）和 Three.js 的入门三件套讲清楚：**知道它擅长什么、贵在哪、什么时候轮到它上场**。

## 一、为什么需要 WebGL

Canvas 2D 的执行者是 CPU：每条绘制指令由 CPU 解析、光栅化。想画 5 万个点，就是 5 万条指令的解析成本。WebGL 把工作交给 GPU：

| | Canvas 2D | WebGL |
| --- | --- | --- |
| 执行者 | CPU 逐条执行指令 | GPU 并行处理顶点/像素 |
| 编程方式 | 调用绘图 API | 提交几何数据 + 编写着色器 |
| 一次 draw call | 画一个形状 | 可画几万个三角形 |
| 数据更新 | 重放指令 | 只改 Buffer 里的数字 |

> 提示：WebGL 本质上只有一件事——**把顶点数据喂给 GPU，让 GPU 按你写的着色器算出每个像素的颜色**。所有酷炫效果都是这一句话的变体。

## 二、渲染管线：CPU 到 GPU 的一段旅程

> 示意片段（无配套脚本）

```
JavaScript / Three.js
  │ 提交：顶点缓冲(VBO) + 着色器程序 + 状态
  ▼
顶点着色器（每个顶点跑一次，可并行百万级）
  │ 算出每个顶点的裁剪空间坐标 gl_Position
  ▼
图元装配 & 光栅化（GPU 固定管线，不可编程）
  │ 三角形 → 覆盖到哪些像素
  ▼
片元着色器（每个像素跑一次，决定最终颜色）
  │ 算出 gl_FragColor（光照、纹理都在这一步）
  ▼
帧缓冲 → 屏幕
```

关键认知：**顶点着色器与片元着色器是「可编程」的两段**，中间的光栅化是写死的。所谓「写 Shader」，就是用 GLSL 写这两段小程序，它们在 GPU 的几千个核心上并行执行——这是「一次 draw call 画几万个三角形」的原因。

## 三、Three.js 三件套：场景 / 相机 / 渲染器

裸 WebGL 一行三角形要写 100+ 行样板代码。Three.js 把它封装成三个对象起步：

> 示意片段（无配套脚本）

```js
const scene = new THREE.Scene()                       // 1. 场景：装所有物体与灯
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
camera.position.z = 5                                 // 2. 相机：决定「从哪看」
const renderer = new THREE.WebGLRenderer({ canvas })
renderer.setSize(width, height)                       // 3. 渲染器：真正干活的 GPU 桥
```

然后往场景里放物体并循环渲染：

> 示意片段（无配套脚本）

```js
const geometry = new THREE.BoxGeometry(1, 1, 1)       // 形状：顶点数据
const material = new THREE.MeshStandardMaterial({ color: 0x4a90d9 })
const cube = new THREE.Mesh(geometry, material)       // 网格 = 形状 × 材质
scene.add(cube)
scene.add(new THREE.AmbientLight(0xffffff, 0.6))      // 材质反光需要光源

function animate() {
  requestAnimationFrame(animate)
  cube.rotation.y += 0.01                             // 改的是对象属性
  renderer.render(scene, camera)                      // Three.js 负责同步到 GPU
}
```

> 提示：`renderer.render` 每帧做的是「把场景图翻译成 draw call 序列」——Three.js 在 WebGL 之上重建了一层「保留模式」的场景图，你改 `rotation.y`，它负责在下一帧把这份数据推给 GPU。这与 Canvas 2D 的「手动清屏重画」是同构问题的两种解。

## 四、材质与光照

材质决定「表面怎么对光起反应」，选错材质是新手画面「假」的第一原因：

| 材质 | 对光的反应 | 成本 | 场景 |
| --- | --- | --- | --- |
| MeshBasicMaterial | 不受光 | 最低 | 纯色/UI 叠层 |
| MeshLambertMaterial | 漫反射 | 低 | 低端机大屏 |
| MeshStandardMaterial（PBR） | 漫反射 + 高光 + 粗糙度 | 中 | 主流选择 |
| MeshPhysicalMaterial | 透射/清漆等物理参数 | 高 | 产品展示 |

> 提示：环境光（AmbientLight）给底色、方向光（DirectionalLight）给立体感，是最低配的光照组合；金属感（metalness）与粗糙度（roughness）两个参数贡献了 PBR 质感的大部分观感。

## 五、着色器：两段小程序

用 Three.js 时绝大多数场景不需要手写 Shader，但要知道它的样子——这是「能做什么/不能做什么」的边界：

> 示意片段（无配套脚本）

```glsl
// 顶点着色器：每个顶点执行一次，算出裁剪空间坐标
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

> 示意片段（无配套脚本）

```glsl
// 片元着色器：每个像素执行一次，算出最终颜色
void main() {
  gl_FragColor = vec4(0.29, 0.56, 0.85, 1.0); // 固定蓝色
}
```

GLSL 没有「循环遍历数组改 JS 变量」这种思维——它是**一次只算一个顶点/像素的纯函数**，全局状态不可共享。粒子、波浪、流体特效，都是把「随时间变化」做成 uniform 传入，让每个像素各自算出自己的颜色。

## 六、坐标系与矩阵变换

3D 的坐标换算全靠矩阵：模型矩阵（物体自身变换）→ 视图矩阵（相机位置）→ 投影矩阵（透视/正交）。Three.js 把它们压进一个 `modelViewMatrix`，你只需要记住两条：

1. **改物体属性（position / rotation / scale）永远优于手动算顶点**——矩阵由 Three.js 汇总，GPU 端一次乘完；
2. **近裁剪面 / 远裁剪面**（PerspectiveCamera 的后两个参数）决定深度精度，范围拉太大会出现 z-fighting（两个面闪闪爍爍打架）。

## 七、什么时候轮到 WebGL

| 信号 | 判断 |
| --- | --- |
| 图形数量上万且逐帧动 | Canvas 2D 帧预算爆了 → WebGL |
| 需要 3D（模型、漫游、GIS 球） | 只能 WebGL |
| 特效要求（粒子、流体、后处理） | WebGL / Shader |
| 只是普通图表大屏 | 别用，Canvas/SVG 够了且便宜得多 |

> 提示：WebGL 的成本不在「学 API」而在「三维素养」——相机、光照、纹理、优化（draw call 合批、实例化 instancing、LOD）都是独立知识块。业务项目优先 Three.js，把裸 WebGL 留给特效库作者。

## 小结

- WebGL 与 Three.js 入门
  - 定位：CPU 画不动的规模（万级图形/3D/特效）才上 WebGL
  - 渲染管线：顶点着色器 →（固定）光栅化 → 片元着色器，两段可编程、GPU 并行
  - Three.js 三件套：场景（装物体与灯）/ 相机（从哪看）/ 渲染器（GPU 桥）
  - 网格 = 形状 × 材质；PBR 材质 + 环境光/方向光是质感最低配
  - 着色器是一次算一个顶点/像素的纯函数，时间变化走 uniform
  - 坐标换算靠矩阵，改物体属性优于改顶点；裁剪面太宽会 z-fighting
  - 与前两篇的关系：显示列表（Canvas）与场景图（SVG/Three.js）是同一问题的两种解

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[SVG 与声明式图形](./SVG%20与声明式图形.md)
- 下一篇：[大屏与可视化工程](./大屏与可视化工程.md)
- Three.js 官方：[Getting Started](https://threejs.org/docs/index.html#manual/en/introduction/Creating-a-scene) · [WebGL 基础概念](https://webglfundamentals.org/webgl/lessons/zh_cn/webgl-fundamentals.html)
