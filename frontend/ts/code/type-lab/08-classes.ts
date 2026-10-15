/**
 * 08 类与类型：实例侧、静态侧，以及 private 带来的"名义类型"效果
 *
 * 运行：npm run check / npm run check:errors
 */

class Clock {
    static brand = 'Seiko'
    constructor(public hour: number) {} // 参数属性：声明 + 赋值一步完成
    tick(): void {}
}

// ---- 一个类同时创建了两样东西：实例类型 + 构造函数值 ----
type ClockInstance = Clock // 实例类型（写注解时用）
type ClockCtor = typeof Clock // 构造函数类型（工厂 / DI 时用）

const c: ClockInstance = new Clock(9)
//ERR const wrong: ClockInstance = Clock // 编译错误：Clock 是构造函数，不是实例

declare function factory(Ctor: new (hour: number) => ClockInstance): ClockInstance
factory(Clock) // OK：结构对得上就行

// ---- implements 只检查实例侧 ----
interface Ticker {
    tick(): void
}
class MyTicker implements Ticker {
    tick(): void {}
}
//ERR class BadTicker implements Ticker {} // 编译错误：缺少 tick

// ---- private 成员让结构类型退化成"名义类型" ----
class A {
    private tag = 'a'
}
class B {
    private tag = 'a'
}
declare const b: B
//ERR const aa: A = b // 编译错误：private 必须来自同一处声明，即使形状一样

// ---- 抽象类：既有实现又有契约，不能实例化 ----
abstract class Repository {
    abstract find(id: number): unknown
    log(msg: string): void {
        console.log(msg)
    }
}
class UserRepo extends Repository {
    find(id: number) {
        return { id }
    }
}
const repo = new UserRepo()
//ERR new Repository() // 编译错误：抽象类不能实例化

export { c, factory, MyTicker, repo }
