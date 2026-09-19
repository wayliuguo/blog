# 模块总结-核心（HTML 基础）

> 精简核心版：01 篇按主题展开成员明细，02/03 篇按知识点清单列出高频点、点到为止。选点按「面试命中度 / 日常复用度」等维度（见[文档组织规范](../../文档组织规范.md)）。详细知识树见[《模块总结 · HTML 基础》](./总结.md)。

## 知识主线（一句话）

HTML 的骨架与语义化让"结构即含义"——语义化让 DOM 树对爬虫（SEO）与读屏器（无障碍）可读，表单把语义落到数据收集，无障碍树把它变成机器可验证的规则。

## 高频核心点

### 01 HTML 语义化与结构

**文档骨架三件套**

- **`<!DOCTYPE html>`**：声明 HTML5、让浏览器走标准模式渲染；缺少时进入怪异模式，CSS 表现失真
- **`<meta charset>`**：声明字符集，放在 `<head>` 最前
- **`<meta name="viewport">`**：`width=device-width, initial-scale=1` 移动端布局的关键

**语义化标签**

- **header / footer**：页面或区块的头部 / 底部
- **nav**：导航链接集合
- **main**：主体内容，每页建议一个
- **article**：独立可复用内容（一篇博客、一条新闻）
- **section**：有主题的区块
- **aside**：侧边栏，独立但相关的辅助内容

**常用 meta 标签**

- **SEO / 信息类**：`description`（页面摘要）、`author`、（`keywords` 已基本失效）
- **行为类**：`http-equiv="refresh"`（重定向/定时刷新）、`http-equiv="X-UA-Compatible"`（legacy IE 渲染模式）
- **viewport 字段**：`width=device-width`、`initial-scale`、`maximum-scale`/`minimum-scale`、`user-scalable`（禁用违反可访问性）

**脚本与资源加载**

- **`src` vs `href`**：`href` 建立关联不替换内容、并行不阻塞；`src` 加载并嵌入，同步 `script` 会暂停解析
- **`defer`**：下载与解析并行，HTML 解析完按文档顺序执行（`DOMContentLoaded` 前）
- **`async`**：下载完立刻执行、不保序，适合独立统计脚本
- **`type="module"`**：自带 defer 语义 + 严格模式 + 模块作用域

**HTML5 新特性**

- **媒体标签**：`video` / `audio` 原生播放，配 `controls`/`muted` 等
- **表单增强**：新类型 / 新属性 / 原生约束校验
- **进度度量**：`progress`（任务进度）/ `meter`（度量值）

### 02 表单与标签

- **提交三要素**：`action` / `method` / 控件 `name`
- **控件**：`input` / `textarea` / `select` / `radio` / `checkbox`
- **`label for`**：点文字聚焦 + 读屏
- **校验**：`required` / `pattern` / `min`·`max` / `:invalid` / validity API
- **事件**：`input` / `invalid` / `preventDefault`

### 03 无障碍与可访问性

- **无障碍树**：`role` + `name` + `state`
- **原生标签优先**：ARIA 是语义补丁
- **图片 alt 三种写法**
- **键盘焦点**：`tabindex`、`outline`、`:focus-visible`
- **对比度阈值**（4.5:1 / 3:1）

> 答题框架（如"三层防线"）见面试题页；此页只做知识锚点清单。
> 参考：完整版 [总结.md](./总结.md) · 面试题 [面试题.md](./面试题.md)