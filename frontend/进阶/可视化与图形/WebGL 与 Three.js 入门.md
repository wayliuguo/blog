# WebGL 与 Three.js 入门

> 统一业务场景：实时交易监控大屏（见[全景](./全景.md)）。本篇实战层是「海量点位图层」（大屏地图撒点、链路拓扑），最小实现直接复用 `viz-bench` 的裸 WebGL 点渲染——它就是「不用 Three.js 画 N 个点」的答案，且已被帧率基准实测。

## 一、入门：CPU 到 GPU 的心智迁移

Canvas 2D 的执行者是 CPU：每条绘制指令由 CPU 解析、光栅化。想画 5 万个点，就是 5 万条指令的解析成本。WebGL 把工作交给 GPU，心智模型从「调 API 画形状」换成「提交数据 + 写并行程序」：

| | Canvas 2D | WebGL |
| --- | --- | --- |
| 执行者 | CPU 逐条执行指令 | GPU 并行处理顶点/像素 |
| 编程方式 | 调用绘图 API | 提交几何数据 + 编写着色器 |
| 一次 draw call | 画一个形状 | 可画几万个三角形 |
| 数据更新 | 重放指令 | 只改 Buffer 里的数字 |

> 提示：WebGL 本质上只有一件事——**把顶点数据喂给 GPU，让 GPU 按你写的着色器算出每个像素的颜色**。所有酷炫效果都是这一句话的变体。

## 二、核心机制

### 2.1 渲染管线：CPU 到 GPU 的一段旅程

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

### 2.2 Three.js 三件套：场景 / 相机 / 渲染器

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

### 2.3 材质与光照

材质决定「表面怎么对光起反应」，选错材质是新手画面「假」的第一原因：

| 材质 | 对光的反应 | 成本 | 场景 |
| --- | --- | --- | --- |
| MeshBasicMaterial | 不受光 | 最低 | 纯色/UI 叠层 |
| MeshLambertMaterial | 漫反射 | 低 | 低端机大屏 |
| MeshStandardMaterial（PBR） | 漫反射 + 高光 + 粗糙度 | 中 | 主流选择 |
| MeshPhysicalMaterial | 透射/清漆等物理参数 | 高 | 产品展示 |

> 提示：环境光（AmbientLight）给底色、方向光（DirectionalLight）给立体感，是最低配的光照组合；金属感（metalness）与粗糙度（roughness）两个参数贡献了 PBR 质感的大部分观感。

### 2.4 着色器与坐标变换

用 Three.js 时绝大多数场景不需要手写 Shader，但要知道它的样子——这是「能做什么/不能做什么」的边界：

> 示意片段（无配套脚本）

