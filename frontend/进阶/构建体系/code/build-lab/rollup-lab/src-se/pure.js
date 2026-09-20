// 同一个工厂函数，一个带 PURE 注解、一个不带
// 模块顶层留一句副作用：保证模块会留在图里，才能看出注解的差别
console.log('pure 被求值')

// 有副作用的工厂：改了全局对象 —— Rollup 自己证明不了它"纯"
function make(tag) {
    window.__lastTag = tag
    return { tag }
}

// 带注解：Rollup 知道"删掉这个调用不会有副作用"
export const withPure = /*#__PURE__*/ make('pure')

// 不带注解：Rollup 不敢删，因为 make() 里可能干了别的事
export const noPure = make('nopure')
