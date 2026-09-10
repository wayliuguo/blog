# TypeScript 类型系统

> 级别：中级

按本书四层推进：

- **入门使用**：本页——安装配置、基础类型、接口、类、函数、泛型、类型推断，能写出带类型注解的代码；
- **进阶**：`02-TypeScript 工程实践`——tsconfig、声明文件、类型守卫、类型体操、内置工具类型与工程落地；
- **实战**：见 `02-TypeScript 工程实践`——把本页的类型系统落到 tsconfig、类型守卫、类型体操与工具类型的工程实战；
- **最小实现掌握原理**：到 `code/frontend/05-typescript` 打开 `structural.html` 等 demo，用 JS 可视化结构类型/联合交叉/泛型与 infer 的原理。

TypeScript 是 JavaScript 的超集，它在 JavaScript 之上增加了类型系统。类型系统可以帮助我们在编译阶段就发现错误，让代码更健壮、更易维护。本文梳理 TypeScript 类型系统从安装配置到基础类型、接口、类、函数、泛型、类型推断以及高级类型的完整知识体系。

## 安装与配置

TypeScript 通常通过 npm 全局安装：

```bash
npm install -g typescript
```

安装完成后，可以通过 `tsc`（TypeScript Compiler）命令查看版本并编译文件：

```bash
# 查看版本
tsc -v

# 编译单个文件
tsc xxx.ts
```

在实际项目中，通常使用 `tsconfig.json` 配置文件来描述编译选项。比较关键的几个选项如下：

```json
{
  "compilerOptions": {
    "target": "ES2015",
    "strict": true,
    "strictNullChecks": true,
    "module": "commonjs",
    "outDir": "./dist"
  }
}
```

其中 `strict` 会开启所有严格模式选项，`strictNullChecks` 用于严格控制 `null` 和 `undefined` 的赋值，是写出安全代码的关键开关。

为了让 TypeScript 直接运行（而不用先编译），还可以使用 `ts-node` 或 `tsx` 等工具。

## 基础类型

TypeScript 支持与 JavaScript 几乎相同的数据类型，此外还提供了枚举 (`enum`) 等额外类型。

### 布尔值 boolean

最基本的数据类型就是简单的 `true`/`false` 值：

```typescript
let isDone: boolean = false
```

### 数字 number

与 JavaScript 一样，TypeScript 里的所有数字都是浮点数，类型为 `number`。除了十进制和十六进制，还支持二进制和八进制字面量（ES2015 引入）：

```typescript
let decLiteral: number = 20
let hexLiteral: number = 0x14
let binaryLiteral: number = 0b10100
let octalLiteral: number = 0o24
```

### 字符串 string

使用 `string` 表示文本类型，可用双引号、单引号。同时支持模板字符串，用反引号（`` ` ``）包围，并通过 `${ expr }` 内嵌表达式，可定义多行文本：

```typescript
let name: string = 'bob'
name = 'smith'

let age: number = 37
let sentence: string = `Hello, my name is ${name}.

I'll be ${age + 1} years old next month.`
```

等价于：

```typescript
let sentence: string = 'Hello, my name is ' + name + '.\n\n' +
    'I\'ll be ' + (age + 1) + ' years old next month.'
```

### 数组（学会包含）

数组有两种等价的定义方式，元素类型后接 `[]`，或使用数组泛型 `Array<元素类型>`：

```typescript
let list: number[] = [1, 2, 3]
let list_1: Array<number> = [1, 2, 3]
```

如果你想要一个内部元素可以是不同类型的数组，可以用 `any[]`：

```typescript
let list: any[] = [1, true, 'free']
list[1] = 100
```

### 元组 Tuple

元组类型允许表示一个已知元素数量和类型的数组，各元素的类型不必相同：

```typescript
let x: [string, number]
x = ['hello', 10] // OK
x = [10, 'hello'] // Error
```

访问已知索引的元素，会得到正确的类型：

```typescript
console.log(x[0].substr(1)) // OK
console.log(x[1].substr(1)) // Error, 'number' 不存在 'substr' 方法
```

> 注意：自从 TypeScript 3.1 之后，访问越界元素会直接报错，不再建议使用该特性。

### 枚举 enum

`enum` 类型为 JavaScript 标准数据类型提供了补充，可以为一组数值赋予友好的名字。默认从 `0` 开始编号，也可以手动赋值：

```typescript
enum Color {Red, Green, Blue}
let c: Color = Color.Green

