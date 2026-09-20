// 总入口：分探针按各自所需 flag 起子进程执行，任一失败立即退出
const { spawnSync } = require('node:child_process')
const exe = process.execPath

function step(label, flags, file) {
  console.log(`\n── ${label} ──`)
  const r = spawnSync(exe, [...flags, file], { encoding: 'utf8' })
  process.stdout.write(r.stdout || '')
  if (r.status !== 0) {
    console.error(r.stderr)
    process.exit(1)
  }
}

step('探针一 · 分层编译 / 反优化 / 隐藏类（--allow-natives-syntax）', ['--allow-natives-syntax'], 'opt.cjs')
step('探针二 · GC 回收与泄漏（--expose-gc）', ['--expose-gc'], 'gc.cjs')
step('探针三 · 手写字节码组装 wasm 对比 JS', [], 'wasm.cjs')
step('探针四 · 多进程隔离 / 序列化代价', [], 'ipc.cjs')
console.log('\nv8-lab 全部探针通过 ✓')
