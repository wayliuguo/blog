// pages/about.tsx —— 纯静态页：没有任何取数，load 缺省时服务端直接渲染
export default function About() {
    return (
        <main>
            <h1>关于本站</h1>
            <p>这是一个手写 mini-next 演示站：文件路由 + SSR + hydration。</p>
            <a href="/">返回列表</a>
        </main>
    )
}