// 从 1 开始编号
enum Color2 {Red = 1, Green, Blue}

// 全部手动赋值
enum Color3 {Red = 1, Green = 2, Blue = 4}
```

枚举还支持由数值反向查找名字：

```typescript
enum Color {Red = 1, Green, Blue}
let colorName: string = Color[2]
console.log(colorName) // 输出 'Green'
```

### any

当编程阶段还不清楚变量的类型时，可以使用 `any` 跳过类型检查。常用于用户输入或第三方代码库：

```typescript
let notSure: any = 4
notSure = 'maybe a string instead'
notSure = false // 也可以是 boolean
```

### void

`void` 与 `any` 相反，表示没有任何类型，常用于没有返回值的函数：

```typescript
function warnUser(): void {
  console.log('This is my warning message')
}

let unusable: void = undefined // 只能赋值为 undefined
```

### null 和 undefined

`undefined` 和 `null` 各自有类型，默认情况下它们是所有类型的子类型。但开启 `--strictNullChecks` 后，它们只能赋值给 `void` 和各自类型，从而避免很多问题：

```typescript
let u: undefined = undefined
let n: null = null

// 在 strictNullChecks 下需要显式联合
let sn: string | null = 'bar'
sn = null // 可以
```

### never

`never` 表示永不存在的值的类型，例如总是抛出异常或无限循环的函数返回值：

```typescript
function error(message: string): never {
  throw new Error(message)
}

function infiniteLoop(): never {
  while (true) {}
}
```

`never` 是任何类型的子类型，可以赋值给任何类型；但除了 `never` 本身外，没有类型可以赋值给 `never`，即使 `any` 也不行。

### object

`object` 表示非原始类型，即排除 `number`、`string`、`boolean`、`symbol`、`null`、`undefined` 之外的类型：

```typescript
declare function create(o: object | null): void

create({ prop: 0 }) // OK
create(null) // OK
create(42) // Error
create('string') // Error
```

## 类型断言

有时你会比 TypeScript 更了解某个值的类型。类型断言告诉编译器「相信我，我知道自己在干什么」，它没有运行时影响，只在编译阶段起作用。

类型断言有两种形式。第一种是「尖括号」语法：

```typescript
let someValue: any = 'this is a string'
let strLength: number = (<string>someValue).length
```

第二种是 `as` 语法。在 JSX 中只能使用 `as` 语法：

```typescript
let someValue: any = 'this is a string'
let strLength: number = (someValue as string).length
```

两种形式是等价的。

## 变量声明

`let` 和 `const` 是较新的变量声明方式，`const` 是 `let` 的增强，阻止对变量再次赋值。TypeScript 作为 JavaScript 的超集，本身就支持它们。

### 为什么不用 var

`var` 存在作用域和捕获相关的怪异问题：

- **函数作用域**：`var` 声明的作用域是函数级，而非块级，导致变量可被意外访问。

```javascript
function f(shouldInitialize) {
  if (shouldInitialize) {
    var x = 10
  }
  return x // 可以访问到 x
}
```

- **重新声明不报错**：同作用域多次声明同一个变量不会报错。

- **捕获变量怪异**：闭包中的 `var` 循环变量共享同一个引用。

```javascript
for (var i = 0; i < 10; i++) {
  setTimeout(function() {
    console.log(i)
  }, 100 * i)
}
// 输出 10 个 10
```

解决方法是使用 IIFE 立即执行函数表达式，或改用 `let`。

### let 声明：块作用域

`let` 使用的是块作用域，变量在包含它们的块或 `for` 循环之外不可访问：

```typescript
function f(input: boolean) {
  let a = 100
  if (input) {
    let b = a + 1
    return b
  }
  // Error: 'b' 在这里不存在
  return b
}
```

块级作用域变量不能在被声明之前读或写，这段区域被称为**暂时性死区**（Temporal Dead Zone）：

```typescript
a++ // Error: Block-scoped variable 'a' used before its declaration.
let a
```

`let` 在同一作用域内不允许重复声明：

```typescript
let x = 10
let x = 20 // 错误，不能在 1 个作用域里多次声明 x
```

在循环中使用 `let`，每次迭代都会创建一个新的变量环境，因此 `setTimeout` 的例子可以得到预期结果：

```typescript
for (let i = 0; i < 10; i++) {
  setTimeout(function() {
    console.log(i)
  }, 100 * i)
}
// 输出 0 1 2 ... 9
```

### const 声明

`const` 拥有与 `let` 相同的作用域规则，但是不能被重新赋值。需要注意，`const` 变量的内部状态是可修改的（除非使用 `readonly` 或 `Object.freeze` 等特殊手段）：

```typescript
const kitty = { name: 'Kitty', numLives: 9 }

