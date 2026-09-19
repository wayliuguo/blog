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
