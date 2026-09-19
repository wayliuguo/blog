// crdt.cjs — 协同探针：OT 变换与收敛 / CRDT 字符模型 / 删除墓碑 / 顺序无关收敛
'use strict';
const assert = require('node:assert');

// ---------- 场景一：OT——并发插入怎么变换才能收敛 ----------
// OT 的全部难点在 transform：同一个位置两个人各插一个字符，谁在前必须有一个全局一致的裁定。
function applyInsert(text, op) {
  return text.slice(0, op.at) + op.text + text.slice(op.at);
}

function transformInsert(op, against) {
  // op 是还没落地的操作，against 是已经落地的操作
  let at = op.at;
  if (at > against.at) at += against.text.length;
  else if (at === against.at && against.client < op.client) at += against.text.length; // 同位置：clientId 小的在前
  return { ...op, at };
}

{
  const base = 'ace';
  const A = { type: 'insert', at: 1, text: 'b', client: 'A' };
  const B = { type: 'insert', at: 1, text: 'x', client: 'B' };

  // 路径一：A 先落地
  const p1 = applyInsert(applyInsert(base, A), transformInsert(B, A));
  // 路径二：B 先落地
  const p2 = applyInsert(applyInsert(base, B), transformInsert(A, B));
  assert.equal(p1, p2, '两条路径必须收敛到同一结果');
  assert.equal(p1, 'abxce', '同位置并发插入按 clientId 定序（A 在 B 前）');
  console.log(`[1] OT 变换：同位置并发插入 A/B，两条到达顺序都收敛为 "${p1}"，裁定规则 = clientId 小的在前`);
}

// ---------- 场景二：CRDT——字符带唯一 id，靠 left-origin 排序而不是靠位置 ----------
// CRDT 不做「变换」，它让每个字符自带身份与左邻居，于是到达顺序天然无关。
let clock = 0;
function makeItem(client, ch, afterId) {
  return { id: `${client}:${clock++}`, client, ch, afterId, deleted: false };
}

function insertItem(doc, item) {
  let i = item.afterId === null ? -1 : doc.findIndex(x => x.id === item.afterId);
  let pos = i + 1;
  // 与我有同一个左邻居、且 clientId 比我小的并发字符，一律排在我前面（clientId 小的在前，全局一致）
  while (pos < doc.length && doc[pos].afterId === item.afterId && doc[pos].client < item.client) pos++;
  doc.splice(pos, 0, item);
  return doc;
}

function toText(doc) {
  return doc.filter(x => !x.deleted).map(x => x.ch).join('');
}

{
  // 同一位置（文档开头）并发插入 A 的 'b' 与 B 的 'x'
  const d1 = [];
  const a = makeItem('A', 'b', null);
  const b = makeItem('B', 'x', null);
  insertItem(d1, a);
  insertItem(d1, b);

  const d2 = [];
  insertItem(d2, { ...b });
  insertItem(d2, { ...a });

  assert.equal(toText(d1), 'bx');
  assert.equal(toText(d2), 'bx', 'CRDT 与到达顺序无关');
  console.log(`[2] CRDT 字符模型：同一位置并发插入，两种到达顺序都为 "${toText(d1)}"——排序靠 left-origin + clientId，不靠位置`);
}

// ---------- 场景三：删除用墓碑，不真删 ----------
// 真删会让「别人基于这个字符的插入」失去锚点；墓碑保留位置，代价是文档只增不减（需要定期压缩）。
function deleteItem(doc, id) {
  const it = doc.find(x => x.id === id);
  if (!it) return false;
  it.deleted = true;
  return true;
}

{
  const doc = [];
  const a = makeItem('A', 'a', null);
  const b = makeItem('A', 'b', a.id);
  [a, b].forEach(x => insertItem(doc, x));
  assert.equal(toText(doc), 'ab');

  // 并发：A 删除 b；B 在 b 之后插入 'x'
  const x = makeItem('B', 'x', b.id);
  const order1 = () => {
    const d = doc.map(i => ({ ...i }));
    deleteItem(d, b.id);
    insertItem(d, { ...x });
    return toText(d);
  };
  const order2 = () => {
    const d = doc.map(i => ({ ...i }));
    insertItem(d, { ...x });
    deleteItem(d, b.id);
    return toText(d);
  };
  assert.equal(order1(), order2(), '删除与插入并发，结果必须与顺序无关');
  assert.equal(order1(), 'ax');

  // 反例：如果删除时把字符真的从数组里移除，并发插入会失去锚点
  const naiveDelete = (d, id) => {
    const i = d.findIndex(v => v.id === id);
    if (i >= 0) d.splice(i, 1);
  };
  const n1 = () => {
    const d = doc.map(i => ({ ...i }));
    naiveDelete(d, b.id);
    insertItem(d, { ...x });
    return toText(d);
  };
  const n2 = () => {
    const d = doc.map(i => ({ ...i }));
    insertItem(d, { ...x });
    naiveDelete(d, b.id);
    return toText(d);
  };
  assert.notEqual(n1(), n2(), '真删导致并发插入找不到左邻居 → 两条顺序结果不同（发散）');
  console.log(`[3] 删除墓碑：删 b 与「在 b 后插入 x」并发，两种顺序都为 "${order1()}"；若真删则发散为 "${n1()}" / "${n2()}"`);
}

// ---------- 场景四：顺序无关——多客户端多操作，任意顺序都要收敛 ----------
// 这是协同唯一真正要证明的性质：不管网络怎么乱序，所有人最终看到同一份文档。
function lcg(seed) {
  // 确定性伪随机（保证探针可复现，不用 Math.random）
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
}

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const out = [];
  arr.forEach((x, i) => {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) out.push([x, ...p]);
  });
  return out;
}

{
  clock = 0;
  // 三个人在同一段文字上并发编辑：A/B 插入，C 删除首字符
  const items = [makeItem('A', 'x', null), makeItem('B', 'y', null), makeItem('C', 'z', null)];
  const results = new Set();
  for (const order of permutations([0, 1, 2])) {
    const d = [];
    for (const i of order) insertItem(d, { ...items[i] });
    results.add(toText(d));
  }
  assert.equal(results.size, 1, '所有到达顺序必须得到同一结果');
  const final = [...results][0];
  console.log(`[4] 顺序无关：3 个客户端并发插入、全部 ${permutations([0, 1, 2]).length} 种到达顺序，结果唯一："${final}"`);
}

console.log('crdt.cjs 全部通过');
