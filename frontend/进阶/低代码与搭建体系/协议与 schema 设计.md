# 协议与 schema 设计

搭建平台的能力上限，在写下第一行 schema 的时候就被决定了：协议里没有条件渲染，产品就永远做不出条件渲染；协议里没有版本字段，老页面就只能一次性强制升级。这一篇把低代码的地基——物料协议、props 描述、版本迁移、合法性校验——拆开讲，并用 `lowcode-lab` 探针给出可直接搬走的实现。

## 一、协议决定能力上限

低代码系统可以分成四层，越往下越难改：

| 层 | 内容 | 改动代价 |
| --- | --- | --- |
| 协议层 | schema 结构、物料描述、表达式约定 | 最高：牵动所有存量页面 |
| 渲染层 | schema → 组件树 | 高 |
| 编辑器层 | 拖拽、属性面板、撤销重做 | 中（可重构） |
| 物料层 | 具体组件 | 低（随时加） |

所以协议设计的核心不是「写一份 JSON 格式」，而是回答三个问题：**什么算合法**（校验）、**怎么演进**（迁移）、**怎么定位**（索引）。下面三个探针各答一个。

## 二、物料协议：组件注册表 + props 描述

协议的第一件事是「什么算合法」。组件必须注册，props 必须可描述（类型、必填、枚举、默认值），否则渲染层无从下手、编辑器也生成不出属性面板：

> 摘自 `./code/lowcode-lab/schema.cjs`

```js
// 协议的第一件事是「什么算合法」：组件必须注册，props 必须可描述，否则渲染层无从下手。
const registry = {
  Button: {
    props: {
      text: { type: 'string', required: true },
      size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md' },
    },
  },
  Image: {
    props: {
      src: { type: 'string', required: true },
      width: { type: 'number' },
    },
  },
};

function validateNode(node, reg) {
  const meta = reg[node.type];
  if (!meta) return [`未注册组件：${node.type}`];
  const errors = [];
  for (const [key, def] of Object.entries(meta.props)) {
    const v = node.props ? node.props[key] : undefined;
    if (v === undefined) {
      if (def.required) errors.push(`${node.id}: ${key} 必填`);
      continue;
    }
    if (def.type === 'string' && typeof v !== 'string') errors.push(`${node.id}: ${key} 期望 string`);
    if (def.type === 'number' && typeof v !== 'number') errors.push(`${node.id}: ${key} 期望 number`);
    if (def.type === 'enum' && !def.values.includes(v)) errors.push(`${node.id}: ${key} 不在枚举 [${def.values}] 内`);
  }
  return errors;
}

{
  assert.deepEqual(validateNode({ id: 'b1', type: 'Button', props: { text: '提交', size: 'lg' } }, registry), []);
  assert.deepEqual(validateNode({ id: 'b2', type: 'Button', props: {} }, registry), ['b2: text 必填']);
  assert.deepEqual(validateNode({ id: 'b3', type: 'Button', props: { text: 'x', size: 'xxl' } }, registry), ['b3: size 不在枚举 [sm,md,lg] 内']);
  assert.deepEqual(validateNode({ id: 'x1', type: 'Marquee', props: {} }, registry), ['未注册组件：Marquee']);
  console.log('[1] 物料协议：必填/类型/枚举/未注册四类校验全部命中，未知组件直接拒绝');
}
```

实测四类错误全部命中。这份 props 描述一份三用：**校验器**用它拦非法数据、**属性面板**用它自动生成表单、**文档**用它自动生成物料说明——这就是「协议即契约」的实际收益。

## 三、版本迁移：老页面必须能活到新版本

协议一定会变，而变化只有两种处理方式：让老数据全量重写（高风险、需要停机窗口），或者写**迁移链**（每次读老 schema 就顺手升到最新）。后者是唯一可持续的做法：

> 摘自 `./code/lowcode-lab/schema.cjs`

```js
// 协议一定会变。迁移链是唯一能同时保证「向前演进」和「老数据不炸」的机制。
const migrations = [
  {
    from: 1,
    to: 2,
    up: s => ({
      ...s,
      version: 2,
      children: s.children.map(c => ({ ...c, props: { size: 'md', ...c.props } })),
    }),
  },
  {
    from: 2,
    to: 3,
    up: s => ({
      ...s,
      version: 3,
      children: s.children.map(c => {
        const { visible, ...rest } = c.props || {}; // v3 起 visible 换成 when 表达式
        return { ...c, props: rest, when: visible === false ? 'false' : c.when };
      }),
    }),
  },
];

function migrate(schema, target = 3) {
  let cur = schema;
  while (cur.version < target) {
    const m = migrations.find(x => x.from === cur.version);
    if (!m) throw new Error(`缺少 v${cur.version} → v${cur.version + 1} 的迁移`);
    cur = m.up(cur);
  }
  return cur;
}
```

迁移函数必须做到「补新默认值 + 清旧字段」，缺一半就会留下幽灵属性：

> 摘自 `./code/lowcode-lab/schema.cjs`

