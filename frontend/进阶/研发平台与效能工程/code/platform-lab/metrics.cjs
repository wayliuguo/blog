// metrics.cjs — 研发效能度量探针：DORA 四指标 / 交付周期分解 / 反模式
'use strict';
const assert = require('node:assert');

// ---------- 场景一：DORA 四指标——四个数就能给团队画像 ----------
// 部署频率、变更前置时间、变更失败率、服务恢复时间。这四个是唯一被大规模研究验证过的效能指标。
const DORA = {
  // 阈值来自 DORA 年度报告的分档（elite / high / medium / low）
  deployFreq: { elite: 7, high: 1, medium: 1 / 7 }, // 次/天
  leadTime: { elite: 24, high: 24 * 7, medium: 24 * 30 }, // 小时
  failRate: { elite: 0.05, high: 0.1, medium: 0.15 }, // 比例
  mttr: { elite: 1, high: 24, medium: 24 * 7 }, // 小时
};

function grade(metric, value, lowerIsBetter = true) {
  const t = DORA[metric];
  const pass = (limit) => (lowerIsBetter ? value <= limit : value >= limit);
  if (pass(t.elite)) return 'elite';
  if (pass(t.high)) return 'high';
  if (pass(t.medium)) return 'medium';
  return 'low';
}

function dora(deploys, changes, incidents, windowDays) {
  const deployPerDay = deploys / windowDays;
  const leadHours = changes.reduce((a, c) => a + c.leadHours, 0) / changes.length;
  const failed = changes.filter(c => c.failed).length;
  const failRate = failed / changes.length;
  const mttr = incidents.length
    ? incidents.reduce((a, i) => a + i.recoverHours, 0) / incidents.length
    : 0;
  return {
    deployPerDay,
    leadHours,
    failRate,
    mttr,
    grades: {
      deployFreq: grade('deployFreq', deployPerDay, false),
      leadTime: grade('leadTime', leadHours),
      failRate: grade('failRate', failRate),
      mttr: grade('mttr', mttr),
    },
  };
}

{
  // 30 天窗口：部署 60 次、12 个变更（1 个失败）、2 次故障
  const changes = Array.from({ length: 11 }, () => ({ leadHours: 20, failed: false }));
  changes.push({ leadHours: 20, failed: true });
  const r = dora(60, changes, [{ recoverHours: 0.5 }, { recoverHours: 1.5 }], 30);
  assert.equal(r.deployPerDay, 2);
  assert.equal(r.leadHours, 20);
  assert.ok(Math.abs(r.failRate - 1 / 12) < 1e-9);
  assert.equal(r.mttr, 1);
  assert.equal(r.grades.deployFreq, 'high', '每天 2 次部署：high（elite 要求按需/每天多次）');
  assert.equal(r.grades.leadTime, 'elite', '前置时间 20 小时：elite');
  assert.equal(r.grades.mttr, 'elite', 'MTTR 1 小时：elite');
  assert.equal(r.grades.failRate, 'high', `失败率 ${(r.failRate * 100).toFixed(1)}%：high（elite 要求 ≤ 5%，还差一档）`);
  console.log(`[1] DORA：部署 ${r.deployPerDay}/天（high）· 前置 ${r.leadHours}h（elite）· 失败率 ${(r.failRate * 100).toFixed(1)}%（high，离 elite 的 ≤5% 差一档）· MTTR ${r.mttr}h（elite）——下一步该盯的是变更失败率`);
}

// ---------- 场景二：交付周期分解——慢的不是写代码，是等待 ----------
// 一个 PR 从创建到上线 72 小时，真正写代码只有 4 小时。度量必须先拆段，否则优化方向必然错。
const stages = { 编码: 4, 等待评审: 60, 评审修改: 6, 等待发布: 2 };

{
  const total = Object.values(stages).reduce((a, b) => a + b, 0);
  assert.equal(total, 72);
  const wait = stages['等待评审'] + stages['等待发布'];
  assert.equal(wait / total > 0.8, true, `等待占比 ${(wait / total * 100).toFixed(0)}%`);
  const coding = stages['编码'] / total;
  assert.ok(coding < 0.06, `编码只占 ${(coding * 100).toFixed(0)}%`);
  console.log(`[2] 交付周期：72h 里编码 4h（${(coding * 100).toFixed(0)}%）、等待 ${wait}h（${(wait / total * 100).toFixed(0)}%）——优化编码速度毫无意义，瓶颈在评审排队与发布窗口`);
}

// ---------- 场景三：反模式——LOC 与单人吞吐为什么不能当指标 ----------
// 把度量做成考核，人们就会优化指标本身而不是它想衡量的东西。
{
  // 同一次重构：代码变少，价值变高
  const before = { loc: 300, leadHours: 48, incidents: 3 };
  const after = { loc: 120, leadHours: 12, incidents: 0 };
  assert.ok(after.loc < before.loc, '重构后 LOC 下降 60%');
  assert.ok(after.leadHours < before.leadHours && after.incidents < before.incidents, '但前置时间与故障都大幅改善');
  console.log(`[3] 反模式：LOC 从 ${before.loc} 降到 ${after.loc}（-60%），前置时间 ${before.leadHours}h→${after.leadHours}h、故障 ${before.incidents}→${after.incidents} —— 用 LOC 考核会把这次优秀重构判成"产出下降"`);

  // 按部署次数考核个人 → 拆 PR
  const honest = { prs: 2, deploys: 2, loc: 200 };
  const gaming = { prs: 10, deploys: 10, loc: 200 }; // 同样的改动拆成 10 个 PR
  assert.equal(honest.loc, gaming.loc, '实际改动完全一样');
  assert.ok(gaming.deploys > honest.deploys, '拆 PR 后部署次数翻 5 倍，指标好看但交付没变化');
  console.log(`[4] 反模式：同样的 200 行改动，拆成 10 个 PR 后"部署次数"从 ${honest.deploys} 变 ${gaming.deploys} —— 古德哈特定律：指标一旦成为目标，就不再是好指标`);
}

