<script setup>
/**
 * 详情路由：一张主图 + 一段聚合 + （实验用）一组图集
 * 主图：未优化版不带宽高也不懒加载 → 图片到位时把下面的内容顶下去（CLS）
 * 图集：gallery=1 才渲染，lazy=1 时首屏之外的图交给 loading="lazy"，用来量「懒加载到底省多少」
 *
 * ?act=font 与 ?act=anim 时换成另外两块实验面板：
 *   font  4.2 字体：webfont 晚到，文字换字时会不会重排
 *   anim  4.4 动画：同一段位移，改 top 还是改 transform
 */
import { ref, computed, onMounted } from 'vue'
import { makeItems, heavyAggregate, sliceAggregate } from '../lib/store.js'
import { flag, q } from '../lib/options.js'

const act = q.get('act')
const mode = act === 'font' || act === 'anim' ? act : 'normal'

const imgopt = flag('imgopt', true)
const slice = flag('slice', true)
// 图集默认不渲染：它只服务 images 那个 case，别的 case 不该被它拖慢
const gallery = flag('gallery', false)
const lazy = flag('lazy', false)
// 主图是本地静态 SVG（shared/public/lab-assets/hero.svg）。想放大「图有没有提前占位」的 LCP 差异，
// 在 DevTools → Network 开 Slow 3G 即可（手动对照实验不依赖任何本地服务）。
const hero = '/lab-assets/hero.svg'
// 关键区别：有 width/height，浏览器在图片到位前就预留出位置。
// 主图不加 loading="lazy" —— 它在首屏内，加 lazy 会被降到 Low 优先级，LCP 直接变差
const imgAttrs = computed(() => (imgopt ? { width: 800, height: 300, decoding: 'async' } : {}))
// 12 张约 21KB 的本地 SVG（shared/public/lab-assets/shot0..11.svg）。尺寸一律写死，
// 否则量到的会是 CLS 而不是「懒加载省了多少传输」。每张比主图小（320×240 < 800×300），
// 主图才是 LCP 元素 —— 否则两版渲染的图集不同，LCP 元素会跟着换，这个 case 就同时动了两个变量。
const shots = Array.from({ length: 12 }, (_, i) => `/lab-assets/shot${i}.svg`)
const lines = ref([])

const raf = () => new Promise(r => requestAnimationFrame(r))
/** 到「下一帧画完」：INP 的口径就是事件到下一帧，这里用双 rAF 近似 */
const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(performance.now()))))
const settle = (ms = 200) => new Promise(r => setTimeout(r, ms))

/* ------------------------------------------------------------------ *
 * 4.2 字体：webfont 晚到，换字时会不会把下面的内容顶下去
 *     这里用 FontFace API 决定「字体什么时候可用」，等价于「字体文件什么时候下载完」：
 *     本机 localhost 传什么都只要几毫秒，走真网络反而测不出「晚到」这个时序
 * ------------------------------------------------------------------ */
const szAdjusted = q.get('sz') === '1'
/** sz=1：回退字体先被 size-adjust 调过，度量贴近 webfont，换字时位置几乎不动 */
const fontStack = szAdjusted
    ? "'DemoFont', 'DemoFallback', sans-serif"
    : "'DemoFont', system-ui, 'Microsoft YaHei', sans-serif"
const fxText = ref(null)
const fxSpan = ref(null)
const FONT_SRC = 'local("Courier New"), local("Courier"), local("DejaVu Sans Mono")'
/** 量「同一段文字在两个字体下占多宽」：这一列是连续变化的，
 *  而文字块高度只在跨过折行边界时才跳一下 —— 上一版凭高度判读，两版都是 150px，什么也没测到 */
const SAMPLE = 'Hamburgefonstiv 0123456789 mnopqrst'
/** 一段英文 + 数字，重复到 800 多字符：等宽 webfont 与系统回退字体的行数差要这么长才明显 */
const TEXT =
    ('The quick brown fox jumps over the lazy dog 0123456789. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ').repeat(
        4
    )

/* ------------------------------------------------------------------ *
 * 4.4 动画：同一段位移，改 top（布局属性）还是改 transform（合成属性）
 *     两版的起止位置、时长、帧数完全一样，唯一变量是用哪个属性做动画
 * ------------------------------------------------------------------ */
const animTop = q.get('anim') === 'top'
const sheet = ref(null)
const SHEET_H = 320

