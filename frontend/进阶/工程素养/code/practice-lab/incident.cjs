// incident.cjs — 事故探针：分级 / 时间线与 MTTD·MTTR / 复盘行动项闭环
'use strict';
const assert = require('node:assert');

// ---------- 场景一：分级——先定级，再决定谁来、多快 ----------
// 「线上有问题」无法行动。定级要同时看影响面（用户数/资损）与持续时间。
function grade(i) {
  // P0：核心功能不可用或资损；P1：核心功能降级或大范围受影响；P2：有一定影响且无绕过；P3：轻微且可绕过
  if (i.coreBroken || i.moneyLoss > 0) return 'P0';
  if (i.affectedUsers >= 10000 || i.coreDegraded) return 'P1';
  if (i.affectedUsers >= 500 || !i.workaround) return 'P2';
  return 'P3';
}

{
  assert.equal(grade({ coreBroken: true, affectedUsers: 50, moneyLoss: 0, workaround: true }), 'P0', '核心不可用，哪怕只有 50 人');
  assert.equal(grade({ coreBroken: false, affectedUsers: 3, moneyLoss: 12000, workaround: true }), 'P0', '有资损即 P0');
  assert.equal(grade({ coreBroken: false, affectedUsers: 50000, moneyLoss: 0, workaround: true }), 'P1', '大范围');
  assert.equal(grade({ coreBroken: false, affectedUsers: 300, moneyLoss: 0, workaround: true }), 'P3', '有绕过方案 → 降级');
  assert.equal(grade({ coreBroken: false, affectedUsers: 300, moneyLoss: 0, workaround: false }), 'P2', '无绕过方案');
  console.log('[1] 事故分级：核心不可用或有资损 → P0（与影响人数无关）；大范围或核心降级 → P1；局部且能绕过 → P3；定级决定响应节奏，不是先讨论再定级');
}

// ---------- 场景二：时间线——MTTD 与 MTTR 分别对应不同的改进 ----------
// 发现慢（MTTD）靠监控告警，恢复慢（MTTR）靠预案与回滚能力，两者不能混为一谈。
function timeline(ev) {
  const mttd = ev.detectedAt - ev.occurredAt; // 多久被发现
  const mttr = ev.recoveredAt - ev.detectedAt; // 发现后多久恢复
  return { mttd, mttr, total: mttd + mttr };
}

{
  // 分钟为单位：01:00 发生，01:35 被发现（用户投诉），01:50 回滚恢复
  const ev = { occurredAt: 60, detectedAt: 95, recoveredAt: 110 };
  const t = timeline(ev);
  assert.equal(t.mttd, 35);
  assert.equal(t.mttr, 15);
  assert.equal(t.total, 50);
  assert.ok(t.mttd > t.mttr, '本例瓶颈在「发现」，不在「恢复」');
  // 改进前后对比：加监控后 5 分钟发现
  const after = { occurredAt: 60, detectedAt: 65, recoveredAt: 80 };
  const t2 = timeline(after);
  assert.equal(t2.mttd, 5, '监控把发现时间从 35 分钟压到 5 分钟');
  assert.equal(t2.mttr, 15, '恢复能力没变');
  console.log(`[2] 时间线：MTTD 35min + MTTR 15min = 50min（瓶颈在发现）；补监控后 MTTD 5min、MTTR 仍 15min —— 先分清慢在哪一段，再决定改监控还是改预案`);
}

// ---------- 场景三：复盘行动项——没闭环的复盘等于没复盘 ----------
// 复盘的产出不是文档，是**关掉的行动项**。每条都要有 owner、截止时间、验收标准。
function checkActions(actions, nowDay) {
  const open = [];
  for (const a of actions) {
    if (!a.owner) {
      open.push(`${a.id}：缺 owner`);
      continue;
    }
    if (!a.dueDay) {
      open.push(`${a.id}：缺截止时间`);
      continue;
    }
    if (!a.acceptance) {
      open.push(`${a.id}：缺验收标准`);
      continue;
    }
    if (!a.done && a.dueDay < nowDay) open.push(`${a.id}：已逾期 ${nowDay - a.dueDay} 天`);
  }
  const closed = actions.filter(a => a.done).length;
  return { open, closed, total: actions.length, closeRate: closed / actions.length };
}

