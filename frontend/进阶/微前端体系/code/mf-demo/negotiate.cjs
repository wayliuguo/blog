// Module Federation 的 shared 依赖协商：多个消费方各报"我要什么版本"，
// 共享层找出一个能同时满足所有约束的最高版本；找不到才退回"各带各的"
function satisfies(version, range) {
  // 只实现教学所需的最小集：^x.y.z（同大版本内 >= x.y.z）与精确版本
  if (range.startsWith('^')) {
    const [major] = range.slice(1).split('.').map(Number)
    const [vmajor, vminor, vpatch] = version.split('.').map(Number)
    if (vmajor !== major) return false
    if (vminor > Number(range.split('.')[1])) return true
    return vminor === Number(range.split('.')[1]) && vpatch >= Number(range.split('.')[2])
  }
  return version === range
}

function negotiate(sharedScope, providers, consumers) {
  // sharedScope: { react: ['17.0.2', '18.2.0'] } —— 共享层里实际有哪些版本
  // consumers:   [{ app: 'appA', deps: { react: '^18.0.0' } }, ...]
  const result = {}
  for (const dep of Object.keys(sharedScope)) {
    const ranges = consumers
      .filter((c) => c.deps[dep])
      .map((c) => ({ app: c.app, range: c.deps[dep] }))
    const versions = sharedScope[dep]
    // 从高到低找一个同时满足所有消费方约束的版本
    const picked = versions
      .slice()
      .sort((a, b) => (a < b ? 1 : -1))
      .find((v) => ranges.every((r) => satisfies(v, r.range)))
    if (picked) {
      result[dep] = { picked, copies: 1, satisfied: ranges.map((r) => r.app) }
    } else {
      // 协商失败：按约束分组，各组各加载一份（fallback）
      const groups = {}
      for (const r of ranges) {
        const ok = versions.filter((v) => satisfies(v, r.range)).sort((a, b) => (a < b ? 1 : -1))[0]
        const key = ok || 'none:' + r.range
        ;(groups[key] = groups[key] || { version: ok, apps: [] }).apps.push(r.app)
      }
      result[dep] = { picked: null, copies: Object.keys(groups).length, groups }
    }
  }
  return result
}

module.exports = { satisfies, negotiate }