// ---------- 场景四：季度曲线——「变好了」和「噪声」必须分开看 ----------
// 汇报里最常见的错误：把季度间的零点几小时波动写成「本季度效能提升」。
// 判断标准不是「数字变小了」，而是「变化幅度有没有超过它自己的波动幅度」。
function quarterStats(list) {
  const sorted = [...list].sort((a, b) => a - b);
  const mean = list.reduce((a, b) => a + b, 0) / list.length;
  const sd = Math.sqrt(list.reduce((a, b) => a + (b - mean) ** 2, 0) / list.length);
  return { mean, sd, cv: sd / mean, median: sorted[sorted.length >> 1], p75: sorted[Math.floor(sorted.length * 0.75)] };
}

// 信号 / 噪声：差值 ÷ 两季波动的平均值。≥1 才值得拿出来说
function compare(a, b) {
  const delta = a.mean - b.mean;
  const noise = (a.sd + b.sd) / 2;
  return { delta, noise, ratio: Math.abs(delta) / noise, significant: Math.abs(delta) / noise >= 1 };
}

{
  // 六个季度，每季 12 个变更的前置时间（小时）
  const Q = {
    Q1: [40, 52, 36, 60, 44, 55, 48, 38, 51, 47, 43, 58],
    Q2: [42, 50, 39, 57, 45, 53, 49, 41, 52, 46, 44, 56],
    Q3: [44, 49, 41, 55, 46, 51, 47, 43, 50, 45, 48, 54],
    Q4: [43, 48, 40, 56, 45, 52, 46, 42, 51, 44, 47, 53],
    Q5: [30, 38, 26, 44, 33, 40, 35, 28, 37, 32, 34, 42],
    Q6: [31, 37, 28, 42, 34, 39, 36, 30, 38, 33, 35, 40]
  };
  const s = {};
  for (const k of Object.keys(Q)) s[k] = quarterStats(Q[k]);

  const q34 = compare(s.Q3, s.Q4);
  const q45 = compare(s.Q4, s.Q5);
  assert.equal(q34.significant, false, 'Q3→Q4 只降了不到 1 小时，远小于自身波动 → 噪声');
  assert.equal(q45.significant, true, 'Q4→Q5 降了十几个小时，超过波动 → 真变化');
  assert.ok(q45.ratio > q34.ratio * 10);

  for (const k of Object.keys(s)) {
    console.log(`      ${k}：均值 ${s[k].mean.toFixed(1)}h · 标准差 ${s[k].sd.toFixed(1)} · 变异系数 ${(s[k].cv * 100).toFixed(0)}% · P75 ${s[k].p75}h`);
  }
  console.log(`[5] 季度曲线：Q3→Q4 降 ${q34.delta.toFixed(1)}h 但波动就有 ${q34.noise.toFixed(1)}h（信噪比 ${q34.ratio.toFixed(2)}）→ 噪声，别写进汇报；Q4→Q5 降 ${q45.delta.toFixed(1)}h（信噪比 ${q45.ratio.toFixed(2)}）→ 真变化`);
}

// ---------- 场景五：窗口裁剪——同一份数据，换个窗口结论就变了 ----------
// 前四种是"改指标定义"，这一种是"改统计范围"，更隐蔽也更常见。
{
  // 30 天窗口：20 次变更，2 次失败；其中一次失败发生在第 27 天（最后一周）
  const changes = [];
  for (let d = 1; d <= 18; d++) changes.push({ failed: d === 6, day: d });
  changes.push({ failed: false, day: 20 });
  changes.push({ failed: true, day: 27 });
  const all = changes.filter(c => c.day <= 30);
  const trimmed = changes.filter(c => c.day <= 23); // 掐掉最后一周
  const rate = (list) => list.filter(c => c.failed).length / list.length;
  const rAll = rate(all);
  const rTrim = rate(trimmed);
  assert.equal(all.length, 20);
  assert.equal(trimmed.length, 19);
  assert.ok(Math.abs(rAll - 0.1) < 1e-9, '完整窗口：2/20 = 10%');
  assert.ok(Math.abs(rTrim - 1 / 19) < 1e-9, '掐掉最后一周：1/19 ≈ 5.3%');
  console.log(`[6] 窗口裁剪：同样是这批变更，30 天窗口失败率 ${(rAll * 100).toFixed(1)}%，掐掉最后一周变成 ${(rTrim * 100).toFixed(1)}% —— 跨过 elite 门槛只差一个「选哪天开始算」；固定窗口、固定口径，否则每个季度都能算出自己想要的结论`);
}
