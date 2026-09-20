/** 关于路由：一个几乎不耗时的静态页，用来当「低频路由」的代表 */
export default {
    name: 'AboutView',
    template: `
    <section class="view" data-route="about">
        <div class="bar"><span class="meta">关于本实验台</span></div>
        <p>这个页面几乎没有逻辑，它代表的是真实产品里那些「半年没人点一次」的低频路由。</p>
        <p>把它的代码从首屏 bundle 里摘出去，是路由级代码分割收益最确定的一部分。</p>
    </section>`
}
