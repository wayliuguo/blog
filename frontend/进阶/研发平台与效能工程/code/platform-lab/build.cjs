// build.cjs — 构建平台探针：缓存键 / 增量依赖图 / 产物溯源
'use strict';
const assert = require('node:assert');

// 共用：FNV-1a 32 位——构建缓存里最常用的内容摘要算法（够快、够散）
function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// ---------- 场景一：缓存键——用 mtime 会白白失效，用内容 hash 才稳 ----------
// 云端构建里 CI 每次都是全新 checkout：所有文件 mtime 都是"刚刚"，内容却一个字没变。
function buildWithCache(files, cache, keyBy) {
  let rebuilt = 0;
  for (const f of files) {
    const key = keyBy === 'hash' ? hash(f.content) : String(f.mtime);
    if (cache[f.name] === key) continue; // 命中缓存，不重建
    cache[f.name] = key;
    rebuilt++;
  }
  return rebuilt;
}

{
  const files = [
    { name: 'a.js', content: 'export const a = 1;', mtime: 1000 },
    { name: 'b.js', content: 'export const b = 2;', mtime: 1000 },
    { name: 'c.js', content: 'export const c = 3;', mtime: 1000 },
  ];

  const cacheHash = {};
  assert.equal(buildWithCache(files, cacheHash, 'hash'), 3, '首次全建 3 个');
  assert.equal(buildWithCache(files, cacheHash, 'hash'), 0, '内容没变 → 全命中');

  // CI 重新 checkout：mtime 全变，内容一字未改
  files.forEach(f => (f.mtime = 2000));
  assert.equal(buildWithCache(files, cacheHash, 'hash'), 0, 'mtime 变了但内容没变 → hash 缓存仍全命中');

  const cacheMtime = {};
  buildWithCache(files, cacheMtime, 'mtime');
  files.forEach(f => (f.mtime = 3000));
  assert.equal(buildWithCache(files, cacheMtime, 'mtime'), 3, '同样的改动下 mtime 缓存全部误失效');

  console.log('[1] 缓存键：内容一字未改只因 mtime 变了，hash 缓存 0 重建 vs mtime 缓存 3 个全重建——云端构建必须用内容 hash（含依赖版本与构建参数）做键');
}

// ---------- 场景二：增量构建——改一个文件，到底该重建几个产物 ----------
// 全量重建最省心也最慢；靠反向依赖图算出真正脏掉的那一撮。
const graph = {
  'src/a.js': { deps: [] },
  'src/b.js': { deps: ['src/a.js'] },
  'src/c.js': { deps: ['src/a.js'] },
  'src/d.js': { deps: ['src/b.js', 'src/c.js'] },
};

function dirtySet(graph, changed) {
  // 反向边：谁依赖我 → 谁也要重建
  const rev = {};
  for (const [id, node] of Object.entries(graph)) {
    for (const dep of node.deps) (rev[dep] || (rev[dep] = [])).push(id);
  }
  const dirty = new Set(changed);
  const queue = [...changed];
  while (queue.length) {
    const cur = queue.shift();
    for (const downstream of rev[cur] || []) {
      if (dirty.has(downstream)) continue;
      dirty.add(downstream);
      queue.push(downstream);
    }
  }
  return dirty;
}

{
  const all = Object.keys(graph).length;
  assert.equal(dirtySet(graph, ['src/a.js']).size, 4, '改底层 a.js：下游全脏');
  const d = dirtySet(graph, ['src/c.js']);
  assert.equal(d.size, 2, '改 c.js：只有 c 与依赖它的 d 变脏');
  assert.ok(d.has('src/d.js'));
  assert.ok(!d.has('src/b.js'), 'b 不依赖 c，不该被重建');
  assert.equal(dirtySet(graph, ['src/d.js']).size, 1, '改叶子 d.js：只有它自己');
  console.log(`[2] 增量依赖图：改叶子 d.js 只重建 1 个、改 c.js 重建 2 个（vs 全量 ${all} 个）；靠反向依赖边传播，且要用集合防重复入队`);
}

// ---------- 场景三：产物溯源——线上报 app.js:150，到底是哪一行源码 ----------
// 压缩后的行列号对用户毫无意义；manifest 记录每个源文件在 bundle 里的起始行，就能反查。
const manifest = {
  'app.8f3c.js': {
    sources: [
      { file: 'src/header.js', startLine: 0, lines: 120 },
      { file: 'src/cart.js', startLine: 120, lines: 80 },
      { file: 'src/footer.js', startLine: 200, lines: 40 },
    ],
  },
};

function locate(manifest, bundle, line) {
  const entry = manifest[bundle];
  if (!entry) return null;
  for (const s of entry.sources) {
    if (line >= s.startLine && line < s.startLine + s.lines) {
      return { file: s.file, line: line - s.startLine + 1 };
    }
  }
  return null;
}

{
  const hit = locate(manifest, 'app.8f3c.js', 150);
  assert.deepEqual(hit, { file: 'src/cart.js', line: 31 }, '150 行落在 cart.js 区间内 → 偏移换算成源码行');
  assert.deepEqual(locate(manifest, 'app.8f3c.js', 10), { file: 'src/header.js', line: 11 });
  assert.equal(locate(manifest, 'app.8f3c.js', 9999), null, '越界要明确返回 null 而不是猜一个');
  assert.equal(locate(manifest, 'app.old.js', 10), null, '查不到 bundle → null（版本已下线）');
  console.log('[3] 产物溯源：线上 app.8f3c.js:150 → src/cart.js:31；越界与查不到 bundle 都返回 null；真实工程用 sourcemap（VLQ 编码）做列级映射，manifest 负责「哪个版本有哪些文件」');
}
