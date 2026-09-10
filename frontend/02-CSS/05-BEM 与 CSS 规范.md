# BEM 与 CSS 规范

> 级别：中级

按本书四层推进：

- **入门使用**：BEM 的命名规则（块/元素/修饰符）为什么能解决冲突，普通 CSS + BEM 怎么用；
- **进阶**：CSS Module / scoped / CSS-in-JS / Tailwind 工程化方案原理与取舍（能讲清"这个项目我选哪种、为什么"）；
- **实战**：配合 `06-综合实战` 落地页用 BEM 组类名；
- **最小实现掌握原理**：到 `code/frontend/02-css` 打开 `bem-card.html`，增删 `--modifier` 看增量覆盖，眼见为实。

## 一、为什么需要 CSS 命名规范

随着页面规模增长，CSS 会迅速从"几条样式"膨胀为"上千条规则"。如果命名随意，很快会遇到难以维护的问题：

- **命名冲突**：团队里不同成员写出 `card`、`title`、`box` 这类通用名，样式互相覆盖却难以察觉；
- **无从定位**：看到一个类名，无法判断它属于哪个组件、是修饰状态还是内部元素；
- **覆写成本高**：牵一发动全身，改一处样式可能影响全局；
- **重构困难**：没有清晰的语义，代码越积越多，最终只能推倒重写。

命名规范的核心价值是**为类名附加可预测的信息**：它属于谁、承担什么角色、当前处于什么状态。这样即便没有看原始代码，也能根据类名推断结构，这正是 BEM 想解决的问题。

## 二、BEM 原理

BEM（Block、Element、Modifier，块、元素、修饰符）是一种 CSS 命名方法论，由 Yandex 提出。它的核心思想是把界面拆成"块"，块内再拆成"元素"，并用"修饰符"表达状态或变体。

### 2.1 BEM 命名规则

- **Block（块）**：一个独立、可复用的组件，用单个命名空间表示；
- **Element（元素）**：块内部的组成部分，用 `块__元素` 表示；
- **Modifier（修饰符）**：块或元素的某种状态、变体，用 `块--修饰符` / `元素--修饰符` 表示。

符号含义：
- `__`（双下划线）：表示"块下的元素"；
- `--`（双连字符）：表示"块或元素的修饰符 / 状态"。

```
.block__element--modifier
  │     │       │
  │     │       └── 修饰符（状态/变体）
  │     └── 元素（块的组成部分）
  └── 块（可复用组件）
```

### 2.2 结构示例

以一张"卡片"为例：

- 块：`card`
- 元素：`card__title`、`card__content`、`card__footer`
- 修饰符：`card--highlighted`（高亮状态）、`card__title--small`（小号标题）

```html
<div class="card card--highlighted">
  <h2 class="card__title card__title--small">标题</h2>
  <div class="card__content">内容...</div>
  <div class="card__footer">
    <button class="card__button card__button--primary">确定</button>
  </div>
</div>
```

```css
.card {
  border: 1px solid #ddd;
  border-radius: 8px;
}

.card--highlighted {
  background: #fff8e1;
  border-color: #f0a;
}

.card__title {
  font-size: 18px;
  font-weight: 600;
}

.card__title--small {
  font-size: 14px;
}

.card__button {
  padding: 8px 16px;
}

.card__button--primary {
  background: #2a7;
  color: #fff;
}
```

### 2.3 关键约定

**块内元素不写父级链的中间元素。** 例如在 `card` 下有一个 `header` 元素，`header` 内又有 `title`，正确写法是 `card__title`，而不是 `card__header__title`。

```
card__title        ✓
card__header__title ✗  避免过深嵌套
```

**修饰符不单独存在，必须挂在一个基础类名上。** 使用时要同时写上基础类与修饰符类，`card--highlighted` 不能脱离 `card` 单独工作，优点是保留了基础样式、便于精确覆写。

```css
/* 基础样式在 .card 上，变体只在 .card--highlighted 上做增量覆盖 */
.card { ... }
.card--highlighted { border-color: #f0a; }
```

### 2.4 块与元素的选择

任何可复用的独立组件都可视为一个块：导航、按钮组、弹窗、表单。判断"它是否应单独成为一个块"的依据是——**是否能脱离当前上下文独立使用**。如果某段结构只在固定父级内存在，那它就是那个父级块的元素；如果它会被多个地方复用，就应该提升为独立块。

## 三、在代码中应用 BEM