kitty = { name: 'Tommy', numLives: 9 } // Error，不能重新赋值
kitty.name = 'Jerry' // OK，内部状态可修改
```

### let vs. const

使用最小特权原则：除非计划修改变量，否则都应使用 `const`。这样更容易推测数据的流动。

### 解构

解构可以让我们更方便地从数组或对象中提取值，作用于数组：

```typescript
let input = [1, 2]
let [first, second] = input
console.log(first) // outputs 1
console.log(second) // outputs 2

// 剩余变量
let [a, ...rest] = [1, 2, 3, 4]
console.log(rest) // outputs [2, 3, 4]
```

作用于函数参数：

```typescript
let input: [number, number] = [1, 2]

function f([first, second]: [number, number]) {
  console.log(first)
  console.log(second)
}
```

对象解构、属性重命名与默认值：

```typescript
let o = { a: 'foo', b: 12, c: 'bar' }
let { a, b } = o

// 属性重命名：a 作为 newName1
let { a: newName1, b: newName2 } = o
// 若要指定类型，需写完整模式
let { a: rename_a, b: rename_b }: { a: string; b: number } = o

// 默认值：属性为 undefined 时使用缺省值
function keepWholeObject(wholeObject: { a: string; b?: number }) {
  let { a, b = 1001 } = wholeObject
}
```

函数声明结合解构与默认值：

```typescript
function f({ a = '', b = 0 } = {}): void {
  // ...
}
```

### 展开

展开（spread）操作可以创建浅拷贝：

```typescript
let first = [1, 2]
let second = [3, 4]
let bothPlus = [0, ...first, ...second, 5]
// [0, 1, 2, 3, 4, 5]
```

对象的展开是从左至右处理，后面的属性会覆盖前面的属性：

```typescript
let defaults = { food: 'spicy', price: '$10', ambiance: 'noisy' }
let search = { ...defaults, food: 'rich' }
// { food: 'rich', price: '$10', ambiance: 'noisy' }
```

## 接口 interface

TypeScript 的核心原则之一是对值所具有的结构进行类型检查，这被称为「结构性子类型化」或「鸭式辨型法」。接口的作用就是为这些结构命名并定义契约。

### 接口初探

```typescript
interface LabelledValue {
  label: string
}

function printLabel(labelledObj: LabelledValue) {
  console.log(labelledObj.label)
}

let myObj = { size: 10, label: 'Size 10 Object' }
printLabel(myObj)
```

类型检查器只关注值的外形，只要传入的对象满足必要条件（属性存在且类型匹配）即可，不关心属性的顺序，也不检查多余的属性。

### 可选属性

在属性名后加 `?` 表示可选属性。可选属性既可以预定义可能存在的属性，也能捕获引用了不存在属性的错误：

```typescript
interface SquareConfig {
  color?: string
  width?: number
}
```

### 只读属性

用 `readonly` 指定只能在创建时赋值的只读属性；`ReadonlyArray<T>` 去掉了所有可变方法：

```typescript
interface Point {
  readonly x: number
  readonly y: number
}
let p1: Point = { x: 10, y: 20 }
p1.x = 5 // error!

let a: number[] = [1, 2, 3, 4]
let ro: ReadonlyArray<number> = a
ro[0] = 12 // error!
ro.push(5) // error!
a = ro // error! 需要用类型断言重写
a = ro as number[]
```

**readonly vs const**：作为变量使用用 `const`，作为属性使用用 `readonly`。

### 额外的属性检查

对象字面量赋给变量或作为参数传递时，会经过额外属性检查。如果存在目标类型不包含的属性，会报错：

```typescript
interface SquareConfig {
  color?: string
  width?: number
}