```js
{
  const v1 = {
    version: 1,
    children: [
      { id: 't1', type: 'Text', props: { text: '你好' } },
      { id: 'b1', type: 'Text', props: { text: '隐藏项', visible: false } },
    ],
  };
  const v3 = migrate(v1);
  assert.equal(v3.version, 3);
  assert.equal(v3.children[0].props.size, 'md'); // v1→v2 补默认值
  assert.equal(v3.children[1].when, 'false'); // v2→v3 把 visible 换成 when
  assert.equal(v3.children[1].props.visible, undefined); // 旧字段必须清掉
  console.log('[2] schema 迁移：v1 页面经两级迁移到 v3，默认值补齐、旧字段 visible → when 且清理干净');
}
```

工程约定三条：**schema 必须带 version 字段**（没有它就没有迁移的起点）、**迁移函数只能单步**（v1→v2、v2→v3，不要写 v1→v3 的直通）、**迁移必须可重放**（幂等，重复执行结果一致）。

## 四、索引与合法性：重复 id 与循环引用

schema 本质是数据，而数据会出现两种致命形态：**重复 id**（渲染后无法定位节点，属性面板改错地方）和**循环引用**（递归渲染直接爆栈）。两者都必须在校验期挡住，而不是等渲染时崩：

> 摘自 `./code/lowcode-lab/schema.cjs`

```js
// schema 是数据：它可能出现重复 id（渲染后无法定位）和循环引用（渲染直接爆栈）。
function buildIndex(root) {
  const index = new Map();
  const errors = [];
  const seen = new Set(); // 按对象身份记录，用于发现环
  (function walk(node) {
    if (seen.has(node)) {
      errors.push(`循环引用：${node.id}`);
      return;
    }
    seen.add(node);
    if (index.has(node.id)) errors.push(`重复 id：${node.id}`);
    index.set(node.id, node);
    (node.children || []).forEach(walk);
  })(root);
  return { index, errors };
}

{
  const ok = buildIndex({
    id: 'page',
    children: [{ id: 'a', children: [{ id: 'b' }] }, { id: 'c' }],
  });
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.index.size, 4);

  const dup = buildIndex({ id: 'page', children: [{ id: 'a' }, { id: 'a' }] });
  assert.deepEqual(dup.errors, ['重复 id：a']);

  const cyclic = { id: 'page', children: [] };
  cyclic.children.push(cyclic); // 自己引用自己
  const cyc = buildIndex(cyclic);
  assert.deepEqual(cyc.errors, ['循环引用：page']);
  console.log('[3] 索引校验：正常树 4 节点无错；重复 id 与循环引用都被挡在渲染之前');
}
```

注意循环引用检测用的是**对象身份**（`Set` 存对象引用），不是 id——因为 id 重复是另一类问题，两者要分别报。另外索引本身还有个正经用途：它是下一篇「按脏节点局部更新」的定位基础。

## 五、协议设计的几条硬经验

- **id 全局唯一且稳定**：编辑器靠 id 定位，出码靠 id 命名，id 一变所有下游配置（埋点、AB 实验）全废。
- **表达式只留一条通道**：`when`、`loop`、props 插值统一走同一种表达式语法，别搞三套解析器。
- **能力显式声明**：协议里能写什么就是产品能做什么，想支持新能力先改协议，别在渲染层偷偷兜底。
- **校验前置到保存时**：编辑器保存即校验，别让非法 schema 进入存储。
- **出码要能反向回读**（见下一篇与「编辑器与出码」篇）：schema 与代码的双向能力决定了平台会不会被专业开发抛弃。

## 工程含义清单

- 协议层改动代价最高：schema 结构、物料描述、表达式约定要先想清楚。
- props 描述一份三用：校验、属性面板、文档。
- 迁移链是刚需：带 version、单步、幂等、补新值清旧值。
- 索引校验前置：重复 id 与循环引用必须在渲染前拦住（环检测用对象身份）。
- id 稳定是下游一切配置的地基。

## 小结

- 协议与 schema 设计
  - 四层代价：协议 > 渲染 > 编辑器 > 物料；协议决定能力上限
  - 物料协议实测：必填/类型/枚举/未注册四类校验全命中，未知组件直接拒绝
  - props 描述一份三用：校验器、属性面板、文档
  - 版本迁移实测：v1 → v3 两级迁移，补默认值 size=md、旧字段 visible → when 且清理干净
  - 迁移三约定：带 version、单步、幂等
  - 索引校验实测：正常树无错；重复 id 与循环引用（对象身份检测）挡在渲染之前

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/lowcode-lab/schema.cjs` | 物料协议校验 / 版本迁移 / 索引与环检测 | 二、三、四 |
| `./code/lowcode-lab/render.cjs` | 表达式沙箱 / 递归渲染 / 更新粒度（下一篇引用） | — |
| `./code/lowcode-lab/editor.cjs` | 拖拽落点 / 出码 / 手写区锚点 / 属性联动（编辑器篇引用） | — |
| `./code/lowcode-lab/boundary.cjs` | 适用性打分 / 漂移检测 / 成本盈亏 / 逃逸机制（边界篇引用） | — |
| `./code/lowcode-lab/run.cjs` | 总入口：依次执行四探针 | 全篇 |

## 参考

- 本模块总结：[总结](./总结.md)
- 下一篇：[渲染引擎](./渲染引擎.md)
- 参考：[JSON Schema](https://json-schema.org/) · [低代码引擎协议（阿里 lowcode-engine）](https://lowcode-engine.cn/site/docs/specs/lowcode-spec)
