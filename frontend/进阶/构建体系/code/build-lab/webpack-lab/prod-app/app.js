// 常见生产插件演示入口：引入 CSS，让 MiniCssExtractPlugin 有活可干
import './app.css'

export function boot() {
    const el = document.createElement('div')
    el.className = 'app'
    el.textContent = 'booted'
    return el
}
