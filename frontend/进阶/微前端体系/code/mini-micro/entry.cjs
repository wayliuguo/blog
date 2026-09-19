// HTML entry 解析与样式隔离：从入口 HTML 摘出 script / style，
// 再给每条选择器加应用前缀，让子应用样式只作用于自己的容器
function parseHtmlEntry(html) {
  const scripts = []
  const re = /<script src="([^"]+)"><\/script>/g
  let m
  while ((m = re.exec(html))) scripts.push(m[1])
  const styles = []
  const sre = /<style>([\s\S]*?)<\/style>/g
  while ((m = sre.exec(html))) styles.push(m[1])
  return { scripts, styles }
}

function scopeStyle(css, attr) {
  return css.replace(/([^{}]+)\{/g, (raw, sel) => {
    const s = sel.trim()
    if (s.startsWith('@')) return raw        // @media / @keyframes 不加前缀
    return s.split(',').map((p) => `${attr} ${p.trim()}`).join(', ') + ' {'
  })
}

module.exports = { parseHtmlEntry, scopeStyle }
