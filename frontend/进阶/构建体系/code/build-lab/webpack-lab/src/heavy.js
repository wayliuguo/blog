// 体积大、只被入口引用一次 → 会留在 main chunk 里
const TABLE = Array.from({ length: 500 }, (_, i) => `row-${i}`)

export function heavy() {
    return TABLE.length
}
