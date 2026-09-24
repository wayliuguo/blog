/**
 * 报表引擎：一个「低频但重」的页面所依赖的模块
 *
 * 它存在的意义不是业务价值，而是让「路由级代码分割」有东西可拆 ——
 * 真实项目里被拆出去的不是十几行的组件，而是整页的图表 / 透视 / 导出能力。
 * 这个文件里全是真代码（没有用注释灌水凑体积），体量来自那些必须写出来的字典与算法。
 */

/** 指标字典：每个指标要参与透视、排序、异常检测，所以连口径和方向都得声明 */
export const METRICS = [
    { key: 'gmv', label: '成交额', unit: '元', agg: 'sum', better: 'up', digits: 2 },
    { key: 'orders', label: '订单数', unit: '笔', agg: 'sum', better: 'up', digits: 0 },
    { key: 'aov', label: '客单价', unit: '元', agg: 'avg', better: 'up', digits: 2 },
    { key: 'buyers', label: '下单人数', unit: '人', agg: 'sum', better: 'up', digits: 0 },
    { key: 'refund', label: '退款额', unit: '元', agg: 'sum', better: 'down', digits: 2 },
    { key: 'refundRate', label: '退款率', unit: '%', agg: 'ratio', better: 'down', digits: 2 },
    { key: 'stockout', label: '缺货数', unit: '件', agg: 'sum', better: 'down', digits: 0 },
    { key: 'fulfilHours', label: '履约时长', unit: '小时', agg: 'avg', better: 'down', digits: 1 },
    { key: 'uv', label: '访客数', unit: '人', agg: 'sum', better: 'up', digits: 0 },
    { key: 'cvr', label: '转化率', unit: '%', agg: 'ratio', better: 'up', digits: 2 },
    { key: 'cartRate', label: '加购率', unit: '%', agg: 'ratio', better: 'up', digits: 2 },
    { key: 'payRate', label: '支付率', unit: '%', agg: 'ratio', better: 'up', digits: 2 },
    { key: 'newBuyers', label: '新客数', unit: '人', agg: 'sum', better: 'up', digits: 0 },
    { key: 'oldBuyers', label: '老客数', unit: '人', agg: 'sum', better: 'up', digits: 0 },
    { key: 'repeatRate', label: '复购率', unit: '%', agg: 'ratio', better: 'up', digits: 2 },
    { key: 'coupon', label: '优惠金额', unit: '元', agg: 'sum', better: 'down', digits: 2 },
    { key: 'couponRate', label: '优惠占比', unit: '%', agg: 'ratio', better: 'down', digits: 2 },
    { key: 'freight', label: '运费', unit: '元', agg: 'sum', better: 'down', digits: 2 },
    { key: 'margin', label: '毛利', unit: '元', agg: 'sum', better: 'up', digits: 2 },
    { key: 'marginRate', label: '毛利率', unit: '%', agg: 'ratio', better: 'up', digits: 2 },
    { key: 'cac', label: '获客成本', unit: '元', agg: 'avg', better: 'down', digits: 2 },
    { key: 'roi', label: '投产比', unit: '', agg: 'ratio', better: 'up', digits: 2 },
    { key: 'impressions', label: '曝光量', unit: '次', agg: 'sum', better: 'up', digits: 0 },
    { key: 'clicks', label: '点击量', unit: '次', agg: 'sum', better: 'up', digits: 0 },
    { key: 'ctr', label: '点击率', unit: '%', agg: 'ratio', better: 'up', digits: 2 },
    { key: 'cpc', label: '点击成本', unit: '元', agg: 'avg', better: 'down', digits: 2 },
    { key: 'cpm', label: '千次曝光成本', unit: '元', agg: 'avg', better: 'down', digits: 2 },
    { key: 'visitDepth', label: '访问深度', unit: '页', agg: 'avg', better: 'up', digits: 2 },
    { key: 'dwellSeconds', label: '停留时长', unit: '秒', agg: 'avg', better: 'up', digits: 0 },
    { key: 'bounceRate', label: '跳出率', unit: '%', agg: 'ratio', better: 'down', digits: 2 },
    { key: 'cancelRate', label: '取消率', unit: '%', agg: 'ratio', better: 'down', digits: 2 },
    { key: 'complaint', label: '投诉数', unit: '件', agg: 'sum', better: 'down', digits: 0 },
    { key: 'nps', label: '净推荐值', unit: '', agg: 'avg', better: 'up', digits: 1 },
    { key: 'reviewScore', label: '评价分', unit: '分', agg: 'avg', better: 'up', digits: 2 },
    { key: 'skuActive', label: '在架 SKU', unit: '个', agg: 'sum', better: 'up', digits: 0 },
    { key: 'turnoverDays', label: '周转天数', unit: '天', agg: 'avg', better: 'down', digits: 1 }
]

