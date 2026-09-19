// 最干净的一类模块：不 import 任何项目内文件
const listeners = new Set()

export function toast(text, type = 'info') {
    for (const fn of listeners) fn({ text, type })
}

export function useToast(onMessage) {
    listeners.add(onMessage)
    return () => listeners.delete(onMessage)
}
