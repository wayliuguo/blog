let set = new Set([1, 1, 2, 2, 3, 3, 4, 4])
console.log(set) // Set(4) { 1, 2, 3, 4 }

let map = new Map()
map.set('a', 1)
map.set('a', 1)
console.log(map) // Map(1) { 'a' => 1 }

// weakMap 弱引用，不影响垃圾回收(浏览器控制台中输入)
class MyTest {}
let my = new MyTest()
let weakMap = new WeakMap()
weakMap.set(my, 1)
my = null
// 隔一段时间后会回收
console.log(weakMap) // WeakMap {}
