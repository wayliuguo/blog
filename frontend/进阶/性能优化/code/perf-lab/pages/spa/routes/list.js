/**
 * 列表路由：2000 条订单
 * 两个开关决定它是「全量渲染 + 同步计算 + 每次滚动都读写布局」还是「虚拟滚动 + 分片计算 + rAF 节流」
 */
import { ref, computed, onMounted, onUnmounted } from '/vendor/vue.js'
import { makeItems, heavyAggregate, sliceAggregate } from '../store.js'
import { flag, N, ROW_H } from '../options.js'

const ROW = `<b>{{ it.name }}</b><span>¥{{ it.price }}</span><i>{{ it.tag }}</i><em>{{ it.score }}</em>`

export default {
    name: 'ListView',
    template: `
    <section class="view" data-route="list">
        <div class="bar">
            <button data-act="sort" @click="onSort">按分数排序（{{ slice ? '分片计算' : '同步计算' }}）</button>
            <span class="meta">{{ items.length }} 条 · 实际渲染 {{ rowsShown }} 行 · 聚合 {{ aggMs }} ms</span>
        </div>
        <div v-if="!virtual" class="rows">
            <div v-for="it in items" :key="it.id" class="row">${ROW}</div>
        </div>
        <div v-else class="viewport" ref="vp" @scroll.passive="onScroll">
            <div class="total" :style="{ height: items.length * ROW_H + 'px' }">
                <div class="rows" :style="{ transform: 'translateY(' + offset + 'px)' }">
                    <div v-for="it in visible" :key="it.id" class="row">${ROW}</div>
                </div>
            </div>
        </div>
    </section>`,
    setup() {
        const virtual = flag('virtual', true)
        const slice = flag('slice', true)
        const throttle = flag('throttle', true)

        const items = ref(makeItems(N))
        const rowsShown = ref(0)
        const aggMs = ref(0)
        const offset = ref(0)
        const start = ref(0)
        const vp = ref(null)
        const visibleCount = 14

        const visible = computed(() => items.value.slice(start.value, start.value + visibleCount))

        // 未节流：每个 scroll 事件都读一次布局（读写交错），滚动时主线程被占死
        // 节流：一帧只算一次，且只在 rAF 里读
        let scheduled = false
        function onScroll() {
            if (!throttle) {
                const top = vp.value.scrollTop
                const h = vp.value.offsetHeight // 故意的：写完就读，强制同步布局
                start.value = Math.floor(top / ROW_H)
                offset.value = start.value * ROW_H
                void h
                return
            }
            if (scheduled) return
            scheduled = true
            requestAnimationFrame(() => {
                scheduled = false
                start.value = Math.floor(vp.value.scrollTop / ROW_H)
                offset.value = start.value * ROW_H
            })
        }

        // 全量渲染时滚动的是整个文档：这里的两种写法差别最明显
        // 未节流：每一行都「写完就读」一次 → 2000 行就是 2000 次强制同步布局
        // 节流：一帧只读一次滚动位置，然后只写一次，不逐行读
        function onWindowScroll() {
            if (throttle) {
                if (scheduled) return
                scheduled = true
                requestAnimationFrame(() => {
                    scheduled = false
                    document.documentElement.style.setProperty('--scroll-y', String(window.scrollY))
                })
                return
            }
            for (const el of document.querySelectorAll('.row')) {
                el.style.transform = `translateX(${el.offsetTop % 3}px)`
            }
        }

        async function onSort() {
            const t0 = performance.now()
            const list = [...items.value].sort((a, b) => b.score - a.score)
            if (slice) {
                const agg = await sliceAggregate(list)
                window.__spa.agg = agg
            } else {
                window.__spa.agg = heavyAggregate(list)
            }
            items.value = list
            aggMs.value = Math.round(performance.now() - t0)
        }

        onMounted(() => {
            rowsShown.value = document.querySelectorAll('.row').length
            window.__spa.rows = rowsShown.value
            if (!virtual) window.addEventListener('scroll', onWindowScroll, { passive: true })
        })

        onUnmounted(() => {
            if (!virtual) window.removeEventListener('scroll', onWindowScroll)
        })

        return { virtual, slice, items, rowsShown, aggMs, offset, vp, visible, onScroll, onSort, ROW_H, start }
    }
}
