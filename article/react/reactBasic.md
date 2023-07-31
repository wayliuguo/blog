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
  
- 嵌入表达式，要用{}

- 绑定属性

  - 定义类名需要用 className
  - 内联样式,要用 style={{key:val}}形式去写，外面第一个大括号是表达式，里面那个是对象，需要驼峰法则

- 绑定事件

  - 驼峰法则
  - 绑定事件函数中this指向组件对象的三种方案

  ```
  // 显式绑定
  // 第一种显式绑定
  <button onClick={this.btnClick.bind(this)}>绑定事件</button>
  // 第一种显式绑定，在构造函数重新赋值
  constructor(props) {
  	this.btnClick = this.btnClick.bind(this)
  }
  
  // 使用箭头函数定义函数
  btnClickArrow = () => {}
  
  // 传入一个箭头函数，箭头函数中执行需要执行的函数
  <button onClick={() => { this.btnClick() }}>箭头函数执行绑定事件</button>
  ```


```
<script type="text/babel">
        class Weather extends React.Component {
            constructor(props) {
                super(props)
                this.state = {
                    name: 'well',
                    age: 18,
                    names: ['a', 'b', 'c'],
                    test1: undefined,
                    test2: null,
                    test3: true,
                    friend: {
                        name: 'well',
                        age: 18
                    },
                    style: {
                        color: 'red',
                        fontSize: '18px'
                    }
                }
                // this.btnClick = this.btnClick.bind(this)
            }
            getNameAndAge() {
                const { name, age } = this.state
                return `姓名：${name}，年龄${age}`
            }
            btnClick() {
                let { age } = this.state
                this.setState({
                    age: ++age
                })
            }
            btnClickArrow = () => {
                let { age } = this.state
                this.setState({
                    age: ++age
                })
            }
            render() {
                const { name, age, names, test1, test2, test3, friend, style } = this.state
                return (
                    <div>
                        {/*
                            number、string、array 可以渲染
                        */}
                        <h2>{name}</h2>
                        <h2>{age}</h2>
                        <h2>{names}</h2>
                        {/*
                            undefined、null、boolean 渲染为空
                        */}
                        <h2>{test1}</h2>
                        <h2>{test2}</h2>
                        <h2>{test3}</h2>
                        {/*
                            <h2>{friend}</h2> 
                        */}

                        {/*
                           嵌入表达式
                        */}
                        <h2>{`姓名：${name}，年龄${age}`}</h2>
                        <h2>{this.getNameAndAge()}</h2>

                        {/*
                           绑定属性
                        */}
                        <h2 className="box">绑定class</h2>
                        <h2 style={{ ...style }}>绑定style</h2>
                        <h2 style={style}>绑定style</h2>
                        <h2 style={{ color: 'red', fontSize: '18px' }}>绑定style</h2>

                        {/*
                           绑定事件
                        */}
                        <button onClick={this.btnClick.bind(this)}>显示绑定事件</button>
                        <button onClick={this.btnClickArrow}>箭头函数绑定事件</button>
                        <button onClick={() => { this.btnClick() }}>箭头函数执行绑定事件</button>
                    </div>
                )
            }
        }
        ReactDOM.render(<Weather />, document.querySelector('#test'))
</script>
```

## 受控组件

由React 管理表单元素的值，表单元素的变化实时映射到React的state，类似双向绑定。

```
<script type="text/babel">
        class Login extends React.Component {
            state = {
                username: '',
                password: ''
            }
            usernameChange = (evnet) => {
                console.log(event.target.value)
                this.setState({
                    username: evnet.target.value
                })
            }
            passwordChange = (event) => {
                console.log(event.target.value)
                this.setState({
                    password: event.target.value
                })
            }
            handleSubmit = (event) => {
                event.preventDefault()
                const { username, password } = this.state
                alert(`你输入的用户名是:${username}，密码:${password}`)
            }
            render() {
                return (
                    <form onSubmit={this.handleSubmit}>
                        用户名: <input type="text" onChange={this.usernameChange} name="username" />
                        密码: <input type="password" onChange={this.passwordChange} name="password" />
                        <button>登录</button>
                    </form>
                )
            }
        }
        ReactDOM.render(<Login />, document.querySelector('#test1'))
</script>
```

