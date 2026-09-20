/**
 * 数据源：把「快数据」和「慢数据」分开，是流式渲染能成立的前提。
 * 一次性 loadData() 会把慢的也拖进来（非流式 SSR 的做法）；拆开之后才能分批下发。
 */
import { REVIEWS_LATENCY } from './components/reviews.mjs'
import { RECOMMEND_LATENCY } from './components/recommend.mjs'

export { REVIEWS_LATENCY, RECOMMEND_LATENCY }

const NAMES = [
    '手冲咖啡套装',
    '陶瓷马克杯',
    '冷萃咖啡液',
    '手摇磨豆机',
    '保温杯 480ml',
    '滤纸 100 张',
    '电子秤（0.1g）',
    '奶泡壶'
]

const CITIES = ['上海', '杭州', '成都', '深圳', '南京', '广州', '苏州', '武汉']

/** 商品与页头：本机立即可得，代表「一次同步查询就能拿到的数据」 */
export function loadShell() {
    return {
        title: '渲染架构实验台',
        city: '杭州',
        sloganIndex: 3,
        likes: 42,
        products: NAMES.map((name, i) => ({
            id: i + 1,
            name,
            price: 1990 + i * 1350,
            stock: 12 + i * 7,
            city: CITIES[i]
        }))
    }
}

const REVIEWS = [
    { user: '阿茶', text: '磨豆机比想象中稳，手冲终于不苦了', stars: 5 },
    { user: '小满', text: '杯子手感好，就是包装有点简陋', stars: 4 },
    { user: '老周', text: '冷萃液放冰箱三天，风味还在', stars: 5 },
    { user: 'Nina', text: '滤纸尺寸对不上我家的壶，退货很快', stars: 3 },
    { user: '方糖', text: '电子秤反应快，小数点后一位够用', stars: 4 }
]

const RECOMMEND = [{ name: '云南日晒豆 250g' }, { name: '玻璃分享壶' }, { name: '咖啡渣收纳盒' }]

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

/** 慢接口一：评价服务 */
export async function loadReviews(latency = REVIEWS_LATENCY) {
    await wait(latency)
    return REVIEWS
}

/** 慢接口二：推荐服务（比评价快，用来展示乱序补位） */
export async function loadRecommend(latency = RECOMMEND_LATENCY) {
    await wait(latency)
    return RECOMMEND
}

/**
 * 一次性取全：非流式 SSR / SSG 构建 / ISR 回源都用它。
 * 它是「最慢的那个决定一切」的形态 —— 两个接口并发发，但整体耗时等于更慢的那个。
 */
export async function loadAll(latency = REVIEWS_LATENCY) {
    const [reviews, recommend] = await Promise.all([loadReviews(latency), loadRecommend(Math.round(latency / 2))])
    return { ...loadShell(), reviews, recommend }
}