### 3.1 命名建议

- 类名使用**小写字母 + 连字符**（`-`）分隔单词，如 `user-profile`；
- 元素用 `__` 连接，修饰符用 `--` 连接，分隔符两侧不加空格；
- 避免歧义与语义混淆；命名尽量直白，描述"是什么"而非"长什么样"（比如用 `card--primary` 而非 `card--red`，避免颜色改动使类名失真）。

```css
/* 推荐 */
.user-profile__avatar--active { ... }
.news-card__title--large { ... }

/* 不推荐：语义被外观绑架 */
.card--red { color: red; }
```

### 3.2 配合预处理器书写

在 Sass / Less 中可以利用嵌套，让 BEM 结构更紧凑，同时避免手写超长类名。下面用 Sass 的 `&` 引用来实现：

```scss
.card {
  border: 1px solid #ddd;

  &--highlighted {
    background: #fff8e1;
  }

  &__title {
    font-size: 18px;

    &--small {
      font-size: 14px;
    }
  }
}
```

渲染结果等价于：

```css
.card { border: 1px solid #ddd; }
.card--highlighted { background: #fff8e1; }
.card__title { font-size: 18px; }
.card__title--small { font-size: 14px; }
```

> 提示：`&__title` 这种嵌套写法在项目里可以作为约定，但如果觉得 `&__` 拼写容易出错，也可以直接写完整类名，二者在可读性上各有取舍。

### 3.3 与 JS 的数据钩子解耦

命名规范不建议让"样式类名"同时充当 JS 的选择器。可以用 `data-` 属性或专门的 `js-` 前缀区分：

```html
<div class="card" data-role="toggle-card">
  ...
</div>
```

```js
// JS 用 data 属性或专门钩子，而不是 .card__title
const toggle = document.querySelector('[data-role="toggle-card"]');
```

这样修改样式类名不会影响 JS 逻辑，职责更清晰。

### 3.4 何时不建议用 BEM

- 超小的一次性样式、date-range 无关紧要的辅助类可以不追求完整 BEM；
- BEM 带来的类名会偏长，若团队无法接受，也可以采用更轻的约定（如只做块级命名）；
- 当项目已经引入 Tailwind 这类原子化方案时，通常就不再需要 BEM，二者是不同路线的取舍（见下一节）。

## 四、CSS 工程化对比

前端有多种组织 CSS 的方式，各有适用场景。下面从隔离性、可维护性、性能、生态等角度对比。

### 4.1 普通全局 CSS

传统方式，样式写在全局样式表中，靠命名约定避免冲突。

**优点**：零构建成本、理解门槛低、便于做全局主题。
**缺点**：全局作用域，极易命名冲突；无样式隔离，改一处影响面大；随项目变大难以清理。

```css
/* 全局文件 styles.css */
.card { border: 1px solid #ddd; }
```
```html
<!-- 任意页面都能命中 .card -->
<div class="card">...</div>
```

### 4.2 CSS Module

借助构建工具（Vite / webpack）把类名编译为带哈希的唯一名，实现**局部作用域**。

```css
/* Card.module.css */
.card {
  border: 1px solid #ddd;
}
```
```jsx
// React 中使用
import styles from './Card.module.css';

export function Card() {
  return <div className={styles.card}>...</div>;
}
```

编译后 `styles.card` 变为类似 `_card_abc123` 的唯一类名，天然隔离，命名可以放得更短。

**优点**：样式隔离、按需引入、无需操心全局冲突，是 React / Vue 项目非常常用的选型。
**缺点**：类名是哈希，不直接对应语义，调试时需要借助 `_ok-` 的映射；组合命名仍需要自己约定。

> 提示：现代构建工具支持 CSS Module 的无侵入方案（如 Vue 的 scoped 样式），原理类似：为元素加唯一属性选择器。

### 4.3 CSS-in-JS

把样式写在 JS 里，组件加载时动态生成样式（如 styled-components、Emotion）。

```jsx
// styled-components 示例
import styled from 'styled-components';

export const Card = styled.div`
  border: 1px solid #ddd;
  border-radius: 8px;
`;
```
```jsx
import { Card } from './Card';
export default () => <Card>内容</Card>;
```

**优点**：样式与组件强绑定，天然隔离、易做动态主题（如基于 props 改变颜色）、便于做 SSR 和 tree-shaking。
**缺点**：运行时生成样式有额外开销；在浏览器 DevTools 里看到的是注入的 style 标签，对深入优化不太友好；学习与迁移成本偏高。

