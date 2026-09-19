import MagicString from 'magic-string'
import { helper } from './helper.js'

// import.meta.env 会被 Vite 在构建期静态替换成字面量
const appName = import.meta.env.VITE_APP_NAME
const inProd = import.meta.env.PROD

const ms = new MagicString('const a = 1')
ms.append(' ; const b = 2')

document.getElementById('app').textContent = `${appName} | prod=${inProd} | ${helper()}`

// lazy.js 只有静态路径、没有静态引用 —— 用来对比 dev 与 build 的转换范围
document.getElementById('app').addEventListener('click', () => {
    import('./lazy.js').then((m) => console.log(m.lazy()))
})

console.log(ms.toString())
