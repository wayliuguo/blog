/**
 * 01 类型系统的心智模型：类型即集合、结构类型、可赋值性
 *
 * 运行：npm run check（当前状态 0 错） / npm run check:errors（解封 //ERR 行看真实报错）
 */

// ---- 类型即集合：string 是大集合，'0' | '1' 是它的子集 ----
type Digit = '0' | '1' | '2' | '3'

const d: Digit = '2'
const s: string = d // OK：子集可以赋给超集
//ERR const d2: Digit = s // 编译错误：string 太大，无法保证落在 Digit 里

// ---- 结构类型（鸭子辨型）：只看形状，不看你叫什么、从哪来 ----
interface Point2D {
    x: number
    y: number
}

class Vec2 {
    constructor(public x: number, public y: number) {}
}

const p: Point2D = new Vec2(1, 2) // OK：形状吻合即可，不要求显式 implements

// 经过变量传递时，多出来的字段不影响兼容
const rich = { x: 1, y: 2, z: 3 }
const p2: Point2D = rich // OK

// 但对象字面量直接赋值会触发「额外属性检查」
//ERR const p3: Point2D = { x: 1, y: 2, z: 3 } // 编译错误：z 不在 Point2D 里

// ---- never 是空集，unknown 是全集 ----
declare function input(): unknown

const u: unknown = input()
//ERR const len = u.length // 编译错误：unknown 上不允许任何取值操作
if (typeof u === 'string') {
    const ok: number = u.length // OK：收窄之后才可以用
}

// ---- 函数的可赋值性：返回值协变，参数逆变 ----
type Handler = (arg: string) => void

// 参数逆变：接受更宽（父集）的参数类型是安全的
const wider: Handler = (arg: string | number) => void arg
//ERR const narrower: Handler = (arg: 'a') => void arg // 编译错误：拿到 string 却按 'a' 处理

// 返回值协变：返回任意值都可以赋给返回 void 的函数类型
type Voider = () => void
const v: Voider = () => 1 // OK：调用方不会用到这个返回值
