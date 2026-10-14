// build.mjs — wat → wasm 编译（wabt.js，无原生依赖）
import fs from 'node:fs'
import wabt from 'wabt'

const wabtMod = await wabt()
const wat = fs.readFileSync(new URL('./wat/score.wat', import.meta.url), 'utf8')
const { buffer } = wabtMod.parseWat('score.wat', wat).toBinary({})
fs.writeFileSync(new URL('./score.wasm', import.meta.url), Buffer.from(buffer))
console.log(`score.wasm built: ${buffer.length} bytes`)
