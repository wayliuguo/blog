// Rollup 库打包配置：external 排除依赖 + 多格式产物 + 手写插件 + 体积门禁
//
// 库打包的真实场景与应用打包不同：产物要能被使用方的打包器继续优化，
// 所以依赖不打包（external）、格式出多份（esm 给打包器、cjs 给 Node）、
// 并且要把体积和依赖图卡成构建期的门禁。
//
// 运行：npm run build
import { defineConfig } from 'rollup'
import miniVirtual from './plugins/mini-virtual.mjs'
import banApi from './plugins/ban-api.mjs'
import miniCommonjs from './plugins/mini-commonjs.mjs'
import sizeGate from './plugins/size-gate.mjs'

export default defineConfig({
    input: 'src/index.js',

    // 使用方一定也有的依赖不打进来：否则 react 会被打两份，hooks 直接报错
    external: ['react'],

    // 声明副作用：让使用方能整块摇掉"引用了但没用到导出"的模块
    treeshake: { moduleSideEffects: false },

    plugins: [
        miniVirtual(),
        // fail: false 只警告；改成 true 就从"报告"变成"门禁"（CI 里非零退出码靠它）
        banApi({ fail: false }),
        miniCommonjs()
    ],

    output: [
        {
            format: 'es',
            file: 'dist/index.mjs',
            sourcemap: true,
            // 体积门禁 + 清单只挂在一个 output 上，避免每种格式各出一份
            plugins: [sizeGate({ limitKb: 2, manifest: 'bundle-manifest.json' })]
        },
        {
            format: 'cjs',
            file: 'dist/index.cjs',
            exports: 'named',
            sourcemap: true
        }
    ]
})
