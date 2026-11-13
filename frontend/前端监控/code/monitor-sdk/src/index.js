// 公共出口：对外只有 init 一个函数，其余都是插件工厂（方便业务裁插件或写自己的插件）。
import { resolveConfig } from './config'
import { createKernel } from './core/kernel'

/**
 * 初始化监控 SDK。全站只 init 一次：多实例会导致监听器重复挂载、队列各自为战。
 * @param {object} config 配置项都可选，见 config.js 的 defaultConfig
 * @returns {object} 实例：report / captureError / flush / getContext / getSession /
 *   setUser / setTag / attachVue / checkWhiteScreen / teardown / cfg / stats
 */
export function init(config) {
    return createKernel(resolveConfig(config))
}

export { createCustomPlugin } from './plugins/custom'
export { createPerformancePlugin } from './plugins/performance'
export { createJsErrorPlugin } from './plugins/js-error'
export { createResourcePlugin } from './plugins/resource'
export { createRequestPlugin } from './plugins/request'
export { createRouterPlugin } from './plugins/router'
export { createBehaviorPlugin } from './plugins/behavior'
export { createWhiteScreenPlugin } from './plugins/whitescreen'
