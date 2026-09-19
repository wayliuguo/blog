// flow.cjs — 状态机与流程编排探针：转移合法性 / 守卫与延迟取消 / DAG 并行与补偿 / 事件重放
'use strict';
const assert = require('node:assert');

// ---------- 场景一：转移表——非法事件要能被识别，而不是静默无反应 ----------
// 状态机最大的价值不是"能转"，而是"不该转的时候转不动"，并且这件事是可判定的。
const def = {
  initial: 'idle',
  states: {
    idle: { onSubmit: 'loading' },
    loading: { onSuccess: 'success', onError: 'error', onCancel: 'idle' },
    success: { onReset: 'idle' },
    error: { onRetry: 'loading', onReset: 'idle' },
  },
};

function createMachine(def) {
  let state = def.initial;
  return {
    get state() {
      return state;
    },
    can: event => Boolean(def.states[state] && def.states[state][event]),
    send(event) {
      const next = def.states[state] && def.states[state][event];
      if (!next) return { changed: false, state, rejected: event };
      state = next;
      return { changed: true, state };
    },
  };
}

{
  const m = createMachine(def);
  assert.equal(m.state, 'idle');
  assert.equal(m.can('onSuccess'), false, 'idle 状态下没有 onSuccess 这条边');

  const bad = m.send('onSuccess');
  assert.equal(bad.changed, false);
  assert.equal(bad.rejected, 'onSuccess');
  assert.equal(m.state, 'idle', '非法事件不允许改状态');

  assert.equal(m.send('onSubmit').state, 'loading');
  assert.equal(m.send('onSuccess').state, 'success');
  assert.equal(m.send('onRetry').changed, false, 'success 下没有 retry');
  assert.equal(m.send('onReset').state, 'idle');

  console.log('[1] 转移表：idle 下 send(onSuccess) 被显式拒绝且不改状态（返回 rejected 而不是静默）；合法路径 idle→loading→success→idle 正常');
}

// ---------- 场景二：守卫与延迟——条件不满足不放行，离开状态必须取消定时器 ----------
// loading 里挂一个 3 秒超时。用户提前取消了，定时器还活着，就会在一个"已经不是 loading"的状态上触发转移。
const guarded = {
  initial: 'editing',
  states: {
    editing: {
      onSubmit: { target: 'loading', guard: ctx => ctx.valid, after: 3000, timeoutTo: 'timeout' },
    },
    loading: { onSuccess: 'done', onCancel: 'editing' },
    done: {},
    timeout: { onRetry: 'loading' },
  },
};

function createGuardedMachine(def, ctx) {
  let state = def.initial;
  let timer = null;
  let timeoutTo = null; // 当前状态挂着的超时该转到哪——必须跟着状态走，不能写死在某条边上
  return {
    get state() {
      return state;
    },
    get pending() {
      return timer !== null;
    },
    // 由外部时钟驱动，探针里手动触发，避免真的等 3 秒
    fireTimeout() {
      if (!timer || !timeoutTo) return false;
      clearTimeout(timer);
      timer = null;
      state = timeoutTo;
      timeoutTo = null;
      return true;
    },
    send(event) {
      const edge = def.states[state] && def.states[state][event];
      if (!edge) return { changed: false, rejected: event };
      const e = typeof edge === 'string' ? { target: edge } : edge;
      if (e.guard && !e.guard(ctx)) return { changed: false, blocked: event };
      // 关键：进入新状态前先清掉上一个状态挂的定时器
      if (timer) {
        clearTimeout(timer);
        timer = null;
        timeoutTo = null;
      }
      state = e.target;
      if (e.after) {
        timeoutTo = e.timeoutTo;
        timer = setTimeout(() => {}, e.after); // 真实工程里这里就是 fireTimeout
      }
      return { changed: true, state };
    },
  };
}

{
  const ctx = { valid: false };
  const m = createGuardedMachine(guarded, ctx);
  const blocked = m.send('onSubmit');
  assert.equal(blocked.changed, false);
  assert.equal(blocked.blocked, 'onSubmit');
  assert.equal(m.state, 'editing', '守卫不放行：校验没过就提交不了');

  ctx.valid = true;
  assert.equal(m.send('onSubmit').state, 'loading');
  assert.equal(m.pending, true, 'loading 上挂着一个超时定时器');

  assert.equal(m.send('onCancel').state, 'editing');
  assert.equal(m.pending, false, '离开 loading 时必须取消定时器，否则会在错误的状态上触发超时');
  assert.equal(m.fireTimeout(), false, '已取消：定时器到点也不该再转移');

  // 定时器真的到点：只应在仍处 loading 时生效
  const m2 = createGuardedMachine(guarded, { valid: true });
  m2.send('onSubmit');
  assert.equal(m2.fireTimeout(), true, '仍在 loading：超时生效');
  assert.equal(m2.state, 'timeout');

  console.log('[2] 守卫与延迟：ctx.valid=false 时 onSubmit 被 guard 拦下；进入 loading 后挂 3s 超时，onCancel 时定时器被清（pending=false）；超时只在仍处 loading 时生效 → timeout');
}

