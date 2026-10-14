// register-micro-apps.ts
// qiankun 全局通信：initGlobalState 建立宿主↔子应用的共享 state。
// 这是 qiankun 特有通道——其他方案不共用这个文件，见各方案视图。
import { initGlobalState } from 'qiankun'
import { hostState, logEvent } from './store'

export const qiankunActions = initGlobalState({ selectedId: hostState.selectedId })

qiankunActions.onGlobalStateChange((state) => {
    if (state.selectedId && state.selectedId !== hostState.selectedId) {
        hostState.selectedId = state.selectedId
        logEvent('qiankun', `onGlobalStateChange → ${state.selectedId}`)
    }
})
