export interface Vec2 {
    x: number
    y: number
}
export type Id = string & {
    readonly __brand: 'Id'
}
export declare function add(a: Vec2, b: Vec2): Vec2
