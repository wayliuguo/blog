<script setup>
/**
 * 详情路由（优化前实现）
 *   主图 —— 不带 width/height：图片到位时把下面的内容顶下去（视觉层 CLS）
 *   图集 —— 12 张全部立即加载：首屏之外的图也在首屏抢带宽（加载层）
 *   字体 —— 回退字体未做度量校准：webfont 晚到换字时文字块重排
 *   动画 —— 展开面板写 top（布局属性）：每帧都触发重新布局
 */
import { ref, onMounted } from 'vue'
import { makeItems, heavyAggregate } from '../lib/store.js'

// 主图是本地静态 SVG（public/lab-assets/hero.svg）。想放大「图有没有提前占位」的差异，
// 在 DevTools → Network 开 Slow 3G 即可（手动对照实验不依赖任何本地服务）。
const hero = '/lab-assets/hero.svg'
// 12 张约 21KB 的本地 SVG（public/lab-assets/shot0..11.svg）。尺寸一律写死：
// 图集本身的位移不是这一层的变量，量到 CLS 上去的应该只有主图那张。
const shots = Array.from({ length: 12 }, (_, i) => `/lab-assets/shot${i}.svg`)
const lines = ref([])

/* ------------------------------------------------------------------ *
 * 字体：webfont 800ms 后才可用（等价于字体文件下载完），换字时文字块重排
 * 这里用 FontFace API 决定「字体什么时候可用」：本机 localhost 传什么都只要几毫秒，
 * 走真网络反而测不出「晚到」这个时序。
 * before 的问题：回退字体是系统字体，度量与 webfont 不一样，换字必然重排。
 * ------------------------------------------------------------------ */
const FONT_SRC = 'local("Courier New"), local("Courier"), local("DejaVu Sans Mono")'
const fontStack = "'DemoFont', system-ui, 'Microsoft YaHei', sans-serif"
const fxText = ref(null)
const fxSpan = ref(null)
/** 量「同一段文字在两个字体下占多宽」：这一列是连续变化的，
 *  而文字块高度只在跨过折行边界时才跳一下 —— 凭高度判读会漏掉小位移 */
const SAMPLE = 'Hamburgefonstiv 0123456789 mnopqrst'
/** 一段英文 + 数字，重复 4 遍：等宽 webfont 与系统回退字体的行数差要这么长才明显 */
const TEXT =
    'The quick brown fox jumps over the lazy dog 0123456789. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '.repeat(
        4
    )

const settle = (ms = 200) => new Promise(r => setTimeout(r, ms))
const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(performance.now()))))
const raf = () => new Promise(r => requestAnimationFrame(r))

async function swapFont() {
    const box = () => ({
        h: fxText.value.getBoundingClientRect().height,
        w: fxSpan.value.getBoundingClientRect().width
    })
    const b0 = box()
    await settle(800)
    try {
        const face = new FontFace('DemoFont', FONT_SRC)
        document.fonts.add(await face.load())
    } catch (err) {
        console.info('[perf-lab] 字体对照 · 加载失败', { error: String((err && err.message) || err) })
        return
    }
    // 换字重排要等下一帧布局算完才进 layout-shift 条目
    await nextFrame()
    const b1 = box()
    console.info('[perf-lab] 字体对照 · webfont 换字', {
        sizeAdjust: false,
        textHBefore: Math.round(b0.h),
        textHAfter: Math.round(b1.h),
        deltaH: Math.round(b1.h - b0.h),
        advanceBefore: Math.round(b0.w * 10) / 10,
        advanceAfter: Math.round(b1.w * 10) / 10
    })
}

/* ------------------------------------------------------------------ *
 * 动画：同一段 320px 的展开位移，before 写 top —— 布局属性，
 * 每帧都要重新算布局；after 版写 transform（合成属性）。
 * ------------------------------------------------------------------ */
const sheet = ref(null)
const SHEET_H = 320
let expanded = false

async function expand() {
    if (expanded) return
    expanded = true
    const el = sheet.value
    const frames = 20
    const t0 = performance.now()
    for (let i = 0; i <= frames; i++) {
        el.style.top = `${Math.round(-SHEET_H * (1 - i / frames))}px`
        await raf()
    }
    await nextFrame()
    const ms = performance.now() - t0
    console.info('[perf-lab] 动画对照 · 展开 320px', {
        prop: 'top',
        animMs: Math.round(ms),
        frameMs: Math.round(ms / (frames + 1))
    })
}

onMounted(() => {
    lines.value = heavyAggregate(makeItems(400)).top
    swapFont()
})
</script>

<template>
    <section class="view" data-route="detail">
        <div class="bar">
            <button @click="expand">展开面板（动画写 top）</button>
            <span class="meta">订单详情 · 主图不带尺寸 · 图集 12 张全部立即加载</span>
        </div>
        <!-- 主图没有 width/height：浏览器不知道它占多大，图片到位时把下面的内容顶下去 -->
        <img class="hero" :src="hero" alt="商品主图" />
        <div class="lines">
            <p v-for="line in lines" :key="line">{{ line }}</p>
        </div>
        <!-- 图集全部立即加载：首屏之外的 11 张也在首屏抢带宽 -->
        <div class="shots">
            <img v-for="src in shots" :key="src" :src="src" :width="320" :height="240" alt="" />
        </div>
        <div ref="fxText" class="fx-text" :style="{ fontFamily: fontStack }">
            <p>{{ TEXT }}</p>
        </div>
        <p class="fx-sample" :style="{ fontFamily: fontStack }">
            同一段文字的推进宽度：<span ref="fxSpan">{{ SAMPLE }}</span>
        </p>
        <div class="fx-sheet-wrap">
            <div ref="sheet" class="fx-sheet fx-sheet-top" :style="{ height: SHEET_H + 'px' }">这一块是动画面板</div>
        </div>
    </section>
</template>
