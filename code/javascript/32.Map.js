const map = new Map()
// map.set(key, value)
map.set('a', 1).set({a: 1}, 2)
// map.get(key)
console.log(map.get('a')) // 1
console.log(map.size) // 2
// map.has(key)
console.log(map.has('a')) // true
// map.delete(key)
console.log(map.delete('a')) // true
console.log(map) // Map(1) { { a: 1 } => 2 }
// map.clear()
map.clear()
console.log(map) // Map(0) {}

// 验证遍历器
map.set('foo', 1).set('bar', 2)
for(let key of map.keys()){
    console.log(key);  // foo bar
}
for(let value of map.values()){
    console.log(value); // 1 2
}
for(let items of map.entries()){
   console.log(items);  // ["foo",1]  ["bar",2]
}
map.forEach( (value,key,map) => {
    console.log(key,value); // foo 1    bar 2
})