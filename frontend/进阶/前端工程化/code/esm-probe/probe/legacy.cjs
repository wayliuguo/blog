// 典型 CJS 包：逐个挂在 exports 上，静态可分析
exports.name = 'legacy'
exports.version = '1.0.0'
exports.describe = () => `legacy@${exports.version}`
