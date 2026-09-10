// 01 CommonJS 模块写法（.cjs 强制以 CommonJS 解析）
// 特点：require 是同步加载，module.exports 在模块加载时即可确定
const os = require('node:os');

function userInfo() {
  return `主机名: ${os.hostname()}，平台: ${os.platform()}`;
}

// 导出方式一：直接覆盖整个 module.exports
module.exports = { userInfo };

// 导出方式二：追加命名导出（CommonJS 允许不断往 exports 上挂属性）
module.exports.extra = '这是另一个导出字段';

// 因为 require 是同步的，导入后立刻可用，无需等待
const m = require('node:os');
console.log('CommonJS 导出结果:', userInfo());
console.log('同文件再次 require 内置模块（命中缓存）:', m.EOL ? 'EOL 可用' : 'no');
console.log('__filename =', __filename);
console.log('__dirname  =', __dirname);