// ---------- 场景三：DAG 编排——能并行的别串行，失败了要有重试和补偿 ----------
// 一串"先查用户、再查订单、再合并、再支付、再通知"的流程，前两步没有依赖，串行跑纯属浪费。
const flow = {
  nodes: {
    fetchUser: { needs: [] },
    fetchOrder: { needs: [] },
    merge: { needs: ['fetchUser', 'fetchOrder'] },
    pay: { needs: ['merge'], retry: 2 },
    notify: { needs: ['pay'] },
  },
};

function layers(flow) {
  const done = new Set();
  const out = [];
  while (done.size < Object.keys(flow.nodes).length) {
    const layer = Object.keys(flow.nodes).filter(
      id => !done.has(id) && flow.nodes[id].needs.every(n => done.has(n))
    );
    if (!layer.length) throw new Error('流程存在无法解开的环');
    layer.forEach(id => done.add(id));
    out.push(layer);
  }
  return out;
}

function runFlow(flow, { fail = {}, compensate = false } = {}) {
  const log = [];
  let steps = 0;
  let compensated = [];
  for (const layer of layers(flow)) {
    // 同一层并行执行，只占 1 个"轮次"
    steps++;
    for (const id of layer) {
      let attempt = 0;
      const maxRetry = (flow.nodes[id].retry || 0) + 1;
      let ok = false;
      while (attempt < maxRetry) {
        attempt++;
        if (!(fail[id] && fail[id] >= attempt)) {
          ok = true;
          break;
        }
      }
      log.push({ id, round: steps, attempts: attempt, ok });
      if (!ok && compensate) {
        // 补偿必须按已完成节点的逆序执行
        compensated = log
          .filter(x => x.ok)
          .map(x => x.id)
          .reverse()
          .map(id => 'undo:' + id);
        break;
      }
    }
  }
  return { log, rounds: steps, compensated };
}

{
  const ls = layers(flow);
  assert.deepEqual(ls[0], ['fetchUser', 'fetchOrder'], '无依赖的两个节点在同一层');
  assert.deepEqual(ls[1], ['merge']);
  assert.equal(ls.length, 4, '分层执行 4 轮，串行要 5 步');

  const r = runFlow(flow);
  assert.equal(r.rounds, 4);
  assert.equal(r.log.find(x => x.id === 'pay').attempts, 1, '不失败时只跑 1 次');

  // pay 前两次失败、第三次成功
  const r2 = runFlow(flow, { fail: { pay: 2 } });
  assert.equal(r2.log.find(x => x.id === 'pay').attempts, 3, '重试 2 次 → 共 3 次尝试');
  assert.equal(r2.log.find(x => x.id === 'pay').ok, true);

  // pay 三次全失败 → 补偿按逆序回滚已完成节点
  const r3 = runFlow(flow, { fail: { pay: 99 }, compensate: true });
  assert.equal(r3.log.find(x => x.id === 'pay').ok, false);
  assert.deepEqual(r3.compensated, ['undo:merge', 'undo:fetchOrder', 'undo:fetchUser'], '补偿按完成顺序的逆序执行');

  console.log('[3] DAG 编排：fetchUser/fetchOrder 同层并行 → 4 轮 vs 串行 5 步；pay 失败 2 次后第 3 次成功（attempts=3）；pay 彻底失败时按逆序补偿 merge/fetchOrder/fetchUser');
}

// ---------- 场景四：事件重放——状态不存业务数据，重放要到同一个地方 ----------
// 把事件日志留下来，状态可以靠重放还原；前提是状态机自己不偷偷存东西（业务数据在 context 里）。
function replay(def, events) {
  const m = createMachine(def);
  const seen = [];
  for (const e of events) {
    const r = m.send(e);
    if (r.changed) seen.push(e); // 被拒绝的事件不进历史
  }
  return { state: m.state, accepted: seen };
}

{
  const events = ['onSubmit', 'onSuccess', 'onRetry', 'onReset', 'onSubmit', 'onError', 'onRetry', 'onSuccess'];
  const first = replay(def, events);
  assert.equal(first.state, 'success');
  assert.deepEqual(first.accepted, ['onSubmit', 'onSuccess', 'onReset', 'onSubmit', 'onError', 'onRetry', 'onSuccess'], 'onRetry 在 success 下无意义，被丢弃且不进历史');
  for (let i = 0; i < 50; i++) {
    const again = replay(def, events);
    assert.equal(again.state, first.state, '重放必须收敛到同一状态');
    assert.deepEqual(again.accepted, first.accepted);
  }
  console.log('[4] 事件重放：8 个事件里 onRetry 被拒（不入历史），重放 50 次状态恒为 success 且接受序列完全一致 → 状态机本身无隐藏可变状态');
}
