/**
 * 岛激活：只认 data-island 标记，逐个把对应组件「接管」起来。
 * 不重建整棵树，也不需要页面数据 —— 它的输入只有标记、props 和组件的代码。
 */
import { hydrate, newStats } from './hydrate.mjs'

export function activate(registry, root) {
    const stats = {
        islands: 0,
        missing: 0,
        reused: 0,
        created: 0,
        patched: 0,
        mismatches: 0,
        discarded: 0,
        activated: 0
    }
    for (const el of root.querySelectorAll('[data-island]')) {
        const name = el.getAttribute('data-island')
        const factory = registry[name]
        if (typeof factory !== 'function') {
            stats.missing++
            continue
        }
        const props = JSON.parse(el.getAttribute('data-props') || '{}')
        const sub = hydrate(factory(props), el, newStats())
        stats.islands++
        for (const key of ['reused', 'created', 'patched', 'mismatches', 'discarded', 'activated'])
            stats[key] += sub[key]
    }
    return stats
}
