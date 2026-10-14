// doc.js — yjs 双客户端协同的最小真实接线
// 通道：BroadcastChannel（同源多 tab / 同页多实例零服务端同步）；生产替换为 y-websocket 即可
import * as Y from 'yjs'

// 极简 provider：update 交换 + 全量状态同步 + awareness（感知状态走临时消息，不进文档）
export function createChannelProvider(doc, channelName, clientName) {
  const channel = new BroadcastChannel(channelName)
  const listeners = { cursor: [] }

  channel.onmessage = e => {
    const msg = e.data
    if (!msg || msg.from === clientName) return
    if (msg.type === 'update') {
      // 第三参数是事务 origin：用于 UndoManager 区分「我的编辑」与「远端编辑」
      Y.applyUpdate(doc, msg.update, 'remote')
    } else if (msg.type === 'sync-request') {
      channel.postMessage({ type: 'sync', from: clientName, to: msg.from, state: Y.encodeStateAsUpdate(doc) })
    } else if (msg.type === 'sync' && msg.to === clientName) {
      Y.applyUpdate(doc, msg.state, 'remote')
    } else if (msg.type === 'cursor') {
      listeners.cursor.forEach(fn => fn(msg))
    }
  }

  // 加入时向已在场的实例要全量状态
  channel.postMessage({ type: 'sync-request', from: clientName })

  return {
    name: clientName,
    // 本地更新 → 广播；applyUpdate 一律带 origin 'remote'，与本地事务（origin null）区分
    observe() {
      doc.on('update', (update, origin) => {
        if (origin !== 'remote') channel.postMessage({ type: 'update', from: clientName, update })
      })
    },
    setCursor(pos, color) {
      channel.postMessage({ type: 'cursor', from: clientName, pos, color })
    },
    onCursor(fn) {
      listeners.cursor.push(fn)
    },
    destroy() {
      channel.close()
    },
  }
}

// 墓碑可见化：把 Y.Text 内部的字符链表（含已删除墓碑）拍平成调试视图
export function tombstoneView(ytext) {
  let node = ytext._start
  const out = []
  while (node) {
    if (!node.deleted) {
      out.push(...String(node.content ? node.content.getContent()[0] : '').split(''))
    } else {
      out.push(...String(node.content ? node.content.getContent()[0] : '').split('').map(() => '\u0338'))
    }
    node = node.right
  }
  return out
}
