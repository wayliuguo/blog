// ESM 的导出是「活绑定」：导入方每次读到的都是导出方当前的变量值
export let count = 0

export const bump = () => {
    count += 1
}
