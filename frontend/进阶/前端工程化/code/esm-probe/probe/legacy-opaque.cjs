// 反面例子：导出对象是拼出来的，静态分析猜不到里面有什么名字
const bag = {}
bag.name = 'opaque'
bag.version = '0.0.1'
module.exports = bag