```glsl
// 顶点着色器：每个顶点执行一次，算出裁剪空间坐标
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

GLSL 没有「循环遍历数组改 JS 变量」这种思维——它是**一次只算一个顶点/像素的纯函数**，全局状态不可共享。粒子、波浪、流体特效，都是把「随时间变化」做成 uniform 传入，让每个像素各自算出自己的颜色。

坐标变换全靠矩阵：模型矩阵（物体自身变换）→ 视图矩阵（相机位置）→ 投影矩阵（透视/正交）。Three.js 把它们压进一个 `modelViewMatrix`，你只需要记住两条：

1. **改物体属性（position / rotation / scale）永远优于手动算顶点**——矩阵由 Three.js 汇总，GPU 端一次乘完；
2. **近裁剪面 / 远裁剪面**（PerspectiveCamera 的后两个参数）决定深度精度，范围拉太大会出现 z-fighting（两个面闪烁打架）。

## 三、最小实现：裸 WebGL 画 5 万个点

不看封装库，直接用原生 API 走一遍「提交数据 → 编写着色器 → draw call」，这是理解 WebGL 能力边界的最短路径。`viz-bench/index.html` 的 WebGL 分支就是这套实现（它同时是三路帧率基准的参赛者）：

> 摘自 `./code/viz-bench/index.html`

```js
// ---- WebGL：N 个 POINTS，每帧更新一个平移 uniform 重绘 ----
let gl, prog, buf, uTrans
function setupWebGL() {
    cv = document.createElement('canvas')
    cv.width = W
    cv.height = H
    stage.appendChild(cv)
    gl = cv.getContext('webgl') || cv.getContext('experimental-webgl')
    if (!gl) {
        report({ error: 'no-webgl' })
        return
    }
    const vs = `attribute vec2 a_pos; uniform vec2 u_trans; void main(){ gl_Position = vec4(a_pos + u_trans, 0.0, 1.0); gl_PointSize = 2.0; }`
    const fs = `precision mediump float; void main(){ gl_FragColor = vec4(0.31,0.79,0.69,1.0); }`
    const compile = (type, src) => {
        const s = gl.createShader(type)
        gl.shaderSource(s, src)
        gl.compileShader(s)
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
        return s
    }
    prog = gl.createProgram()
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(prog)
    gl.useProgram(prog)
```

顶点数据一次性灌进 Buffer（N 个点 = N×2 个 float），每帧只改一个平移 uniform、重放一次 draw call：

> 摘自 `./code/viz-bench/index.html`

```js
    buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    const arr = new Float32Array(N * 2)
    for (let i = 0; i < N; i++) {
        arr[i * 2] = pts.xs[i] * 2 - 1
        arr[i * 2 + 1] = pts.ys[i] * 2 - 1
    }
    gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    uTrans = gl.getUniformLocation(prog, 'u_trans')
}
function drawWebGL(t) {
    const dx = Math.sin(t / 1000) * 0.1,
        dy = Math.cos(t / 1300) * 0.1
    gl.viewport(0, 0, W, H)
    gl.clearColor(0.067, 0.067, 0.067, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    // 归一化坐标平移用较小幅度，避免点飞出画面
    gl.uniform2f(uTrans, dx * 0.2 - 0.1, dy * 0.2 - 0.1)
    gl.drawArrays(gl.POINTS, 0, N)
}
```

读这段代码就是在读 WebGL 的全部骨架：**两个着色器（顶点算坐标、片元算颜色）、一个顶点缓冲、每帧一次 uniform 更新 + 一次 drawArrays**。Canvas 2D 画 5 万点要执行 5 万条 fillRect 指令，这里只有 1 次 draw call——这就是第六节实测里 WebGL 在大规模下曲线平稳的根源。

注意首帧成本：着色器编译 + 缓冲上传集中发生在第一帧（实测最长帧 716.7ms），之后每帧只有一次 uniform 上传。生产里用「预热帧」或把编译放在 loading 阶段，避免首帧白屏。

## 四、实战：监控大屏的海量点位图层

监控大屏常见需求：全国服务节点地图撒点（几万个）、链路拓扑连线、攻击来源热力。这类图层的特征是**数量巨大、每帧要动、但单个点不需要 DOM 级交互**（点击拾取用颜色编码或网格索引另做）——正好命中 WebGL 的能力区间。

在 `screen-board` 的技术栈下（Vue + ECharts），落法不是引 Three.js，而是 ECharts 的 `gl` 扩展（echarts-gl）提供 `graphGL` / `pointsGL` 系列，或单独一个 WebGL 图层 canvas 叠在图表层之下。选型判断顺序：

1. 点数 < 1 万且交互重 → Canvas/SVG 直接画（ECharts 默认渲染器）；
2. 点数上万、逐帧动 → ECharts-gl 的 GL 系列或自绘 WebGL 图层；
3. 需要真 3D（模型漫游、GIS 球）→ Three.js。

帧率基准把这条边界量了出来（Canvas 篇第六节）：5 万点逐帧动画，WebGL 21.2fps、Canvas 23.9fps（软件渲染下两者接近，但真机 GPU 上 WebGL 远胜）、SVG 3.6fps。**注意无头基准走 swiftshader 软件渲染，绝对帧率偏低，真机有 GPU 会高得多；但相对趋势与真机一致。**

## 五、对比与适用边界

| 信号 | 判断 |
| --- | --- |
| 图形数量上万且逐帧动 | Canvas 2D 帧预算爆了 → WebGL |
| 需要 3D（模型、漫游、GIS 球） | 只能 WebGL |
| 特效要求（粒子、流体、后处理） | WebGL / Shader |
| 只是普通图表大屏 | 别用，Canvas/SVG 够了且便宜得多 |

> 提示：WebGL 的成本不在「学 API」而在「三维素养」——相机、光照、纹理、优化（draw call 合批、实例化 instancing、LOD）都是独立知识块。业务项目优先 Three.js（或 ECharts-gl），把裸 WebGL 留给特效库作者和自己「看懂管线」。

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/viz-bench/index.html` | 裸 WebGL 点渲染（最小实现）+ Canvas/SVG 对照页 | 三、四 |
| `./code/viz-bench/bench.cjs` | 三路渲染帧率基准驱动（server.cjs 静态托管） | 四 |

## 参考

- 本模块地图：[全景](./全景.md)
- 本模块总结：[总结](./总结.md)
- 上一篇：[SVG 与声明式图形](./SVG%20与声明式图形.md)
- 下一篇：[大屏与可视化工程](./大屏与可视化工程.md)
- Three.js 官方：[Getting Started](https://threejs.org/docs/index.html#manual/en/introduction/Creating-a-scene) · [WebGL 基础概念](https://webglfundamentals.org/webgl/lessons/zh_cn/webgl-fundamentals.html)
