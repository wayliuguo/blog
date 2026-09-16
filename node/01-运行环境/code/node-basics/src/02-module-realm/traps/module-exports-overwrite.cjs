// traps/module-exports-overwrite.cjs —— 「替换 module.exports 后再挂 exports」的陷阱模块
// 这一段在演示：整体替换导出对象之后，exports 与 module.exports 就分道扬镳了，
// 后面的 exports.xxx 全挂在那个已经没人引用的旧对象上，外界看不到。
module.exports = {
  viaModuleExports: true,
};

// 失效的一行：这是老对象上的属性，不会被导出
exports.viaExportsAfterOverwrite = true;
