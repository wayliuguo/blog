// 类型体操训练场的公共工具
// 这些工具本身也是"类型体操"的一部分：用条件类型表达"两个类型是否相等"。

// 判断 A 与 B 是否是同一个类型（结构等价）。
// 思路：构造两个只接收单一类型参数的函数类型，如果它们能互相赋值，说明 A、B 等价。
export type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

// 把"应当成立"的等式包成类型，便于在题目里写 `Expect<Equal<你的答案, 期望>>`。
// 只有成立（true）时才不会报错；不成立则编译失败，正好用来"判题"。
export type Expect<T extends true> = T

// 题目里偶尔需要"断言某个条件为真"，这里顺手给一个布尔版。
export type ExpectTrue<T extends boolean> = T extends true ? true : false

// 未解题的占位符：所有题目的"你的答案"初始都写成 `TODO`，于是等式必然不成立（编译红）。
// 读者把 TODO 换成正确实现后，等式变绿。
export type TODO = never
