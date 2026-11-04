// ============================================================
// mini-react/shared —— 类型判断 + Fiber 位标记
// 对应 React 源码包：packages/shared（最底层，自身零依赖）
//                  + packages/react-reconciler 的 ReactFiberFlags / ReactWorkTags
// 被依赖：scheduler.js / hooks.js / reconciler.js / dom.js / index.js
// 说明：本文件只放"人人都要用、自己却不依赖任何人"的常量与工具，
//       所以它被所有其他模块引用而不会形成循环依赖。
// 建议断点：无（纯常量与判断函数，读文档第一章时扫一眼即可）
// ============================================================

// ============================================================
// Fiber Tag：Fiber 的"节点种类"（源码 packages/react-reconciler/ReactWorkTags.ts）
// ============================================================
/**
 * Fiber 用 tag 区分节点种类，beginWork / completeWork / commit 都按它分派。
 * 数值直接取自真实 React 的 WorkTags，方便对照源码。
 *
 * @example
 *   fiber.tag === FiberTag.FunctionComponent // 函数组件：type 是函数
 *   fiber.tag === FiberTag.HostComponent     // 宿主元素：type 是 'div' 这类标签名
 */
const FiberTag = {
    FunctionComponent: 0, // 函数组件（真实 React 同款数值）
    HostRoot: 3, // 根节点：createRoot 的容器对应一个 HostRoot fiber
    HostComponent: 5, // 普通 DOM 元素（type 是字符串标签名）
    HostText: 6 // 纯文本（type 为 null，内容由 props.nodeValue 承载）
}

// ============================================================
// Fiber Flags：本 Fiber 需要 commit 阶段做什么（源码 packages/shared/ReactFiberFlags.ts）
// ============================================================
/**
 * render 阶段在 fiber 上"记账"，commit 阶段按位读取执行——render 全程不碰 DOM，
 * 碰 DOM 的动作全部推迟到 commit，这正是 React 可中断渲染的前提。
 *
 * @example
 *   fiber.flags = FiberFlags.Placement // 新插入
 *   fiber.flags |= FiberFlags.Update   // 在已有标记上叠加"更新"位
 *   commit 时：flags & Placement 非 0 → 执行插入
 */
const FiberFlags = {
    NoFlags: 0, // 无事可做
    Placement: 2, // 插入 / 移动（复用节点换位置也是 Placement：insertBefore 即移动）
    Update: 4, // 更新已有 DOM 实例的属性 / 文本
    Deletion: 8 // 删除。教学版把删除记在被删 fiber 自己身上（React 18 记在父 fiber 的 ChildDeletion=128）
}

// ============================================================
// Element 类型标记（源码 packages/shared/ReactSymbols.ts）
// ============================================================
/**
 * React Element 的防伪标记。真实 React 用 Symbol.for('react.element')，
 * 目的：防止"长得像 element 的普通对象"被误当元素渲染。
 *
 * @example
 *   { $$typeof: REACT_ELEMENT_TYPE, type: 'div', key: null, props: {...} }
 */
const REACT_ELEMENT_TYPE = typeof Symbol === 'function' ? Symbol.for('react.element') : 0xeac7

// ============================================================
// 类型判断工具（源码 packages/shared/general.js）
// ============================================================
/**
 * 判断一个值是否为对象（不含 null——typeof null === 'object' 是 JS 历史坑）。
 *
 * @param {*} val - 任意值
 * @returns {boolean} 是否为非 null 的对象
 *
 * @example
 *   isObject({})      // → true
 *   isObject(null)    // → false
 */
const isObject = val => val !== null && typeof val === 'object'
/**
 * 是否为数组。直接复用原生 Array.isArray，能跨 iframe/realm 正确判断。
 *
 * @param {*} val - 任意值
 * @returns {boolean}
 *
 * @example
 *   isArray([1])   // → true
 *   isArray('ab')  // → false
 */
const isArray = Array.isArray
/**
 * 是否为字符串。用于区分元素类型：type 是字符串 → 宿主元素。
 *
 * @param {*} val - 任意值
 * @returns {boolean}
 *
 * @example
 *   isString('div')  // → true
 */
const isString = val => typeof val === 'string'
/**
 * 是否为数字。文本孩子（'count = ' + 1 里的数字）会归一化成文本元素。
 *
 * @param {*} val - 任意值
 * @returns {boolean}
 *
 * @example
 *   isNumber(42)  // → true
 */
const isNumber = val => typeof val === 'number'
/**
 * 是否为函数。type 是函数 → 函数组件 fiber。
 *
 * @param {*} val - 任意值
 * @returns {boolean}
 *
 * @example
 *   isFunction(App)     // → true（beginWork 用它认出函数组件）
 *   isFunction('div')   // → false（字符串是宿主元素）
 */
const isFunction = val => typeof val === 'function'
