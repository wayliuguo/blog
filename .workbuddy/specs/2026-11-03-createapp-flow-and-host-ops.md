# Spec：5.3.1 从 createApp 起链 + 4.4.3 宿主操作小节

日期：2026-11-03
状态：已获用户确认（三处改动方案 + 两处澄清：宿主操作放 4.4 新增小节；5.3 引言全删）

## 背景

- 5.3 现版引言（demo 一句话 + ①②③ 三行总图）用户认为冗余，要求 5.3.1 前面不要任何描述。
- 5.3.1 现版两列图从 `mount('#app')` 开始，缺 `createApp` 这一环：用户要求从 createApp 讲起——体现返回的 app 有 mount/unmount，mount 里把模板编译获得 render 函数并定义到根组件对象上，再调工厂函数的 mount → createVNode → render 衔接原链（不展开编译内部）。
- 四章缺宿主操作讲解：createRenderer 解构出的 hostCreateElement / hostCreateText / hostSetText 等函数的作用，要结合运行时流程讲（根据 VNode 处理元素：创建元素节点 → 设置文本 → 插入父节点指定位置）。

## 改动一：5.3 引言全删

文件：`frontend/vue/Vue3 原理.md`

- `### 5.3 整体运行链路` 标题后直接进 `#### 5.3.1`。
- 删除：`对应 demo：demo-app.html——官网 CDN 用法……` 整段；①挂载/②更新/③卸载 三行总图。

## 改动二：5.3.1 两列图从 createApp 开始

替换 5.3.1 开头两列流程图（mountComponent 内部列保持不变）：

```
主流程                                        mountComponent 内部（runtime-core.js，见 4.3）
──────────────────────────────────────────────────────────────
createApp(根组件对象)          index.js
  │ 输入 { setup() {...} }（已有 setup，无 render）
  │ 返回 app：{ mount, unmount }                ← unmount 是 5.3.6 的入口
  ▼
app.mount('#app')              index.js
  │ ① document.querySelector 解析选择器
  │ ② 取 innerHTML 当模板 → compile 获得 render 函数（过程见 5.1）
  │    并定义到根组件对象上：rootComponent.render = ctx => ...
  │ ③ 清空容器 → 调工厂函数的 mount（runtime-core 闭包里那个）
  ▼
createVNode(rootComponent)     runtime-core.js
  ▼
render → patch(null, rootVNode)
  │ shapeFlag 分发（见 4.2）→ processComponent
  ▼
processComponent ──────────→  ① createComponentInstance   建实例空壳
                              ② setupComponent            初始化 props / slots，执行 setup
                              ③ setupRenderEffect         render 包进渲染 effect，首跑
                              │    └ subTree = render()   首跑同步产出子树
                              ④ patch(null, subTree)      子树交回 patch（回到上行）
  ▼
processFragment → mountChildren → mountElement ×4 → 真实 DOM（与现版一致）
```

IO 块调整：

- 新增 **createApp（index.js）** 块：
  ```
  目的: 装配层工厂——接收根组件对象，返回 app { mount, unmount }
  输入: { setup() {...} }（已有 setup，无 render）
  输出: app（mount = 包装层（下面那个）；unmount = 卸载入口，见 5.3.6）
  ```
- 现 **mount（index.js）** 块拆两层：
  - **app.mount（index.js 包装层）**：目的=选择器解析 + in-DOM 模板编译 + 定义根组件 render + 清空容器；输入 `'#app'`；输出=转调工厂 mount 的结果（root 实例代理）。
  - **工厂 mount（runtime-core 闭包）**：目的=真正渲染入口；输入=根容器；过程=createVNode(rootComponent) → render → patch(null, rootVNode)；输出=root。
- **compile** 块精简：只留输出产物一行（呼应"不体现编译详细过程"，过程见 5.1）。
- setupComponent / setupRenderEffect / mountElement 块不动。

## 改动三：4.4 新增 4.4.3「宿主操作」

插入位置：4.4.2 末尾断点建议之后、4.5 之前。

结构：

1. 定位段：createRenderer 把 options 里的宿主操作解构重命名为 hostXxx——runtime-core 只认接口不认 DOM，换掉 nodeOps 就是 SSR 雏形。摘代码块（runtime-core.js createRenderer 解构段，L616-627 附近）。
2. 流程主线图（按调用时机组织，结合运行时）：
   ```
   宿主函数的调用时机（runtime-core 调 → index.js 落地）
   挂载：createElement 建元素节点 → patchProp 挂属性/事件 → setElementText 填元素文本 → insert 插入父容器（anchor 前/末尾）
   更新：setText 改文本节点 → setElementText 换元素文本 → patchProp 增删改属性（null 即移除）
   卸载/换位：remove 摘节点 → nextSibling 找锚点
   锚点辅助：createText / createComment（Fragment / 注释占位）
   ```
3. nodeOps 代码块：摘 index.js nodeOps 全量（8 个方法一行一个带注释），标注"谁在什么时候调我"。
4. 4.4.2 末尾那句 "`host*` 九个函数由 index.js 注入……" 改为指向 4.4.3。

## 联动

- 检查文中对 5.3 引言总图（①②③）的交叉引用，若有引用一并清理。
- spec 收录于 `.workbuddy/specs/`，沿用项目惯例。

## 验证

- `npm run build` 通过。
- grep 确认：5.3.1 前无残留引言；4.4.3 存在且 4.4.2 旧句已改；无对已删总图的悬空引用。
