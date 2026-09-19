// gen.cjs — AI 生成链路探针：结构化输出抽取与校验 / 上下文装配 / token 估算
'use strict';
const assert = require('node:assert');

// ---------- 场景一：结构化输出——从噪声里抽取 JSON + schema 校验 + 失败重试 ----------
// 模型常把 JSON 包进 ```json 围栏、或在前后加客套话；解析必须先剥离噪声。
function extractJson(raw) {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = m ? m[1] : raw;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('找不到 JSON 边界');
  return JSON.parse(body.slice(start, end + 1));
}

function validate(obj, schema) {
  const errors = [];
  for (const [key, type] of Object.entries(schema)) {
    const v = obj[key];
    if (type === 'string' && typeof v !== 'string') errors.push(`${key}: 期望 string，实际 ${typeof v}`);
    if (type === 'array' && !Array.isArray(v)) errors.push(`${key}: 期望 array，实际 ${typeof v}`);
  }
  return errors;
}

// 修复重试：把上一轮的校验错误清单喂回给模型，而不是原样重发同一个 prompt
function generateWithRepair(raws, schema) {
  let lastErrors = [];
  for (let i = 0; i < raws.length; i++) {
    let obj;
    try {
      obj = extractJson(raws[i]);
    } catch (e) {
      lastErrors = [e.message];
      continue;
    }
    const errors = validate(obj, schema);
    if (!errors.length) return { obj, attempts: i + 1 };
    lastErrors = errors;
  }
  throw new Error(`全部尝试失败：${lastErrors.join('; ')}`);
}

{
  const raws = [
    '好的，这是你要的组件定义：\n```json\n{ "name": "Button", "props": ["size", "type"]\n```\n还需要调整吗？',
    '{ "name": 42, "props": [] }',
    '```json\n{ "name": "Button", "props": ["size", "type"] }\n```',
  ];
  const schema = { name: 'string', props: 'array' };
  const { obj, attempts } = generateWithRepair(raws, schema);
  assert.equal(obj.name, 'Button');
  assert.equal(attempts, 3);
  console.log('[1] 结构化输出：第 1 次围栏噪声解析失败、第 2 次类型校验失败，第 3 次通过');
}

// ---------- 场景二：上下文装配——预算内按优先级贪心装载 ----------
// prompt 窗口是稀缺资源。约定优先级：system > 检索片段 > 代码上下文 > 历史对话，
// 超预算时从低优先级开始丢弃。
function assemble(budget, parts) {
  const order = [...parts].sort((a, b) => a.priority - b.priority);
  let used = 0;
  const kept = new Set();
  for (const p of order) {
    if (used + p.tokens <= budget) {
      kept.add(p.name);
      used += p.tokens;
    }
  }
  return {
    kept: [...kept],
    used,
    dropped: parts.map(p => p.name).filter(n => !kept.has(n)),
  };
}

{
  const parts = [
    { name: 'system', tokens: 120, priority: 0 },
    { name: 'retrieval', tokens: 800, priority: 1 },
    { name: 'code-context', tokens: 600, priority: 2 },
    { name: 'history', tokens: 500, priority: 3 },
  ];
  const r = assemble(1600, parts);
  assert.deepEqual(r.kept, ['system', 'retrieval', 'code-context']);
  assert.deepEqual(r.dropped, ['history']);
  assert.equal(r.used, 1520);
  console.log('[2] 上下文装配：预算 1600，保住 system+检索+代码（1520），丢弃最末位的历史对话');
}

// ---------- 场景三：token 估算——中英文混合粗算 ----------
// 精确计数需要 tokenizer；工程上先用粗估 + 20% 余量兜底：
// 中文约 1 字/token，英文约 4 字符/token。
function estimateTokens(text) {
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const other = text.length - cjk;
  return Math.ceil(cjk + other / 4);
}

{
  assert.equal(estimateTokens('前端面试题'), 5);
  assert.equal(estimateTokens('const x = 1;'), 3);
  assert.equal(estimateTokens('用 Vue 开发'), 5);
  console.log('[3] token 粗算：中文按字、英文按 4 字符，混合场景可预算内兜底');
}

console.log('gen.cjs 全部通过');
