/**
 * 业务数据与两种计算方式
 * heavyAggregate 是「一次干完」，sliceAggregate 是「切成片干完」——用来对照长任务
 */
const TAGS = ['加急', '预售', '优惠', '海外', '自营']

export function makeItems(count) {
    const out = new Array(count)
    for (let i = 0; i < count; i++) {
        out[i] = {
            id: i + 1,
            name: `订单 ${i + 1}`,
            price: (((i * 37) % 900) / 10 + 9).toFixed(1),
            tag: TAGS[i % TAGS.length],
            score: (i * 97) % 1000
        }
    }
    return out
}

/** 同步版：三趟全量遍历 + 一次排序，把主线程整块占住 */
export function heavyAggregate(items) {
    let sum = 0
    let max = 0
    for (const it of items) {
        sum += Number(it.price)
        if (Number(it.price) > max) max = Number(it.price)
    }
    const buckets = {}
    for (const it of items) buckets[it.tag] = (buckets[it.tag] || 0) + Number(it.price)
    const sorted = [...items].sort((a, b) => b.score - a.score)
    return { sum: Math.round(sum), max, buckets, top: sorted.slice(0, 5).map(it => it.name) }
}

/**
 * 分片版：每片 200 条，片与片之间用 MessageChannel 让出主线程
 * 为什么不用 setTimeout(0)：它有 4ms clamping，片数一多（2000/200=10 片）就白等 40ms
 */
export function sliceAggregate(items, chunk = 200) {
    return new Promise(resolve => {
        let i = 0
        let sum = 0
        let max = 0
        const buckets = {}
        const channel = new MessageChannel()
        const step = () => {
            const end = Math.min(i + chunk, items.length)
            for (; i < end; i++) {
                const price = Number(items[i].price)
                sum += price
                if (price > max) max = price
                buckets[items[i].tag] = (buckets[items[i].tag] || 0) + price
            }
            if (i < items.length) return channel.port2.postMessage(0)
            channel.port2.close()
            const sorted = [...items].sort((a, b) => b.score - a.score)
            resolve({ sum: Math.round(sum), max, buckets, top: sorted.slice(0, 5).map(it => it.name) })
        }
        channel.port1.onmessage = step
        step()
    })
}
