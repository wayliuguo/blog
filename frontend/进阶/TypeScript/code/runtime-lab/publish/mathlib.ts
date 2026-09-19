// 一个会被"发布"的极简带类型库：消费者拿到的不是这份 .ts，而是它编译出的 .d.ts
export interface Vec2 {
    x: number
    y: number
}

export type Id = string & { readonly __brand: 'Id' }

export function add(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x + b.x, y: a.y + b.y }
}