window.__spa.exp = {
    /** 先按回退字体渲染 → 800ms 后把 webfont 加进来（等价于字体下完）→ 量宽度与高度怎么变 */
    async font() {
        const out = { sizeAdjust: szAdjusted, webfont: 'DemoFont' }
        const box = () => ({
            h: fxText.value.getBoundingClientRect().height,
            w: fxSpan.value.getBoundingClientRect().width
        })
        const b0 = box()
        out.facesBefore = document.fonts.size
        await settle(800)
        try {
            const face = new FontFace('DemoFont', FONT_SRC)
            document.fonts.add(await face.load())
        } catch (err) {
            out.fontError = String((err && err.message) || err)
        }
        out.facesAfter = document.fonts.size
        // 换字重排要等下一帧布局算完才进 layout-shift 条目
        await nextFrame()
        await nextFrame()
        const b1 = box()
        out.textHBefore = Math.round(b0.h)
        out.textHAfter = Math.round(b1.h)
        out.deltaH = Math.round(b1.h - b0.h)
        out.advanceBefore = Math.round(b0.w * 10) / 10
        out.advanceAfter = Math.round(b1.w * 10) / 10
        return out
    },

    /** 20 帧把面板从「收起」推到「展开」：一版写 top，一版写 transform */
    async anim() {
        const el = sheet.value
        const frames = 20
        const t0 = performance.now()
        for (let i = 0; i <= frames; i++) {
            const px = Math.round(-SHEET_H * (1 - i / frames))
            if (animTop) el.style.top = `${px}px`
            else el.style.transform = `translateY(${px}px)`
            await raf()
        }
        await nextFrame()
        const ms = performance.now() - t0
        return {
            prop: animTop ? 'top' : 'transform',
            sheetH: el.offsetHeight,
            animMs: Math.round(ms),
            frameMs: Math.round(ms / (frames + 1)),
            sheetTop: Math.round(el.getBoundingClientRect().top)
        }
    }
}

onMounted(async () => {
    if (mode !== 'normal') return
    const items = makeItems(400)
    const agg = slice ? await sliceAggregate(items) : heavyAggregate(items)
    lines.value = agg.top
    window.__spa.detailReady = true
})
</script>

<template>
    <!-- 4.2 字体：回退字体先上，webfont 晚到 -->
    <section v-if="mode === 'font'" class="view" data-route="detail">
        <div class="bar">
            <span class="meta">
                webfont 800ms 后才可用 · 回退字体{{ szAdjusted ? '已用 size-adjust 对齐度量' : '未调整度量' }}
            </span>
        </div>
        <div ref="fxText" class="fx-text" :style="{ fontFamily: fontStack }">
            <p>{{ TEXT }}</p>
        </div>
        <p class="fx-sample" :style="{ fontFamily: fontStack }">
            同一段文字的推进宽度：<span ref="fxSpan">{{ SAMPLE }}</span>
        </p>
        <div class="fx-footer">↓ 这段在文字下方：文字块换字后变高变矮，它就会被顶下去或被吸上来</div>
    </section>

    <!-- 4.4 动画：同一段位移，两种属性 -->
    <section v-else-if="mode === 'anim'" class="view" data-route="detail">
        <div class="bar">
            <span class="meta">面板高 {{ SHEET_H }}px · 用 {{ animTop ? 'top' : 'transform' }} 从收起推到展开</span>
        </div>
        <div class="fx-sheet-wrap">
            <div ref="sheet" class="fx-sheet" :class="{ 'fx-sheet-top': animTop }" :style="{ height: SHEET_H + 'px' }">
                这一块是动画面板
            </div>
        </div>
        <div class="fx-footer">↓ 面板在布局里的位置由上面这个占位盒决定，两种动画方式的差别在「元素渲染位置算不算位移」</div>
        <div class="fx-filler">
            <p v-for="n in 12" :key="n">占位内容 {{ n }}：把页面撑长一点，方便观察动画期间的布局开销。</p>
        </div>
    </section>

    <section v-else class="view" data-route="detail">
        <div class="bar">
            <span class="meta">订单详情 · 主图 {{ imgopt ? '带尺寸' : '无尺寸' }}</span>
        </div>
        <img class="hero" :src="hero" v-bind="imgAttrs" alt="商品主图" />
        <div class="lines">
            <p v-for="line in lines" :key="line">{{ line }}</p>
        </div>
        <div v-if="gallery" class="shots">
            <!-- 第 0 张在首屏内，两种写法都立即加载；其余交给 loading="lazy" 决定 -->
            <img
                v-for="(src, i) in shots"
                :key="src"
                :src="src"
                :width="320"
                :height="240"
                :loading="lazy && i > 0 ? 'lazy' : 'eager'"
                alt=""
            />
        </div>
    </section>
</template>