/** 维度字典：透视的轴。label 是要渲染在表头与图例里的，所以不能省 */
export const DIMENSIONS = {
    channel: {
        label: '销售渠道',
        values: [
            ['app', 'App 端'],
            ['miniapp', '小程序'],
            ['h5', 'H5'],
            ['pc', 'PC 商城'],
            ['store', '线下门店'],
            ['live', '直播间'],
            ['group', '社群团购'],
            ['partner', '渠道分销']
        ]
    },
    region: {
        label: '区域',
        values: [
            ['east', '华东'],
            ['north', '华北'],
            ['south', '华南'],
            ['central', '华中'],
            ['southwest', '西南'],
            ['northwest', '西北'],
            ['northeast', '东北'],
            ['overseas', '海外']
        ]
    },
    category: {
        label: '品类',
        values: [
            ['fresh', '生鲜'],
            ['digital', '数码'],
            ['apparel', '服饰'],
            ['beauty', '美妆'],
            ['home', '家居'],
            ['sports', '运动'],
            ['baby', '母婴'],
            ['food', '食品'],
            ['book', '图书'],
            ['auto', '汽车用品']
        ]
    },
    device: {
        label: '终端',
        values: [
            ['ios', 'iOS'],
            ['android', 'Android'],
            ['harmony', 'HarmonyOS'],
            ['desktop', '桌面浏览器'],
            ['pad', '平板']
        ]
    },
    stage: {
        label: '会话阶段',
        values: [
            ['new', '新客首访'],
            ['returning', '回访'],
            ['loyal', '忠诚复购'],
            ['churn', '流失召回']
        ]
    },
    period: {
        label: '周期',
        values: [
            ['d1', 'T-1'],
            ['d2', 'T-2'],
            ['d3', 'T-3'],
            ['d4', 'T-4'],
            ['d5', 'T-5'],
            ['d6', 'T-6'],
            ['d7', 'T-7']
        ]
    }
}

const labelOf = (dim, value) => {
    const found = DIMENSIONS[dim]?.values.find(v => v[0] === value)
    return found ? found[1] : value
}

/** 确定性伪随机：同一个 seed 永远得到同一批数据，实验才可复现 */
function rng(seed) {
    let state = seed >>> 0
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0
        return state / 4294967296
    }
}

