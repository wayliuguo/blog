/**
 * 依次跑完所有场景：node cli.mjs all
 * 用来一次拿到全文的实测输出（正文里引用的数字都出自这里）。
 */
export default async function run() {
    const names = ['layers', 'auth', 'upload', 'vscroll', 'request']
    for (const name of names) {
        const mod = await import(new URL(`./${name}.mjs`, import.meta.url))
        await mod.default()
        console.log('')
    }
}
