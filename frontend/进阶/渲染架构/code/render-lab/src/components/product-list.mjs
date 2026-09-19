/** 商品列表：静态内容，但带 data-marker 供页面侧记录「内容什么时候出现在 DOM 里」 */
import { h } from '../vdom.mjs'
import { formatPrice } from '../lib/price.mjs'

export function ProductList({ products, priceOf = formatPrice }) {
    return h(
        'section',
        { class: 'products', 'data-marker': 'products' },
        h('h2', null, `在售商品 · ${products.length} 件`),
        h(
            'ul',
            null,
            products.map((item) =>
                h(
                    'li',
                    { class: 'card', 'data-id': item.id },
                    h('strong', null, item.name),
                    h('span', { class: 'price' }, priceOf(item.price)),
                    h('span', { class: 'meta' }, `${item.city} · 库存 ${item.stock}`)
                )
            )
        )
    )
}