/** 造一批明细行：每个维度组合一行，指标值按维度权重与随机扰动生成 */
export function generateRows(seed = 7, scales = {}) {
    const rand = rng(seed)
    const rows = []
    for (const channel of DIMENSIONS.channel.values) {
        for (const region of DIMENSIONS.region.values) {
            const weight = (scales[channel[0]] || 1) * (region[0] === 'east' ? 1.6 : 1) * (0.6 + rand())
            const gmv = Math.round(weight * 48000 * (0.7 + rand() * 0.6))
            const orders = Math.max(1, Math.round(gmv / (90 + rand() * 160)))
            rows.push({
                channel: channel[0],
                region: region[0],
                category: DIMENSIONS.category.values[Math.floor(rand() * 10)][0],
                device: DIMENSIONS.device.values[Math.floor(rand() * 5)][0],
                stage: DIMENSIONS.stage.values[Math.floor(rand() * 4)][0],
                period: DIMENSIONS.period.values[Math.floor(rand() * 7)][0],
                gmv,
                orders,
                aov: gmv / orders,
                buyers: Math.round(orders * (0.72 + rand() * 0.2)),
                uv: Math.round(orders * (9 + rand() * 14)),
                cvr: (orders / Math.max(1, Math.round(orders * (9 + rand() * 14)))) * 100,
                refund: Math.round(gmv * (0.01 + rand() * 0.06)),
                complaint: Math.round(orders * rand() * 0.01),
                margin: Math.round(gmv * (0.12 + rand() * 0.24)),
                coupon: Math.round(gmv * rand() * 0.08),
                freight: Math.round(orders * (5 + rand() * 12)),
                stockout: Math.round(rand() * 120),
                fulfilHours: 12 + rand() * 40,
                reviewScore: 3.8 + rand() * 1.2,
                nps: Math.round(rand() * 90 - 20)
            })
        }
    }
    return rows
}

/** 按维度聚合：sum / avg / ratio 三种口径，ratio 用「分子列 / 分母列」算 */
export function pivot(rows, dim, metricKeys) {
    const buckets = new Map()
    for (const row of rows) {
        const key = row[dim]
        if (!buckets.has(key)) buckets.set(key, [])
        buckets.get(key).push(row)
    }
    const out = []
    for (const [key, group] of buckets) {
        const record = { key, label: labelOf(dim, key), count: group.length }
        for (const mk of metricKeys) {
            record[mk] = aggregate(group, mk)
        }
        out.push(record)
    }
    return out.sort((a, b) => (b[metricKeys[0]] || 0) - (a[metricKeys[0]] || 0))
}

export function aggregate(rows, metricKey) {
    const def = METRICS.find(m => m.key === metricKey)
    if (!def || !rows.length) return 0
    const total = rows.reduce((sum, r) => sum + (Number(r[metricKey]) || 0), 0)
    if (def.agg === 'avg') return total / rows.length
    if (def.agg === 'ratio') {
        // 比率类指标要按「总分子 / 总分母」重算，直接平均单行比率是错的
        const pair = RATIO_PAIRS[metricKey]
        if (!pair) return total / rows.length
        const num = rows.reduce((s, r) => s + (Number(r[pair[0]]) || 0), 0)
        const den = rows.reduce((s, r) => s + (Number(r[pair[1]]) || 0), 0)
        return den ? (num / den) * (pair[2] || 1) : 0
    }
    return total
}

/** 比率指标的分子 / 分母 / 放大倍数：算错这一步，报表整页都是错的 */
export const RATIO_PAIRS = {
    refundRate: ['refund', 'gmv', 100],
    cvr: ['orders', 'uv', 100],
    cartRate: ['buyers', 'uv', 100],
    payRate: ['orders', 'buyers', 100],
    repeatRate: ['buyers', 'uv', 100],
    couponRate: ['coupon', 'gmv', 100],
    marginRate: ['margin', 'gmv', 100],
    roi: ['gmv', 'coupon', 1],
    ctr: ['clicks', 'impressions', 100],
    bounceRate: ['stockout', 'uv', 100],
    cancelRate: ['refund', 'orders', 100]
}

/** 环比：与前一个周期比，返回百分比变化 */
export function comparePeriods(rows, dim, metricKey, left, right) {
    const pick = period => rows.filter(r => r.period === period)
    const a = aggregate(pick(left), metricKey)
    const b = aggregate(pick(right), metricKey)
    if (!b) return { left: a, right: b, change: null }
    return { left: a, right: b, change: ((a - b) / b) * 100 }
}

