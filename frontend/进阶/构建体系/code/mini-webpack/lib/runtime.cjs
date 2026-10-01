'use strict'

const path = require('node:path')
const { transpile } = require('./transpile.cjs')

// 组装：加运行时包裹，把每个模块包成 function(module, exports, require)，入口注入 require(0)。
// webpack 产物的那套 `(() => { var modules = {...} })("runtime")` 就是这个，只被压缩/混淆得看不出原样。
function renderRuntime(compilation) {
    // 模块 Map 以 id 为键，另建 filename→id 的反查表，便于把「依赖文件路径」映射成运行时的 require(id)
    const idByName = {}
    for (const [id, m] of compilation.modules) idByName[m.filename] = id
    const modulesCode = []
    for (const [id, m] of compilation.modules) {
        const depsMap = m.deps.map(d => `"${path.basename(d)}":${idByName[d]}`).join(',')
        const body = transpile(m.code, from => idByName[path.join(path.dirname(m.filename), from)])
        modulesCode.push(`${id}: function (module, exports, require) {\n${body}\n  // deps: { ${depsMap} }\n}`)
    }
    const runtime = `(function () {
  var modules = { ${modulesCode.join(',\n')} }
  var cache = {}
  function require(id) {
    if (cache[id]) return cache[id].exports
    var module = (cache[id] = { exports: {} })
    modules[id](module, module.exports, require)
    return module.exports
  }
  require(0)
})();`
    return runtime
}

module.exports = { renderRuntime }