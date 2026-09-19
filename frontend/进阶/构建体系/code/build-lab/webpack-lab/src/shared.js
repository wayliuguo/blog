// 被 index.js 与 lazy.js 同时引用 → 命中 splitChunks 的 common 组
export function shared() {
    return 'shared-value'
}
