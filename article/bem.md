## 什么是 BEM 规范
1. Block（块）：一个独立的、可重用的组件或模块，它是页面上的一个高级元素
2. Element（元素）：块的组成部分，不能独立存在。元素位于块的内部，用双下划线("__")连接块和元素的名称
3. Modifier（修饰符）：用于修改块或元素的外观、状态或行为。修饰符使用单个连字符("-")连接块或元素的名称和修饰符的名称
```
.header__logo--hidden
```

## 推荐css样式顺序
1. 定位属性：positon display float left top right bottom overflow clear z-index
2. 自身属性：width height margin padding border background
3. 文字样式：font-family font-size font-style font-weight font-varient
4. 文本属性：text-align vertical-align text-wrap text-transform text-indent text-decoration letter-spacing word-spacing white-space text-overflow
5. css3中新增属性：content box-shadow border-radius transform

## 使用 js 实现 BEM 规范
- 实现 _bem 用于字符串拼接
```
function _bem(
  prefixName: string,
  blockSuffix: string,
  element: string,
  modifier: string | number
) {
  if (blockSuffix) {
    prefixName += `-${blockSuffix}`
  }
  if (element) {
    prefixName += `__${element}`
  }
  if (modifier) {
    prefixName += `--${modifier}`
  }
  return prefixName
}
```
- 实现 bem 方法
  - 通过 createNamespace 指定类名的前缀
  - 导出b、e、m、be、bm、em、bem 等函数
```
function createBEM(prefixName: string) {
  const b = (blockSuffix = '') => _bem(prefixName, blockSuffix, '', '')
  const e = (element = '') => (element ? _bem(prefixName, '', element, '') : '')
  const m = (modifier = '') =>
    modifier ? _bem(prefixName, '', '', modifier) : ''

  const be = (blockSuffix = '', element = '') =>
    blockSuffix && element ? _bem(prefixName, blockSuffix, element, '') : ''
  const bm = (blockSuffix = '', modifier = '') =>
    blockSuffix && modifier ? _bem(prefixName, blockSuffix, '', modifier) : ''
  const em = (element = '', modifier: string | number = '') =>
    element && modifier ? _bem(prefixName, '', element, modifier) : ''
  const bem = (blockSuffix = '', element = '', modifier = '') =>
    blockSuffix && element && modifier
      ? _bem(prefixName, blockSuffix, element, modifier)
      : ''

  const is = (name: string, state: string | boolean) =>
    state ? `is-${name}` : ''
  return {
    b,
    e,
    m,
    be,
    bm,
    em,
    bem,
    is
  }
}

export function createNamespace(name: string) {
  const prefixName = `van-${name}`
  return createBEM(prefixName)
}
```