{
  const actions = [
    { id: '补监控', owner: '张三', dueDay: 10, acceptance: '告警 5 分钟内触发', done: true },
    { id: '加回滚开关', owner: '李四', dueDay: 12, acceptance: '开关切回 CSR 无需发版', done: false },
    { id: '补测试', owner: '', dueDay: 15, acceptance: '核心链路覆盖率 70%', done: false },
    { id: '写文档', owner: '王五', dueDay: 25, acceptance: '', done: false },
    { id: '团队培训', owner: '赵六', dueDay: 0, acceptance: '组内宣讲完成', done: false },
  ];
  const r = checkActions(actions, 20);
  assert.equal(r.total, 5);
  assert.equal(r.closed, 1);
  assert.ok(Math.abs(r.closeRate - 0.2) < 1e-9);
  assert.ok(r.open.some(x => x.includes('逾期')), '第 12 天到期、现在是第 20 天 → 逾期 8 天');
  assert.ok(r.open.some(x => x.includes('缺 owner')));
  assert.ok(r.open.some(x => x.includes('缺截止时间')), 'dueDay 为 0 视为未填');
  assert.ok(r.open.some(x => x.includes('缺验收标准')));
  assert.equal(r.open.length, 4, '五条行动项里四条有问题');
  console.log('[3] 复盘行动项：owner / 截止时间 / 验收标准 三缺一即判不合规；实测 5 条只闭环 1 条（20%），1 条逾期 8 天、另三条分别缺 owner / 缺截止时间 / 缺验收标准');
}

// ---------- 场景四：一次完整的 P0——时间花在哪一环，是可以算出来的 ----------
// 前面三个场景讲的是规则，这里是一次有真实感的事故：把时间线切成段，
// 看看到底哪一环最贵，以及几个候选改进各自能省多少分钟。
// 「我们响应太慢」这句话没有信息量，换成「MTTD 占 41%」就可以排优先级了。
function breakdown(t) {
  const seg = {
    '发生 → 发现': t.detectedAt - t.occurredAt,
    '发现 → 有人接手': t.ackAt - t.detectedAt,
    '接手 → 定位': t.diagnosedAt - t.ackAt,
    '定位 → 决定回滚': t.decisionAt - t.diagnosedAt,
    '决定 → 恢复': t.recoveredAt - t.decisionAt
  };
  let total = 0;
  for (const k of Object.keys(seg)) total += seg[k];
  return { seg, total };
}

// 每个改进只压它对应的那一段：改别的段是无效的——这正是要算清楚的东西
const FIXES = {
  '补监控告警（错误率超基线 2 倍即呼值班）': { '发生 → 发现': 3 },
  '告警直接呼值班，不等客服转达': { '发现 → 有人接手': 2 },
  '一键回滚开关，不用重新发版': { '决定 → 恢复': 2 }
};

{
  // 一次真实的 P0：下单页白屏。分钟为单位，从当天 00:00 起算
  const real = {
    occurredAt: 20 * 60 + 10, // 20:10 发布 v2.8.0（含下单页重构，灰度 50%）
    detectedAt: 20 * 60 + 41, // 20:41 客服收到第一条投诉
    ackAt: 20 * 60 + 55, // 20:55 值班被拉起
    diagnosedAt: 21 * 60 + 3, // 21:03 定位到下单页白屏
    decisionAt: 21 * 60 + 12, // 21:12 决定回滚
    recoveredAt: 21 * 60 + 26 // 21:26 重新构建发版后恢复
  };
  const base = breakdown(real);
  assert.equal(base.total, 76, '这次事故一共 76 分钟');

  const gains = Object.keys(FIXES).map((name) => {
    const after = breakdown(real);
    const fixed = { ...after.seg, ...FIXES[name] };
    let total = 0;
    for (const k of Object.keys(fixed)) total += fixed[k];
    return { name, total, saved: base.total - total };
  });
  gains.sort((a, b) => b.saved - a.saved);

  const all = { ...base.seg };
  for (const f of Object.values(FIXES)) Object.assign(all, f);
  let allTotal = 0;
  for (const k of Object.keys(all)) allTotal += all[k];

  console.log('[4] 一次完整 P0（下单页白屏，76 分钟）：时间线切成 5 段后，最贵的是「发生 → 发现」31 分钟（占 41%）');
  for (const k of Object.keys(base.seg)) {
    console.log(`      ${k}：${base.seg[k]} 分钟（占 ${Math.round((base.seg[k] / base.total) * 100)}%）`);
  }
  for (const g of gains) console.log(`      改「${g.name}」→ 总时长 ${g.total} 分钟，省 ${g.saved} 分钟`);
  console.log(`      三项都做 → ${allTotal} 分钟（省 ${base.total - allTotal} 分钟）`);
  assert.ok(gains[0].saved > gains[gains.length - 1].saved, '改进之间收益不同，才需要排序');
  assert.ok(allTotal < base.total / 2, '三项都做能把总时长压到一半以下');
}
