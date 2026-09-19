import assert from 'node:assert'

// 类型守卫：把"运行时判断"提升成"编译期收窄"
type Fish = { kind: 'fish'; swim: () => void }
type Bird = { kind: 'bird'; fly: () => void }
type Animal = Fish | Bird

function isFish(a: Animal): a is Fish {
    return a.kind === 'fish' // 运行时只看 kind 字段
}
function move(a: Animal) {
    if (isFish(a)) a.swim() // 这里 a 被收窄成 Fish
    else a.fly() // 这里 a 是 Bird
}

// 断言函数：不满足就抛，满足后调用点收窄
function assertNever(x: never): never {
    throw new Error('未穷尽分支: ' + JSON.stringify(x))
}
function describe(a: Animal): string {
    switch (a.kind) {
        case 'fish':
            return '鱼'
        case 'bird':
            return '鸟'
        default:
            return assertNever(a) // 若未来新增 kind，这里编译期就会报错
    }
}

move({ kind: 'fish', swim: () => {} })
move({ kind: 'bird', fly: () => {} })
console.log('describe(fish) =', describe({ kind: 'fish', swim: () => {} }))
console.log('describe(bird) =', describe({ kind: 'bird', fly: () => {} }))
assert.strictEqual(describe({ kind: 'fish', swim: () => {} }), '鱼')
console.log('\n结论：守卫和断言，是在编译期类型与运行时值之间架桥的两套原语。')
