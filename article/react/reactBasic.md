## 开发依赖

- react： 包含 react 所必须的核心代码
- react-dom：react 渲染在不同平台所需要的核心代码
  - web端：将jsx最终渲染成真是DOM，显示在浏览器中
  - native端：将jsx渲染成原生的控件
- babel： 将 jsx 转换成 react 代码所需要的工具
  - 默认情况下不需要babel，前提是我们自己使用React.createElement编写源代码

##  JSX 语法规则
- 顶层只能有一个根元素，所以很多时候我们会在外层包裹一个div原生（或者Fragment文档片段）
- 为了方便阅读，通常在jsx外层包裹一个小括号
- 标签中混入 JS 表达式时要用 {}
- 定义类名需要用 className
- 内联样式,要用 style={{key:val}}形式去写，外面第一个大括号是表达式，里面那个是对象
- 标签必须闭合
- 标签首字母
  - 若小写字母开头，则将该标签转为html中用户元素，若html中无该标签同名元素，则报错
  - 若大写字母开头，react就去渲染对应的组件，若组件没有定义，则报错。
- 嵌入变量
  - 直接显示：number、string、array
  - 内容为空：null、undefined、boolean
    - 需要显示可以转成字符串
    - 转换方式：toString、字符串拼接、String(变量)等
  - 对象类型不能作为子元素
- 