// Error: 'colour' 不存在于类型 'SquareConfig' 中
let mySquare = createSquare({ colour: 'red', width: 100 })
```

绕开检查的方式有三种：

1. **类型断言**：`createSquare({ width: 100, opacity: 0.5 } as SquareConfig)`
2. **字符串索引签名**（推荐，当确定对象可能有额外属性时）：

```typescript
interface SquareConfig {
  color?: string
  width?: number
  [propName: string]: any
}
```

3. **赋值给另一个变量**，因为普通变量不会经过额外属性检查。

### 函数类型

接口可以描述函数类型，通过定义一个调用签名（只有参数列表和返回值类型的函数定义）：

```typescript
interface SearchFunc {
  (source: string, subString: string): boolean
}

let mySearch: SearchFunc
mySearch = function(src, sub) {
  let result = src.search(sub)
  return result > -1
}
```

参数名不需要与接口里的名字匹配，参数会逐个按位置检查类型。

### 可索引的类型

接口可以描述能够「通过索引得到」的类型（如 `a[10]` 或 `ageMap['daniel']`）：

```typescript
interface StringArray {
  [index: number]: string
}
let myArray: StringArray = ['Bob', 'Fred']
let myStr: string = myArray[0]
```

TypeScript 支持字符串和数字两种索引签名。若同时使用，数字索引的返回值必须是字符串索引返回值类型的子类型。字符串索引签名也能保证对象所有属性与其返回值类型匹配。

### 类类型：实现接口

接口可以强制一个类符合某种契约：

```typescript
interface ClockInterface {
  currentTime: Date
  setTime(d: Date): void
}

class Clock implements ClockInterface {
  currentTime: Date
  setTime(d: Date) {
    this.currentTime = d
  }
  constructor(h: number, m: number) {}
}
```

接口只检查类实例部分的公共成员，不检查私有成员。当一个类 `implements` 一个带 `new` 构造签名的接口时会报错，因为 `constructor` 属于类的静态部分，不在检查范围内。

### 继承接口

接口可以相互继承，也可以继承多个接口：

```typescript
interface Shape {
  color: string
}
interface PenStroke {
  penWidth: number
}
interface Square extends Shape, PenStroke {
  sideLength: number
}
```

### 混合类型

因为 JavaScript 的动态特性，一个对象可以同时作为函数和对象使用，并带有额外属性：

```typescript
interface Counter {
  (start: number): string
  interval: number
  reset(): void
}
```

### 接口继承类

当接口继承一个类类型时，它会继承类的成员但不包括其实现，同时也会继承 `private` 和 `protected` 成员。此时，该接口只能被这个类或其子类实现。

## 类 class

TypeScript 支持基于类的面向对象编程（ES6 已原生支持，TS 允许现在使用这些特性）。

### 基本示例

```typescript
class Greeter {
  greeting: string
  constructor(message: string) {
    this.greeting = message
  }
  greet() {
    return 'Hello, ' + this.greeting
  }
}

let greeter = new Greeter('world')
```

### 继承

使用 `extends` 关键字继承基类。派生类构造函数中必须调用 `super()`，且在访问 `this` 之前一定要先调用 `super()`：

```typescript
class Animal {
  name: string
  constructor(name: string) {
    this.name = name
  }
  move(distance: number = 0) {
    console.log(`${this.name} moved ${distance}m.`)
  }
}

class Snake extends Animal {
  constructor(name: string) {
    super(name)
  }
  move(distance: number = 5) {
    console.log('Slithering...')
    super.move(distance)
  }
}
```

方法可以被重写（override）。即使变量声明为基类类型，实际调用时也会动态分发到实际实例的（重写）方法。

### 访问修饰符

- **public**：默认的修饰符，可以自由访问：

```typescript
class Animal {
  public name: string
  public constructor(name: string) {
    this.name = name
  }
  public move(distance: number) {}
}
```

- **private**：不能在声明它的类的外部访问。TypeScript 采用结构性类型系统，但当比较包含 `private` 成员的类型时，只有在私有关键字来自同一处声明时，两个类型才兼容：

```typescript
class Animal {
  private name: string
  constructor(name: string) {
    this.name = name
  }
}
new Animal('Cat').name // 错误: 'name' 是私有的

