// package.json 只声明了 is-odd；is-number 是它的传递依赖，没有直接声明
try {
    require('is-number')
    console.log('未声明依赖可用（被提升到顶层）')
} catch (err) {
    console.log(`未声明依赖不可用（${err.code}）`)
}
