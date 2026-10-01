// 顶层副作用：模块一进图就会执行（真实组件库的全局注册就是这样）
console.log('button 被注册')

export default function Button(props) {
    return { tag: 'button', ...props }
}
