export interface Person {
    first: string
    last: string
}

export function formatName(p: Person): string {
    return `${p.first} ${p.last}`
}

export function repeat(s: string, n: number): string {
    return Array.from({ length: n }, () => s).join(' ')
}

// 没人用 —— 看它会不会进产物
export function unused() {
    return '这段不应该出现在产物里'
}
