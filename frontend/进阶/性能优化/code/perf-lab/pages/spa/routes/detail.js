/**
 * 详情路由：一张大图 + 一段聚合
 * 未优化版图片不带宽高也不懒加载 → 图片到位时把下面的内容顶下去（CLS）
 */
import { ref, computed, onMounted } from '/vendor/vue.js'
import { makeItems, heavyAggregate, sliceAggregate } from '../store.js'
import { flag } from '../options.js'

export default {
    name: 'DetailView',
    template: `
    <section class="view" data-route="detail">
        <div class="bar"><span class="meta">订单详情 · 主图 {{ imgopt ? '带尺寸 + 懒加载' : '无尺寸 + 立即加载' }}</span></div>
        <img class="hero" :src="hero" v-bind="imgAttrs" alt="商品主图" />
        <div class="lines">
            <p v-for="line in lines" :key="line">{{ line }}</p>
        </div>
    </section>`,
    setup() {
        const imgopt = flag('imgopt', true)
        const slice = flag('slice', true)
        // kbps=800：按 800kbps 慢发，把「图有没有提前占位」的差异放大到肉眼可见
        const hero = '/asset?name=hero.svg&kb=120&kbps=800'
        // 关键区别：有 width/height，浏览器在图片到位前就预留出位置
        const imgAttrs = computed(() => (imgopt ? { width: 640, height: 240, loading: 'lazy', decoding: 'async' } : {}))
        const lines = ref([])

        onMounted(async () => {
            const items = makeItems(400)
            const agg = slice ? await sliceAggregate(items) : heavyAggregate(items)
            lines.value = agg.top
            window.__spa.detailReady = true
        })

        return { imgopt, hero, imgAttrs, lines }
    }
}
