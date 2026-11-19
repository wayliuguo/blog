// 09 解析时机：ESM 是"先解析完成、再执行"，CommonJS 是"边执行、边解析"
//
// 这个脚本在演示三件事：
//   1. import 声明会被提升 —— 依赖模块的顶层代码先跑完，然后才轮到本文件的语句；
//      require 则是"执行到那一行才去读文件、才去跑对方的顶层代码"。
//   2. 静态 import 必须写在模块顶层、路径必须是字面量，因为依赖图要在执行任何一行代码之前就确定。
//   3. 命名导出的校验发生在"链接阶段"：写错了模块体一行都不会执行；
//      而 CommonJS 读一个不存在的属性只是 undefined，不会报错。
//
// 运行：node src/02-module-realm/09-parse-time.mjs

import { createRequire } from 'node:module'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

console.log('=== 1) 解析时机之一：import 声明会被提升 ===')
console.log('[本文件] A. 这是我第一条语句，它写在 import 声明的上面')

// 下面这行写在最后，但 eval-trace.mjs 的顶层代码已经在 A 之前跑完了
import './lib/eval-trace.mjs'

console.log('[本文件] B. import 声明之后的语句')
console.log('看出来了吗：A 打印在 eval-trace 那条之后，说明 import 不是"执行到这里才加载"，')
console.log('而是在整个模块体开跑之前就被提升、依赖先被求值。')

console.log('\n=== 2) 解析时机之二：静态 import 的路径必须是字面量 ===')
console.log('下面两种写法都是语法错误（可以自己改文件试一下）：')
console.log("    if (needIt) { import x from './x.mjs' }   // SyntaxError：import 只能在顶层")
console.log("    import y from './' + name + '.mjs'        // SyntaxError：路径不能是表达式")
console.log('原因：依赖图必须在执行任何一行代码之前就确定下来 —— 这正是 ESM 能做 Tree Shaking 的前提。')
const which = 'eval-trace'
const dyn = await import(`./lib/${which}.mjs`)
console.log(`按需加载只能靠 import()：import(\`./lib/${which}.mjs\`) 拿到了 tag = ${dyn.tag}`)
console.log('注意这里没有再打印一次 eval-trace 的日志：静态 import 和动态 import() 共用同一份模块实例。')

console.log('\n=== 3) 解析时机之三：命名导出的校验在"链接阶段"就发生 ===')
console.log('先看 CommonJS：读一个不存在的导出，不报错，只是 undefined')
const store = require('./lib/store.cjs')
console.log('    require 之后 store.notExist =', store.notExist)

console.log('\n再看 ESM：静态 import 一个不存在的命名导出，模块体一行都不会执行')
const storeUrl = pathToFileURL(path.join(dir, 'lib', 'store.cjs')).href
const probe = `import { notExist } from ${JSON.stringify(storeUrl)};\nconsole.log('如果这行打印出来了，说明没有报错');`
const r = spawnSync(process.execPath, ['--input-type=module', '-e', probe], { encoding: 'utf8' })
const errLine = (r.stderr || '').split('\n').find(l => l.includes('Error')) || '(没有拿到错误信息)'
console.log('    子进程退出码 =', r.status)
console.log('    子进程 stdout =', JSON.stringify((r.stdout || '').trim()), '<- 空的，模块体没被执行')
console.log('    报错 =', errLine.trim())
console.log('结论：ESM 在"链接"这一步就检查每个命名导出是否存在，这是编译期行为，不是运行时行为。')

console.log('\n小结：')
console.log('  CommonJS -> 运行时解析：require 执行到哪儿，才去读哪个文件、才执行对方的顶层代码')
console.log('  ES Module -> 静态解析：先扫出整张依赖图，校验通过后才开始执行，所以 import 会被提升')
