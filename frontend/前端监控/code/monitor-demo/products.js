// 演示商城的商品数据：纯前端 mock，emoji 当主图，避免无谓的资源请求
export const products = [
    { id: 1, name: '机械键盘', emoji: '⌨️', price: 399, origin: 599, tag: '秒杀' },
    { id: 2, name: '降噪耳机', emoji: '🎧', price: 899, origin: 1299, tag: '新品' },
    { id: 3, name: '机械鼠标', emoji: '🖱️', price: 199, origin: 299, tag: '秒杀' },
    { id: 4, name: '显示器', emoji: '🖥️', price: 1999, origin: 2599, tag: '热卖' },
    { id: 5, name: 'USB-C 扩展坞', emoji: '🔌', price: 149, origin: 229, tag: '' },
    { id: 6, name: '桌面升降架', emoji: '🪑', price: 649, origin: 899, tag: '秒杀' }
]

// 秒杀倒计时起点：距开抢 1 分 47 秒
export const SECKILL_COUNTDOWN = 107
