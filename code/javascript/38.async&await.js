// async 返回的是什么？
const testAsync = async () => {
    return 'hello world'
}
let result = testAsync()
console.log('async 返回值>>>', result) // Promise { 'hello world' }
result.then(res => console.log(res)) // hello world

// await 在等待什么？
function getSomething () {
    console.log('await 会阻塞后面的代码，执行外面的同步代码')
    return 'something'
}
async function asyncFn () {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve('hello async')
        }, 3000)
    })
}
async function test () {
    const v1 = await getSomething()
    const v2 = await asyncFn()
    console.log('await 等到非Promise>>>', v1) // await 等到非Promise>>> something
    console.log('await 等到Promise>>>', v2) // await 等到Promise>>> hello async
}
test()
console.log('不在async 函数里的不会被阻塞') // 不在async 函数里的不会被阻塞