/** 取 TopN，并算出它占整体的比例 */
export function topN(items, key, n = 5) {
    const sorted = [...items].sort((a, b) => (b[key] || 0) - (a[key] || 0))
    const total = sorted.reduce((sum, it) => sum + (Number(it[key]) || 0), 0)
    return sorted.slice(0, n).map(it => ({
        ...it,
        share: total ? ((Number(it[key]) || 0) / total) * 100 : 0
    }))
}

/** 移动平均：报表里抹掉周末尖峰最常用的一招 */
export function movingAverage(series, window = 3) {
    return series.map((_, i) => {
        const from = Math.max(0, i - window + 1)
        const slice = series.slice(from, i + 1)
        return slice.reduce((a, b) => a + b, 0) / slice.length
    })
}

/** 异常检测：以均值和标准差为基准，超出 z 倍标准差就算异常 */
export function detectAnomalies(series, z = 2) {
    if (series.length < 3) return []
    const mean = series.reduce((a, b) => a + b, 0) / series.length
    const variance = series.reduce((sum, v) => sum + (v - mean) ** 2, 0) / series.length
    const sd = Math.sqrt(variance)
    if (!sd) return []
    return series
        .map((value, index) => ({ index, value, z: (value - mean) / sd }))
        .filter(item => Math.abs(item.z) >= z)
        .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
}

/** ASCII 迷你图：不依赖图表库也能把趋势塞进表格里 */
export function sparkline(values, width = 24) {
    if (!values.length) return ''
    const blocks = '▁▂▃▄▅▆▇█'
    const step = Math.max(1, Math.ceil(values.length / width))
    const out = []
    for (let i = 0; i < values.length; i += step) {
        const slice = values.slice(i, i + step)
        const value = slice.reduce((a, b) => a + b, 0) / slice.length
        out.push(value)
    }
    const min = Math.min(...out)
    const max = Math.max(...out)
    const span = max - min || 1
    return out
        .map(v => blocks[Math.min(blocks.length - 1, Math.round(((v - min) / span) * (blocks.length - 1)))])
        .join('')
}

/** 导出 CSV：字段里可能出现逗号与引号，必须转义 */
export function toCSV(rows, columns) {
    const escape = value => {
        const text = value == null ? '' : String(value)
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
    }
    const head = columns.map(c => escape(c.label || c.key)).join(',')
    const body = rows.map(row => columns.map(c => escape(row[c.key])).join(',')).join('\n')
    return `${head}\n${body}`
}

/** 金额格式化：报表里金额一律带千分位，否则一屏数字没法比大小 */
export function formatMoney(value, digits = 2) {
    if (value == null || Number.isNaN(Number(value))) return '—'
    return Number(value)
        .toFixed(digits)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** 据指标方向判断「好 / 差」，报表要上色就得先知道方向 */
export function judge(metricKey, change) {
    const def = METRICS.find(m => m.key === metricKey)
    if (!def || change == null) return 'flat'
    if (Math.abs(change) < 0.5) return 'flat'
    const good = def.better === 'up' ? change > 0 : change < 0
    return good ? 'good' : 'bad'
}

/** 一整张报表：透视 → TopN → 环比 → 异常 → 迷你图，页面直接渲染这个结果 */
export function buildReport(rows, dim, metricKeys, topn = 6) {
    const pivoted = pivot(rows, dim, metricKeys)
    const top = topN(pivoted, metricKeys[0], topn)
    return top.map(item => {
        const series = DIMENSIONS.period.values.map(p =>
            aggregate(
                rows.filter(r => r[dim] === item.key && r.period === p[0]),
                metricKeys[0]
            )
        )
        const diff = comparePeriods(
            rows.filter(r => r[dim] === item.key),
            dim,
            metricKeys[0],
            'd1',
            'd7'
        )
        return {
            ...item,
            change: diff.change,
            judge: judge(metricKeys[0], diff.change),
            trend: sparkline(series),
            anomalies: detectAnomalies(series).slice(0, 2)
        }
    })
}
