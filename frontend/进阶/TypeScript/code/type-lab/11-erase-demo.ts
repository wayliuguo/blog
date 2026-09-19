/**
 * 被擦除的样本：11-erase-demo.ts
 *
 * 这不是给 tsc 检查的示例，而是 10-erase.cjs 的输入——
 * 它会被原样编译成 JS，用来展示「类型信息去哪了」。
 */

interface User {
    id: number
    name: string
}

enum Color {
    Red,
    Green
}

function greet(user: User): string {
    return 'hi ' + user.name
}

const color: Color = Color.Green
