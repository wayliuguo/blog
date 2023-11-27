export const patchStyle = (el, prev, next) => {
    // 获取样式
    const style = el.style
    if (next == null) {
        el.removeAttribute('style')
    } else {
        if (prev) {
            // 老的里有新的有没有需要移除
            for (const key in prev) {
                if (next[key] == null) {
                    style[key] = ''
                }
            }
        }
        // 新的里面需要赋值到style上
        for (const key in next) {
            style[key] = next[key]
        }
    }
}