### 4.4 Tailwind / 原子化 CSS

以工具类为主，直接组合预设的单一职责类（`p-4`、`flex`、`bg-red-500`），并通过 JIT 按需生成。

```html
<div class="border border-gray-200 rounded-lg p-4 hover:shadow-lg">
  内容
</div>
```

**优点**：不写具体样式，视觉实现极快；类名固定、无命名烦恼；按需摇树，产物体积小；团队风格统一。
**缺点**：HTML 会被一堆工具类撑满，可读性下降；若命名语义需求强、需大量自定义设计时，需要配置扩展能力；对"复用组件"时可由前端框架封装成组件来中和。

### 4.5 四种方案对比表

| 方案 | 作用域 | 隔离性 | 命名成本 | 运行时开销 | 适用场景 |
| --- | --- | --- | --- | --- | --- |
| 普通 CSS + BEM | 全局 | 靠约定 | 中 | 无 | 小中型站点、无构建环境 |
| CSS Module / scoped | 组件级 | 强 | 低 | 无 | 主流 React / Vue 组件项目 |
| CSS-in-JS | 组件级 | 强 | 低 | 有 | 高度动态主题、SSR 团队 |
| Tailwind 原子化 | 全局工具类 | 不强求 | 极低 | 无（按需） | 快速迭代、UI 统一的中大型项目 |

## 五、如何选型

### 5.1 选型考虑因素

- **项目规模**：小团队、小项目，普通 CSS + 命名约定即可；大团队、长期维护，隔离方案更稳。
- **团队熟悉度**：换一套完全陌生的方案会让团队短期产出下降，选型时要投票与试行。
- **构建链与框架**：Vite / webpack 天然支持 CSS Module；React 生态对 CSS-in-JS 支持成熟；Tailwind 有官方插件可无缝接入各类框架。
- **可维护性 / 可调试性 / 性能的取舍**：三种诉求往往此消彼长，要明确团队排序。
- **主题与设计系统**：需要运行时换肤、按用户配置动态配色时，CSS-in-JS 或 CSS 变量更顺手。

### 5.2 常见组合建议

```text
小型营销页/文档站    → 普通 CSS + 简洁命名 或 Tailwind
组件库 / 中后台应用   → CSS Module（组件化隔离）+ 简单 BEM 命名
需要运行时主题   → CSS-in-JS 或方案之上叠加 CSS 变量
快速 UI 搭建、多端一致 → Tailwind（可配合 BEM 给复杂业务组件命名）
```

**务实建议**：不必把它当作"非此即彼"的单选题。很多团队是**混合使用**——主体用 CSS Module 或 Tailwind，对确实需要语义化、可复用的复杂业务组件，再用 BEM 命名来承载。判断标准永远是：改一处样式时，我能不能清楚它会影响哪些地方；换一个人接手时，能不能凭类名猜出结构。

## 六、最小实现：用 Demo 验证原理

到 `code/frontend/02-css` 打开 `bem-card.html`：观察一张卡片如何按 `block__element--modifier` 组类名，增删 `--modifier` 看增量覆盖。无框架依赖，纯 HTML/CSS，改几行提交样式即可体会"改一处不影响全局"。

> 工程化层面（CSS Module / CSS-in-JS / Tailwind 在 Vite/webpack 中如何启用）属于 `06-工程化与构建` 与 `14-前端基建`，此处不展开，只建立选型直觉。

## 七、面试衔接

本节对应 `90-附录-面试体系` 的「CSS 规范/工程化」板块：BEM 命名三要素、为何用 BEM、CSS Module/scoped/CSS-in-JS/Tailwind 的取舍。能给出"这个项目我选哪种、为什么"即可。

## 小结

CSS 命名规范的目的不是"好看"，而是让样式**可预测、可复用、可维护**。BEM 通过 `block__element--modifier` 的三段结构，把"组件/内部元素/状态"编码进类名，配合预处理器或团队约定可显著降低冲突与重构成本。而到了工程化层面，普通 CSS、CSS Module、CSS-in-JS、Tailwind 各有取舍：隔离诉求强首选 CSS Module，动态主题倾向 CSS-in-JS，追求快节奏与体型常用 Tailwind。最终方案应结合项目规模、团队熟悉度与可维护性来定——规范本身也是可以演进的约定，扎根真实项目、解决真实问题，才最有价值。