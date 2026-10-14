// 手写 React 自定义元素 wrapper：React 官方没有 defineCustomElement，
// 这 30 行就是 Web Components 方案章"React 侧最小实现"的全部。
import { StrictMode, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from './App'
// ?inline：lib 构建默认抽独立 css，shadow DOM 里必须用字符串注入
import appStyle from './app.css?inline'

class OrderDetailElement extends HTMLElement {
    static get observedAttributes() { return ['order-id'] }
    private root: Root | null = null

    connectedCallback() {
        this.mount()
    }
    disconnectedCallback() {
        this.root?.unmount()
        this.root = null
    }
    attributeChangedCallback() {
        // attribute 下行是 WC 方案唯一的 props 通道
        this.mount()
    }
    private mount() {
        const orderId = this.getAttribute('order-id') ?? '1001'
        if (!this.root) {
            // attachShadow：样式与 DOM 彻底封在元素内部——这就是 shadow DOM 隔离
            const shadow = this.attachShadow({ mode: 'open' })
            const style = document.createElement('style')
            style.textContent = appStyle
            shadow.appendChild(style)
            const host = document.createElement('div')
            shadow.appendChild(host)
            this.root = createRoot(host)
        }
        this.root.render(createElement(StrictMode, null, createElement(App, { initialOrderId: orderId })))
    }
}

customElements.define('order-detail-element', OrderDetailElement)
