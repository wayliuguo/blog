// 最小"scoped"实现：给每条规则的选择器加上应用前缀
// 真实框架用 CSS Modules / postcss 插件在构建期做，这里是运行时教学版
function scopeStyle(css, scope) {
  return css.replace(/([^{}]+)\{/g, (m, sel) => {
    const s = sel.trim()
    if (s.startsWith('@')) return m        // @media / @keyframes 不加前缀
    const scoped = s.split(',').map((part) => `${scope} ${part.trim()}`).join(', ')
    return `${scoped} {`
  })
}

module.exports = { scopeStyle }
