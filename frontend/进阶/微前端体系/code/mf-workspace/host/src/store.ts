import { reactive } from 'vue'

// 宿主中枢状态：当前选中的订单 id。
// 五种方案的通信最终都落到这同一个字段上，便于横向对比"同一件事各方案怎么写"。
export const hostState = reactive({
    selectedId: '1001',
    lastChannel: '初始化',
    eventLog: [] as string[],
})

export function logEvent(channel: string, message: string) {
    hostState.lastChannel = channel
    hostState.eventLog.unshift(`${new Date().toLocaleTimeString()} [${channel}] ${message}`)
    if (hostState.eventLog.length > 8) hostState.eventLog.pop()
}

export function setSelectedId(id: string, channel: string) {
    hostState.selectedId = id
    logEvent(channel, `选中订单 ${id}`)
}
