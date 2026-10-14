// 等比缩放：大屏分辨率适配的主流方案。
// 设计稿 1920×1080，运行时算 scale = min(窗口宽/1920, 窗口高/1080)，
// 等比缩放保形状，居中后四周留黑边（XY 独立缩放能铺满但会拉伸变形）。
import { onMounted, onUnmounted } from 'vue'

export const DESIGN = { w: 1920, h: 1080 }

export function useFitScreen(elRef) {
  const fit = () => {
    const sx = window.innerWidth / DESIGN.w
    const sy = window.innerHeight / DESIGN.h
    const s = Math.min(sx, sy)
    // 等比缩放 + 居中。注意 transform-origin 必须用 left top：
    // 若保持默认 center，translate(-50%,-50%) 的位移会被 scale 放大，
    // 视口比例与设计稿不一致时整体会向右下漂移（实测踩坑）。
    elRef.value.style.transformOrigin = 'left top'
    const dx = (window.innerWidth - DESIGN.w * s) / 2
    const dy = (window.innerHeight - DESIGN.h * s) / 2
    elRef.value.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`
  }
  onMounted(() => {
    fit()
    window.addEventListener('resize', fit)
  })
  onUnmounted(() => window.removeEventListener('resize', fit))
}
