import { useEffect, useState } from 'react'
import { orderDetails, type OrderDetail } from './data'
import './app.css'

export function App(props: {
    // qiankun mount 注入的生命周期 props：onGlobalStateChange 订阅宿主共享 state
    onGlobalStateChange?: (fn: (state: { selectedId?: string }) => void) => void
    initialOrderId?: string
    initialContainer?: HTMLElement | string
}) {
    const initial =
        new URLSearchParams(location.search).get('orderId') ??
        props.initialOrderId ??
        '1001'
    const [order, setOrder] = useState<OrderDetail | null>(orderDetails[initial] ?? null)
    const [notFound, setNotFound] = useState(!orderDetails[initial])

    // 每种方案一条独立的下行通道，onUnmounted 里逐条清理
    useEffect(() => {
        const applyId = (id: string) => {
            const next = orderDetails[id]
            setOrder(next ?? null)
            setNotFound(!next)
        }

        const onMessage = (e: MessageEvent) => {
            if (typeof e.data === 'object' && e.data?.type === 'order-select') applyId(e.data.orderId)
        }
        const onCustom = (e: Event) => applyId((e as CustomEvent<{ orderId: string }>).detail.orderId)
        const onWujie = (id: string) => applyId(id)
        const onMicroData = (data: Record<string, unknown>) => {
            if (typeof data.orderId === 'string') applyId(data.orderId)
        }

        window.addEventListener('message', onMessage)
        window.addEventListener('order-select', onCustom)
        window.$wujie?.bus.$on('order-select', onWujie)
        window.microApp?.addDataListener(onMicroData)
        props.onGlobalStateChange?.((state) => {
            if (state.selectedId) applyId(state.selectedId)
        })

        return () => {
            window.removeEventListener('message', onMessage)
            window.removeEventListener('order-select', onCustom)
            window.$wujie?.bus.$off?.('order-select', onWujie)
            window.microApp?.removeDataListener?.(onMicroData)
        }
        // props.onGlobalStateChange 在 mount 后只注入一次，不进依赖
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (notFound) {
        return <div className="detail"><p>订单不存在（请从列表选择）</p></div>
    }
    return (
        <div className="detail">
            <header>
                <b>订单详情 · #{order!.id}</b>
                <span className="env">{`react-sub · 环境：${detectEnvName()}`}</span>
            </header>
            <h3>{order!.title}</h3>
            <p className="meta">{`状态：${order!.status} · 下单时间：${order!.created} · 合计 ¥${order!.amount}`}</p>
            <table>
                <thead><tr><th>商品</th><th>数量</th><th>单价</th></tr></thead>
                <tbody>
                    {order!.items.map((it) => (
                        <tr key={it.name}><td>{it.name}</td><td>{it.qty}</td><td>¥{it.price}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function detectEnvName(): string {
    if (window.__POWERED_BY_QIANKUN__) return 'qiankun'
    if (window.$wujie) return 'wujie'
    if (window.microApp) return 'micro-app'
    if (new URLSearchParams(location.search).get('mode') === 'iframe') return 'iframe'
    if (customElements.get('order-detail-element')) return 'web-components'
    return 'standalone'
}

export default App
