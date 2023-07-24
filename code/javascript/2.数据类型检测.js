// typeof
console.log('-------------tyoeof---------------')
console.log(typeof 2) // number
console.log(typeof true) // boolean
console.log(typeof 'str') // string
console.log(typeof undefined) // undefined
console.log(typeof Symbol(5)) // symbol
console.log(typeof BigInt(5)) // bigint
console.log(typeof function(){}) // function

console.log(typeof {}) //object
console.log(typeof []) //object
console.log(typeof null) //object

// instanceof
console.log('-------------instanceof---------------')
console.log(2 instanceof Number) // false
console.log([] instanceof Array) // true
console.log(function(){} instanceof Function) // true
console.log({} instanceof Object) // true

// constructor
console.log('-------------constructor---------------')
console.log((2).constructor === Number) // true
console.log((true).constructor === Boolean) // true
console.log(('str').constructor === String) // true
console.log(([]).constructor === Array) // true
console.log((function(){}).constructor === Function) // true
console.log(({}).constructor === Object) // true
function Fn() {}
Fn.prototype = new Array()
const f = new Fn() 
console.log(f.constructor === Fn) // false
console.log(f.constructor === Function) // false
console.log(f.constructor === Array) // true

// Object.prototype.toString.call()
console.log('-------------Object.prototype.toString.call()---------------')
const ObString = Object.prototype.toString
console.log(ObString.call(2)) // [object Number]
console.log(ObString.call(true)) // [object Boolean]
console.log(ObString.call('str')) // [object String]
console.log(ObString.call([])) // [object Array]
console.log(ObString.call(function(){})) // [object Function]
console.log(ObString.call({})) // [object Object]
console.log(ObString.call(undefined)) // [object Undefined]
console.log(ObString.call(null)) // [object Null]