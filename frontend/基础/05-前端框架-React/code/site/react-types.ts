/**
 * 05-React 使用 TS 章节·类型示例
 *
 * 本文件演示 React 场景下常见的 TypeScript 类型写法，
 * 不依赖任何第三方包：下文中的 FC / useState / useRef / ChangeEventHandler
 * 都是“手写的极简版”（只用到 TS 标准语法与 lib.dom 里的 HTML 元素类型），
 * 目的是展示类型约束本身，而不是展示 React 的完整类型定义。
 *
 * 把类型标注理解成『约束』：一旦值与标注不符，tsc 就会在编译期报错——
 * 这正是 TS 的价值：类型是编译期的，运行时仍是 JS。
 */

// ---- 函数组件 props 类型：interface 定义形状 + FC 泛型标注组件 ----
type ReactNode = string | number | null
type FC<P = {}> = (props: P) => ReactNode

interface IProps {
    name: string
    age?: number // 可选属性：传不传都行
}

const Greeting: FC<IProps> = props => '你好，' + props.name + (props.age !== undefined ? '，' + props.age + ' 岁' : '')

const el1: ReactNode = Greeting({ name: '张三' }) // OK：age 可省略
const el2: ReactNode = Greeting({ name: '李四', age: 18 }) // OK：多传一个可选属性
// const bad: FC<IProps> = (props) => props.nickname // 编译错误：IProps 上没有 nickname 属性

// ---- hooks 的泛型：useState<S> / useRef<T> 显式标注状态与引用类型 ----
function useState<S>(initial: S): [S, (next: S | ((prev: S) => S)) => void] {
    let state = initial
    const setState = (next: S | ((prev: S) => S)): void => {
        state = typeof next === 'function' ? (next as (prev: S) => S)(state) : next
    }
    return [state, setState]
}

const [count, setCount] = useState<number>(0) // 泛型 S = number：count 恒为 number
setCount(prev => prev + 1) // 函数式更新：prev 也自动推断为 number
// setCount('1') // 编译错误：string 不能赋给 number 或函数

interface RefObject<T> {
    current: T | null
}
function useRef<T>(initial: T | null): RefObject<T> {
    return { current: initial }
}

const inputRef = useRef<HTMLInputElement>(null) // 泛型 T = HTMLInputElement（lib.dom 标准类型）
if (inputRef.current) {
    inputRef.current.focus() // 必须先判空：current 的类型是 HTMLInputElement | null
}

// ---- 事件对象类型：ChangeEventHandler<T> 把事件 target 限定为具体元素 ----
type ChangeEvent<T> = { target: T }
type ChangeEventHandler<T> = (event: ChangeEvent<T>) => void

const handleInput: ChangeEventHandler<HTMLInputElement> = event => {
    const value: string = event.target.value // target 已被限定为 HTMLInputElement，能直接取 .value
    console.log(value)
}
// const bad: ChangeEventHandler<HTMLInputElement> = (event) => event.target.selectedIndex
// 编译错误：HTMLInputElement 上没有 selectedIndex（那是 HTMLSelectElement 的属性）

// ---- 泛型组件：组件的 props 类型本身带类型参数 T ----
interface ListProps<T> {
    items: T[]
    renderItem: (item: T) => ReactNode
}
function List<T>(props: ListProps<T>): ReactNode {
    return props.items.map(props.renderItem).join('')
}

const numbers = [1, 2, 3]
const numView: ReactNode = List<number>({ items: numbers, renderItem: n => String(n) })
const strView: ReactNode = List<string>({ items: ['a', 'b'], renderItem: s => s.toUpperCase() })

export {}

// ------------------------------------------------------------------
// 检查命令（任选其一，都是只做类型检查、不产出 JS，安全无副作用）：
//   1) npx tsc --noEmit react-types.ts
//   2) npx -y typescript tsc --noEmit react-types.ts
// 期望结果：上面的错误示例都已被注释，因此 0 个编译错误；
// 想体会类型约束，可取消任意一行“编译错误”注释再跑一次，tsc 会在编译期报错。
// ------------------------------------------------------------------
