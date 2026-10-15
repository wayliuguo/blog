// 手写 mini-commonjs：一个能跑的 @rollup/plugin-commonjs 替身
//
// Rollup 只认 ESM：CJS 的 module.exports 在它眼里就是"给一个叫 module 的变量赋值"，
// 于是入口 import 它时拿不到任何导出。这个插件在 transform 阶段把赋值改写成导出。
//
// 只处理两种最常见的写法；真实插件还要处理动态 require、混合导出、条件导出与 interop 包装
export default function miniCommonjs() {
    return {
        name: 'mini-commonjs',

        transform(code, id) {
            if (!id.endsWith('.cjs')) return null
            let out = code
            if (/module\.exports\s*=/.test(out)) {
                out = out.replace(/module\.exports\s*=/g, 'export default')
            } else {
                out = out.replace(/exports\.(\w+)\s*=/g, 'export const $1 =')
            }
            return { code: out, map: null }
        }
    }
}
