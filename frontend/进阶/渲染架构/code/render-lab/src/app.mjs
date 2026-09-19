/**
 * 页面树：服务端、客户端、岛激活三条路径共用同一棵。
 * reviewsSlot / recommendSlot 是留给流式渲染的两个「插入点」——
 * 不传就整棵同步渲染（SSR / SSG / 客户端 hydrate 用），传了就在那里切出边界。
 */
import { h } from './vdom.mjs'
import { Header } from './components/header.mjs'
import { ProductList } from './components/product-list.mjs'
import { Reviews } from './components/reviews.mjs'
import { Recommend } from './components/recommend.mjs'
import { LikeButton } from './components/like-button.mjs'
import { Island } from './island.mjs'

export function App({ data, reviewsSlot, recommendSlot, priceOf }) {
    return h(
        'div',
        { class: 'app' },
        h(Header, { title: data.title, city: data.city, sloganIndex: data.sloganIndex }),
        h(ProductList, { products: data.products, priceOf }),
        reviewsSlot || h(Reviews, { reviews: data.reviews }),
        recommendSlot || h(Recommend, { items: data.recommend }),
        h(Island, { name: 'like-button', props: { likes: data.likes } }, LikeButton({ likes: data.likes }))
    )
}
