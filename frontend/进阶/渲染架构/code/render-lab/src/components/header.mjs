/** 页头：100% 静态，没有任何事件 —— 岛化之后它连一行 JavaScript 都不需要 */
import { h } from '../vdom.mjs'
import { cities, byName, sloganAt } from '../lib/cities.mjs'

export function Header({ title, city, sloganIndex }) {
    const site = byName(city)
    return h(
        'header',
        { class: 'hd', 'data-marker': 'header' },
        h('h1', null, title),
        h('p', { class: 'sub' }, `${site.name}（${site.code}）· 共 ${cities.length} 个站点在运营`),
        h('p', { class: 'tip' }, sloganAt(sloganIndex))
    )
}
