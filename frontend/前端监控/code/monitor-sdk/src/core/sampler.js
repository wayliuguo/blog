// 输入：事件类型
// 输出：这条事件要不要放行
// 过程：查 sampleRates[type]，未配置或 ≥1 全量放行，≤0 直接丢弃，否则按比例随机
export function createSampler(cfg) {
    return type => {
        const rate = cfg.sampleRates[type]
        if (rate === undefined || rate >= 1) return true
        if (rate <= 0) return false
        return Math.random() < rate
    }
}
