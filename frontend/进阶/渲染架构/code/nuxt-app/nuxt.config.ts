export default defineNuxtConfig({
  devtools: { enabled: false },
  compatibilityDate: '2024-11-01',
  routeRules: {
    // 混合渲染演示：同一份工程里按路径声明渲染模式
    '/client-only': { ssr: false }, // 纯 CSR：不服务端渲染
    '/orders/**': { swr: 10 }, // SWR：等价 ISR，10 秒后台重建
  },
})
