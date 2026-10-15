// 组件库的"总入口"：一次 re-export 所有组件
// 每个组件模块顶层都有一句注册副作用 —— 所以只要进了图就摇不掉
export { default as Button } from './es/button.js'
export { default as Table } from './es/table.js'
export { default as Form } from './es/form.js'
