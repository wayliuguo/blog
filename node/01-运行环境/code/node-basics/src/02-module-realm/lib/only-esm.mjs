// lib/only-esm.mjs —— 纯 ESM 模块：只有 ESM 语法，CommonJS 无法用 require 直接同步拿到（见 05 号脚本）
export const flavor = 'ESM';
export const features = ['静态依赖图', '活绑定', '顶层 await', '可 Tree Shaking'];

export function hello(who = 'world') {
    return `hello, ${who} from ${flavor}`;
}

// 默认导出：可以同时和命名导出并存
export default {
    flavor,
    hello,
    kind: 'default export',
};