class Rhino extends Animal {}
class Employee {
  private name: string
  constructor(name: string) {}
}
let animal = new Animal('Goat')
let rhino = new Rhino()
let employee = new Employee('Bob')
animal = rhino // OK，共享来自 Animal 的私有成员
animal = employee // 错误，Employee 的私有成员并非来自 Animal
```

- **protected**：与 `private` 类似，但 `protected` 成员在派生类中仍可访问。构造函数标记为 `protected` 时，类不能在外部被实例化，但可以被继承。

### readonly 修饰符与参数属性

`readonly` 属性必须在声明时或构造函数里初始化。**参数属性**可以让我们在一个地方定义并初始化成员：

```typescript
class Person {
  constructor(readonly name: string) {}
}
// 等价于：声明 readonly name + this.name = name

// 还可以用 private / public / protected 限定参数属性
class Employee {
  constructor(private id: number, public name: string) {}
}
```

### 存取器 getters / setters

通过 `get` / `set` 截取对对象成员的访问。注意：只带有 `get` 不带有 `set` 的存取器会自动被推断为 `readonly`。

```typescript
class Employee {
  private _fullName: string
  get fullName(): string {
    return this._fullName
  }
  set fullName(newName: string) {
    this._fullName = newName
  }
}
```

### 静态属性

使用 `static` 定义的成员存在于类本身上（`Grid.xxx`），而非实例上：

```typescript
class Grid {
  static origin = { x: 0, y: 0 }
  scale: number
  constructor(scale: number) {
    this.scale = scale
  }
  calculateDistanceFromOrigin(point: { x: number; y: number }) {
    let xDist = point.x - Grid.origin.x
    let yDist = point.y - Grid.origin.y
    return Math.sqrt(xDist * xDist + yDist * yDist) * this.scale
  }
}
```

### 抽象类

抽象类作为其它派生类的基类，一般不会被直接实例化。与接口不同，抽象类可以包含成员的实现细节。`abstract` 关键字定义抽象类和其中的抽象方法，抽象方法不包含实现且必须在派生类中实现：

```typescript
abstract class Department {
  name: string
  constructor(name: string) {
    this.name = name
  }
  printName(): void {
    console.log('Department name: ' + this.name)
  }
  abstract printMeeting(): void // 必须在派生类中实现
}

class AccountingDepartment extends Department {
  constructor() {
    super('Accounting and Auditing')
  }
  printMeeting(): void {
    console.log('The Accounting Department meets each Monday at 10am.')
  }
}

let department: Department // 允许创建对抽象类型的引用
department = new Department() // 错误: 不能创建抽象类的实例
department = new AccountingDepartment() // OK
```

### 类作为类型 / 把类当接口使用

声明一个类时，同时创建了两样东西：实例的类型和构造函数的值。`typeof Greeter` 取的是 Greeter 类的类型（构造函数类型），而非实例类型。

因为类可以创建出类型，所以可以在允许使用接口的地方使用类：

```typescript
class Point {
  x: number
  y: number
}

interface Point3d extends Point {
  z: number
}

let point3d: Point3d = { x: 1, y: 2, z: 3 }
```

## 函数

函数是 JavaScript 应用程序的基础。TypeScript 为函数添加了类型系统支持。

### 函数类型

为参数和返回值添加类型（也可省略返回值类型，由编译依据 return 语句推断）：

```typescript
function add(x: number, y: number): number {
  return x + y
}

let myAdd = function(x: number, y: number): number {
  return x + y
}
```

完整的函数类型由参数类型和返回值类型组成，使用 `=>` 连接：

```typescript
let myAdd: (baseValue: number, increment: number) => number =
  function(x: number, y: number): number {
    return x + y
  }
```

参数名只是为了可读性，只要参数类型匹配就算有效函数类型。

### 推断类型（按上下文归类）

在赋值语句的一边指定了类型而另一边没有时，TypeScript 会自动识别出类型：

```typescript
let myAdd: (baseValue: number, increment: number) => number =
  function(x, y) {   // x、y 的类型被推断为 number
    return x + y
  }
