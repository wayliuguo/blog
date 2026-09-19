// render.cjs — 渲染引擎探针：表达式沙箱 / 递归渲染 / 更新粒度
// 注意：本文件刻意不写 'use strict'——沙箱场景需要 with 语句（严格模式禁用 with）。
const assert = require('node:assert');

// ---------- 场景一：表达式沙箱——用户写的表达式不许碰到全局 ----------
// 低代码里用户会写表达式，而表达式一旦能碰到 window/document，就等于把站点交给用户。
function evaluate(expr, scope) {
  const guard = new Proxy(scope, {
    has: () => true, // 让 with 把所有标识符都交给下面的 get 处理
    get: (t, k) => {
      // with 语句会先查 Symbol.unscopables，symbol 键必须放行，否则连合法表达式都跑不起来
      if (typeof k === 'symbol') return t[k];
      if (!(k in t)) throw new Error(`表达式禁止访问：${String(k)}`);
      return t[k];
    },
  });
  const fn = new Function('__scope', `with (__scope) { return (${expr}); }`);
  return fn(guard);
}

{
  assert.equal(evaluate('state.count > 2', { state: { count: 3 } }), true);
  assert.equal(evaluate('item.name', { item: { name: 'a' } }), 'a');
  assert.throws(() => evaluate('window.location', { state: {} }), /表达式禁止访问/);
  assert.throws(() => evaluate('process.exit(1)', { state: {} }), /表达式禁止访问/);
  console.log('[1] 表达式沙箱：state/item 可用，window 与 process 一律抛错');
}

// ---------- 场景二：递归渲染——条件、循环、props 解析 ----------
// 渲染引擎的核心就是把 schema 展开成组件树：条件决定有没有，循环决定有几份。
function resolveValue(v, scope) {
  // 约定：以 state./item./index 开头的字符串视为表达式
  if (typeof v === 'string' && /^(state|item|index)\b/.test(v)) return evaluate(v, scope);
  return v;
}

function renderNode(node, scope, stats) {
  stats.visited++;
  if (node.when !== undefined && !evaluate(node.when, scope)) return null; // 条件不成立 → 整棵剪掉
  const props = Object.fromEntries(Object.entries(node.props || {}).map(([k, v]) => [k, resolveValue(v, scope)]));
  if (node.loop !== undefined) {
    // 循环节点本身还是一个组件（容器），展开的是它的子项
    const items = evaluate(node.loop, scope) || [];
    return {
      id: node.id,
      type: node.type,
      props,
      children: items.flatMap((item, index) =>
        (node.children || [])
          .map(c => renderNode(c, { ...scope, item, index }, stats))
          .filter(Boolean)
          .flat()
          .map(n => ({ ...n, id: `${n.id}#${index}` })) // 循环项 id 带下标，保证可定位
      ),
    };
  }
  return {
    id: node.id,
    type: node.type,
    props,
    children: (node.children || []).map(c => renderNode(c, scope, stats)).filter(Boolean).flat(),
  };
}

const schema = {
  id: 'page',
  type: 'Page',
  props: {},
  children: [
    { id: 'banner', type: 'Banner', props: { title: '大促', vip: 'state.vip' }, when: 'state.vip' },
    {
      id: 'list',
      type: 'List',
      props: {},
      loop: 'state.items',
      children: [{ id: 'item', type: 'Text', props: { text: 'item.name' } }],
    },
  ],
};

{
  const stats = { visited: 0 };
  const tree = renderNode(schema, { state: { vip: true, items: [{ name: 'a' }, { name: 'b' }] } }, stats);
  assert.equal(tree.children.length, 2);
  assert.deepEqual(tree.children[1].children.map(c => c.props.text), ['a', 'b']);

  const stats2 = { visited: 0 };
  const tree2 = renderNode(schema, { state: { vip: false, items: [{ name: 'a' }] } }, stats2);
  assert.equal(tree2.children.length, 1); // banner 被条件剪掉
  assert.equal(tree2.children[0].id, 'list');
  console.log(`[2] 递归渲染：条件开关生效（顶层 2 → 1 个），循环展开 ${tree.children[1].children.length} 份且 item 变量可见`);
}

// ---------- 场景三：更新粒度——全量重渲染 vs 只重算脏节点子树 ----------
// 编辑器里拖一下就全量重渲染，页面一大就卡；正确做法是按 id 定位脏节点、只重算它的子树。
function buildIndex(root) {
  const index = new Map();
  (function walk(node) {
    index.set(node.id, node);
    (node.children || []).forEach(walk);
  })(root);
  return index;
}

{
  const index = buildIndex(schema);
  const state = { state: { vip: true, items: [{ name: 'a' }, { name: 'b' }] } };
  const all = { visited: 0 };
  renderNode(schema, state, all);
  const patch = { visited: 0 };
  renderNode(index.get('list'), state, patch); // 只有 list 变了
  assert.ok(patch.visited < all.visited);
  console.log(`[3] 更新粒度：全量渲染访问 ${all.visited} 个节点，只重算脏子树 ${patch.visited} 个（省 ${all.visited - patch.visited} 个）`);
}

console.log('render.cjs 全部通过');
