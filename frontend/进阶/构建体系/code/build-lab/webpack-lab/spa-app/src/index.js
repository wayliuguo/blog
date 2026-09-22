import './main.css'

// 路由级懒加载：import() 一定能切成独立 chunk，首屏不加载
async function loadHome() {
    const { home } = await import('./pages/home.js')
    document.getElementById('root').textContent = home()
}

loadHome()
