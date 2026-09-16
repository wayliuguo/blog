// lib/store.cjs —— CommonJS 多导出（给 04-esm-import-cjs.mjs 用）
// 这一段在演示：用 exports.xxx = ... 给共享对象逐个挂属性。
// 这种「字面量属性名」的写法能被 cjs-module-lexer 静态扫出来，
// 所以 ESM 那边可以直接 `import { name } from './store.cjs'`。
exports.name = 'node-basics-store';
exports.version = '1.0.0';
exports.describe = () => `${exports.name}@${exports.version}`;

// 这一段在演示：静态分析的能力边界。
// 下面用「算出来的属性名」挂导出，运行时完全有效（默认导入能看到），
// 但它不是字面量，cjs-module-lexer 扫不出来，所以 ESM 的命名导入拿不到它。
const hiddenKey = 'dyna' + 'mic';
exports[hiddenKey] = '计算属性名挂上去的，ESM 静态分析扫不到';
