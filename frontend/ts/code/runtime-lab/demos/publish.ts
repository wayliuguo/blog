import assert from 'node:assert'
import { emitDts } from '../_tsc.cjs'

// "类型发布"的本质：把一份带类型的库，编译出 .d.ts 声明文件发给消费者。
// 消费者 import 的是类型，运行时零成本——类型在编译后就消失了。
const src = `
export interface Vec2 { x: number; y: number }
export type Id = string & { __brand: 'Id' }
export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}
`

const dts = emitDts(src)
console.log(dts.trim())
assert.ok(dts.includes('interface Vec2'))
assert.ok(dts.includes('function add'))
console.log('\n结论：发布带类型的包，本质是发布这份 .d.ts；import 类型不进入运行时。')