## 非受控组件

表单数据将交由节点处理，react提供一个`ref`属性，用来从`DOM`节点中获取表单数据

```
<script type="text/babel">
        class Login extends React.Component {
            handleSubmit = (event) => {
                event.preventDefault()
                const { usernameDom, passwordDom } = this
                console.log(this)
                alert(`你输入的用户名是:${usernameDom.value}，密码:${passwordDom.value}`)
            }
            render() {
                return (
                    <form action="http://www.atguigu.com" onSubmit={this.handleSubmit}>
                        用户名: <input type="text" ref={dom => this.usernameDom = dom} name="username" />
                        密码: <input type="password" ref={dom => this.passwordDom = dom} name="password" />
                        <button>登录</button>
                    </form>
                )
            }
        }
        ReactDOM.render(<Login />, document.querySelector('#test1'))
</script>
```

## refs

- 字符串形式

```
<input ref="input1" type="text" placeholder="点击按钮提示数据"/>

const { input1 } = this.refs
```

- 回调函数形式 ,这种方式

```
<input ref={dom=>this.input1 = dom} type="text" placeholder="点击按钮提示数据"/>

const { input1 } = this
```

- 类的绑定函数形式

```
class Demo extends React.Component {
	state = {}
	saveInput = (dom) => {
		this.input1 = dom
	}
	...
	<input ref={this.saveInput} type="text" placeholder="点击按钮提示数据"/>
}


```

- React.createRef()

```
 class Demo extends React.Component {
 	myRef1 = React.createRef()
 	...
 	<input ref={this.myRef1} type="text" placeholder="点击按钮提示数据"/>
 }
```

## props 约束

- 安装

  ```
  npm install prop-types
  ```

- 定义

  ```
  class Person extends React.Component {}
  
  // 参数类型
  Person.propTypes = {
  	name: PropTypes.string.isRequired
  }
  // 默认值
  Person.defaultProps = {
  	sex: '女',
  	age: 18
  }
  ```

- 简写

  ```
  class Person extends React.Component {
  	static propTypes = {
  		...
  	}
  	static defaultProps = {
  		...
  	}
  }
  ```

- [规则](https://www.npmjs.com/package/prop-types)

  - 常见类型

    - PropTypes.number
    - PropTypes.string
    - PropTypes.bool
    - PropTypes.symbol
    - PropTypes.bigint
    - PropTypes.array
    - PropTypes.object
    - PropTypes.func
    - PropTypes.node
    - PropTypes.element
    - PropTypes.elementType

  - 必填

    - 添加isRequired
    - PropTypes.number.isRequired

  - 特定值

    - 只能是 option1 或者 option2

    ```
    PropTypes.oneOf(['option1', 'option2'])
    ```

    - 只能是某几个类型

    ```
    PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    ```

  - 特定数组对象

    - arrayof

    ```
    PropTypes.arrayOf(PropTypes.number)
    ```

    - objectOf

    ```
    PropTypes.objectOf(PropTypes.number)
    ```

    - shape

    ```
    PropTypes.shape({
    	name: PropTypes.string
    })
    ```

  - 自定义规则

    ```
    function (props, proName, componentName) {
    	if (props[propName] !== 'customValue') {
          return new Error(`Invalid value for prop ${propName} in component ${componentName}`);
        }
    }
    ```
  
- 函数式组件中使用

```
function Person (props) {
	...
}

Person.propTypes = {}
Person.defaultProps = {}
```

## 事件处理

- 通过onXxx属性指定事件处理函数，注意大小写
  - React 使用的是自定义（合成）事件，而不是使用的原生Dom事件
  - React 中的事件是通过事件委托方式处理的(委托给组件最外层元素)
- 通过event.target得到发生事件的DOM元素对象

```
class Demo extends React.Component {
	showData = (event) => {
    	alert(event.target.value)
    }
    ...
    <input onBlur={this.showData} type="text" />
}
```

## 生命周期