```

### 可选参数和默认参数

默认情况下每个函数参数都是必须的。使用 `?` 实现可选参数，且可选参数必须跟在必须参数后面：

```typescript
function buildName(firstName: string, lastName?: string): string {
  if (lastName) return firstName + ' ' + lastName
  else return firstName
}
```

为参数提供默认值，则无需放在最后（但若默认参数在必须参数前，传入时需要显式传 `undefined` 才能触发默认值）：

```typescript
function buildName(firstName: string, lastName = 'Smith'): string {
  return firstName + ' ' + lastName
}
```

### 剩余参数

使用 `...` 把所有剩余参数收集到一个数组里：

```typescript
function buildName(firstName: string, ...restOfName: string[]): string {
  return firstName + ' ' + restOfName.join(' ')
}

let buildNameFun: (fname: string, ...rest: string[]) => string = buildName
```

### this 与箭头函数

JavaScript 中 `this` 的值在函数被调用时才会确定。箭头函数能保存函数创建时的 `this` 值，而不是调用时的值：

```typescript
let deck = {
  suits: ['hearts', 'spades', 'clubs', 'diamonds'],
  cards: Array(52),
  createCardPicker: function() {
    return () => {
      // 使用箭头函数，this 指向 deck
      let pickedCard = Math.floor(Math.random() * 52)
      let pickedSuit = Math.floor(pickedCard / 13)
      return { suit: this.suits[pickedSuit], card: pickedCard % 13 }
    }
  }
}
```

### this 参数

`this` 参数是个假参数，出现在参数列表最前面。指定 `this: void` 表示此独立函数中不可用 `this`（用于回调）：

```typescript
function f(this: void) {
  // 确保 "this" 在此独立函数中不可用
}

class Handler {
  type: string
  onClickBad(this: void, e: Event) {
    console.log('clicked!')
  }
}
```

在回调场景下，箭头函数不会捕获 `this`，因此总是可以把它们传给期望 `this: void` 的函数。

### 函数重载

重载为同一个函数提供多个函数类型定义，编译器会根据传入参数选择合适的重载：

```typescript
let suits = ['hearts', 'spades', 'clubs', 'diamonds']

function pickCard(x: { suit: string; card: number }[]): number
function pickCard(x: number): { suit: string; card: number }
function pickCard(x): any {
  if (Array.isArray(x)) {
    let pickedCard = Math.floor(Math.random() * x.length)
    return pickedCard
  } else if (typeof x === 'number') {
    let pickedSuit = Math.floor(x / 13)
    return { suit: suits[pickedSuit], card: x % 13 }
  }
}
```

需要把最精确的定义放在最前面；最后的实现签名（`x: any`）不属于重载列表。

## 泛型

软件工程中既要创建定义良好的 API，也要考虑可重用性。泛型可以让一个组件同时支持多种类型的数据。

### 基础示例

`identity` 函数返回传入的值。使用 `any` 会丢失「传入类型与返回类型相同」的信息，而泛型使用类型变量 `T` 解决了这个问题：

```typescript
function identity<T>(arg: T): T {
  return arg
}
```

使用泛型函数有两种方式，显式传类型参数，或利用类型推断自动确定 `T`：

```typescript
let output = identity<string>('myString')
let output2 = identity('myString') // 类型推断
```

### 使用泛型变量

编译器要求你必须要正确地使用泛型。如果需要操作 `T` 类型数组而不仅是 `T`，可这样写（此时 `.length` 属性存在）：

```typescript
function loggingIdentity<T>(arg: T[]): T[] {
  console.log(arg.length)
  return arg
}
```

### 泛型接口

泛型函数的类型与非泛型函数类似，只是前面加了一个类型参数。我们可以用对象字面量定义泛型函数，进而写出泛型接口：

```typescript
interface GenericIdentityFn<T> {
  (arg: T): T
}

function identity<T>(arg: T): T {
  return arg
}

let myIdentity: GenericIdentityFn<number> = identity
```

### 泛型类

泛型类使用 `<>` 括起泛型类型，跟在类名后面。注意：泛型类型只作用于实例部分，静态属性不能使用泛型类型：

```typescript
class GenericNumber<T> {
  zeroValue: T
  add: (x: T, y: T) => T
}

let myGenericNumber = new GenericNumber<number>()
myGenericNumber.zeroValue = 0
myGenericNumber.add = function(x, y) {
  return x + y
}
```

### 泛型约束

通过 `extends` 关键字约束泛型类型必须满足某个接口（至少包含该属性）：

```typescript
interface Lengthwise {
  length: number
}

function loggingIdentity<T extends Lengthwise>(arg: T): T {
  console.log(arg.length) // OK
  return arg
}

