function foo () {
    Array.prototype.forEach.call(arguments, a=> console.log(a)) // 1 2 3 4 5
}
function foo1 () {
    const arrArgs = Array.from(arguments)
    console.log(arrArgs) // [ 1, 2, 3, 4, 5 ]
}
function foo2 () {
    const arrArgs = [...arguments]
    console.log(arrArgs) // [ 1, 2, 3, 4, 5 ]
}

foo(1,2,3,4,5)
foo1(1,2,3,4,5)
foo2(1,2,3,4,5)