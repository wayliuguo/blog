// 同一件事写两遍：ESM 侧读到的是最新值，CJS 侧读到的还是导出那一刻的快照
import { count, bump } from './counter.mjs'
import cjs from './counter.cjs'

console.log('初始         esm count =', count, '| cjs snapshot =', cjs.snapshot)

bump()
cjs.bump()

console.log('各自 +1 之后 esm count =', count, '| cjs snapshot =', cjs.snapshot)
console.log('cjs 用函数重读 =', cjs.read(), '（快照停在 0，只有重新读变量才看得到 1）')