loggingIdentity(3) // Error: number 没有 length
loggingIdentity({ length: 10, value: 3 }) // OK
```

#### 在泛型约束中使用类型参数

可以用一个类型参数约束另一个类型参数，结合 `keyof` 保证属性存在于对象上：

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K) {
  return obj[key]
}

let x = { a: 1, b: 2, c: 3 }
getProperty(x, 'a') // OK
getProperty(x, 'm') // error
```

## 类型推断

类型推断（Type Inference）指在没有明确指出类型的地方，TypeScript 自动推导出类型。

### 基础

在初始化变量、设置默认参数值和决定函数返回值时，类型会被自动推断：

```typescript
let x = 3 // 推断为 number
```

### 最佳通用类型

当从几个表达式中推断类型时，会计算一个兼容所有候选类型的最佳通用类型：

```typescript
let x = [0, 1, null] // 考虑 number 和 null
```

若候选类型没有公共超类型，可显式声明期望的类型：

```typescript
class Animal { numLegs: number }
class Bee extends Animal {}
class Lion extends Animal {}

let zoo: Animal[] = [new Bee(), new Lion()]
// 若不显式声明，结果为联合数组类型 (Bee | Lion)[]
```

### 上下文类型

上下文类型按表达式的类型及所在位置推断。例如 `window.onmousedown` 提供了右侧函数表达式的类型上下文：

```typescript
window.onmousedown = function(mouseEvent) {
  console.log(mouseEvent.clickTime) // Error：mouseEvent 被推断为 MouseEvent
}
```

如果上下文类型表达式包含了明确的类型信息，上下文的类型会被忽略：

```typescript
window.onmousedown = function(mouseEvent: any) {
  console.log(mouseEvent.clickTime) // OK
}
```

## 高级类型

### 交叉类型

交叉类型（`&`）将多个类型合并为一个类型，包含所有类型的特性，常用来做混入（mixin）：

```typescript
function extend<T, U>(first: T, second: U): T & U {
  let result = {} as T & U
  for (let id in first) {
    result[id] = first[id] as any
  }
  for (let id in second) {
    if (!result.hasOwnProperty(id)) {
      result[id] = second[id] as any
    }
  }
  return result
}
```

`Person & Loggable` 同时拥有两者的成员。

### 联合类型

联合类型（`|`）表示一个值可以是几种类型之一：

```typescript
function padLeft(value: string, padding: string | number) {
  // ...
}
```

如果一个值是联合类型，我们只能访问此联合类型所有类型里共有的成员：

```typescript
interface Bird { fly(); layEggs() }
interface Fish { swim(); layEggs() }

let pet: Fish | Bird
pet.layEggs() // OK
pet.swim()    // error，不确定是否为 Fish
```

### 类型守卫（类型保护）

类型守卫是一些在运行时检查以确保某个作用域里类型的表达式。

#### 用户自定义类型保护

定义一个返回类型谓词（`parameterName is Type`）的函数：

```typescript
function isFish(pet: Fish | Bird): pet is Fish {
  return (pet as Fish).swim !== undefined
}

if (isFish(pet)) {
  pet.swim() // 此时 pet 收窄为 Fish
} else {
  pet.fly() // 否则是 Bird
}
```

#### typeof 类型保护

`typeof` 可直接用作类型守卫，识别形式有 `typeof v === "typename"` 和 `typeof v !== "typename"`。`typename` 必须是 `"number"`、`"string"`、`"boolean"` 或 `"symbol"`：

```typescript
function padLeft(value: string, padding: string | number) {
  if (typeof padding === 'number') {
    return Array(padding + 1).join(' ') + value
  }
  if (typeof padding === 'string') {
    return padding + value
  }
  throw new Error(`Expected string or number, got '${padding}'.`)
}
```

#### instanceof 类型保护

`instanceof` 通过构造函数来细化类型：

```typescript
if (pet instanceof Bird) {
  pet.fly()
}
if (pet instanceof Fish) {
  pet.swim()
}
```

### 可以为 null 的类型与类型断言

在 `--strictNullChecks` 下，变量不会自动包含 `null` 或 `undefined`，需要显式联合：

```typescript
let s = 'foo'
s = null // 错误
let sn: string | null = 'bar'
sn = null // 可以
```

