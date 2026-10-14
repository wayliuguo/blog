// wc-entry.ts：Web Components 出口。
// defineCustomElement 把 SFC 组件编译成真正的自定义元素：样式注入 shadowRoot、
// props 映射为 attribute。宿主不 import 任何东西，只认识 <order-list-element> 标签。
//
// 关键坑：lib 构建默认把 <style> 抽成独立 css 文件，shadow DOM 里没有样式。
// 必须用 ?inline 把样式变成字符串，通过组件的 styles 选项让 vue 注入 shadowRoot。
import { defineCustomElement } from 'vue'
import OrderList from './App.vue'
import appStyle from './app.css?inline'

export const OrderListElement = defineCustomElement({
    extends: OrderList,
    props: { selectedId: String }, // 宿主 attribute 下行的入口
    styles: [appStyle],
})

customElements.define('order-list-element', OrderListElement)
