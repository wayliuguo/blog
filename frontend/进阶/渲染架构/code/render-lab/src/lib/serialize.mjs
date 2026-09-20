/**
 * 往 HTML / 属性里塞 JSON 时必须做的转义。
 * 最小实现，够用且两边一致 —— 它同时被服务端（内联注水数据）和浏览器（岛标记）引用。
 */
export function serializeData(data) {
    return JSON.stringify(data)
        .replace(/</g, '\\u003c') // 防 </script> 提前闭合
        .replace(/\u2028|\u2029/g, c => (c === '\u2028' ? '\\u2028' : '\\u2029'))
}