此时可选参数和可选属性会被自动加上 `| undefined`。

去除 `null` 的方式：
- 使用类型守卫：`if (sn === null) ... else ...`
- 使用短路运算符：`return sn || 'default'`
- 使用非空断言 `!` 手动去除 `null` 与 `undefined`：

```typescript
function fixed(name: string | null): string {
  return name!.charAt(0) // name! 去除了 null 与 undefined
}
```

### 字符串字面量类型

字符串字面量类型允许指定字符串必须具有的确切值，常与联合类型、类型保护配合，实现类似枚举的效果：

```typescript
type Easing = 'ease-in' | 'ease-out' | 'ease-in-out'

button.animate(0, 0, 'ease-in') // OK
button.animate(0, 0, 'uneasy') // error
```

### 映射类型与索引访问、keyof

`keyof T` 取对象类型所有 key 的联合，索引访问类型 `T[K]` 取对应 key 的值类型。

映射类型基于旧类型创建新类型，例如把每个属性变为可选或只读：

```typescript
type Person = { name: string; age: number }

type Readonly<T> = { readonly [P in keyof T]: T[P] }
type Partial<T> = { [P in keyof T]?: T[P] }

type ReadonlyPerson = Readonly<Person>
type PartialPerson = Partial<Person>
```

以上 `Readonly`、`Partial` 等正是 TypeScript 内置的映射类型。

### 条件类型

条件类型 `T extends U ? X : Y` 根据类型关系选择结果类型，常用于高级类型推导：

```typescript
type IsString<T> = T extends string ? true : false

type A = IsString<'hello'> // true
type B = IsString<number> // false
```

条件类型配合 `infer` 可以提取函数的返回类型，这正是内置工具类型 `ReturnType` 的实现思路：

```typescript
type MyReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : never

type Fn = (a: number, b: string) => boolean
type R = MyReturnType<Fn> // boolean
```

### 内置工具类型

TypeScript 内置了大量实用工具类型，这里列举常用的几个：

**Pick**：从类型中挑选一组属性。

```typescript
type Person = { name: string; age: number; email: string }
type NameAndAge = Pick<Person, 'name' | 'age'>
// { name: string; age: number }
```

**Omit**：从类型中忽略一组属性（与 Pick 相反）。

```typescript
type WithoutEmail = Omit<Person, 'email'>
// { name: string; age: number }
```

**Partial**：将所有属性变为可选。

```typescript
type PartialPerson = Partial<Person>
// { name?: string; age?: number; email?: string }
```

**Required**：将所有属性变为必选（与 Partial 相反）。

**Readonly**：将所有属性变为只读。

```typescript
type ReadonlyPerson = Readonly<Person>
```

**Record**：以联合类型的 keys 构造新类型，每个 key 的值类型相同。

```typescript
type PageInfo = { title: string }
type Page = 'home' | 'about' | 'contact'

const nav: Record<Page, PageInfo> = {
  home: { title: 'Home' },
  about: { title: 'About' },
  contact: { title: 'Contact' }
}
```

**ReturnType**：获取函数类型的返回值类型。

```typescript
type Fn = (a: number) => string
type R = ReturnType<Fn> // string
```

其它常用内置类型还有 `Exclude<T, U>`、`Extract<T, U>`、`NonNullable<T>`、`Parameters<T>`、`InstanceType<T>` 等，它们共同构成了 TypeScript 高效的类型运算基础设施。

## 最小实现：用 Demo 验证原理

到 `code/frontend/05-typescript` 启动后打开 `structural.html`（结构类型）、`union-intersection.html`（联合/交叉）、`generic-infer.html`（泛型与 infer）、`utility-practice.html`（手写 Partial/Exclude）。原理一句话：interface、联合交叉、泛型、映射/条件类型都只存在于**编译期**，运行时执行的仍是普通 JS，所以这些 demo 用 JS 对象把类型概念"可视化"出来即可直观看到它们的含义。

## 面试衔接

本节对应 `90-附录-面试体系` 的「TypeScript 基础」阶段（第六阶段 38-42）与「TypeScript 进阶」阶段（第七阶段 84-86）：结构类型、`interface` vs `type`、`never` 与工具类型、泛型/`infer`、映射与条件类型。做真题自测后，进入下一节 `02-TypeScript 工程实践`。