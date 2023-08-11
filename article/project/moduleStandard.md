## 主流模块化规范
- CommonJS
- AMD
- CMD
- UDM
- ES6

## CommonJS（同步加载）
- 规定每个文件就是一个模块，有独立的作用域
- 每个模块内部都有一个 module 对象代表当前模块，其具有以下属性
  - id：模块标识符，通常是绝对路径的模块文件名
  - filename 模块文件名， 带有绝对路径
  - loaded 布尔值，是否已加载
  - parent 一个对象，调用该模块的模块
  - children：一个数组，该模块用到的其他模块
  - exports 对外输出的值
- 特点
  - 文件即模块，文件内代码运行在独立作用域
  - 模块可以被多次引用加载，第一次加载会被缓存，之后使用缓存结果
  - 加载某个模块，就是引导该模块的`module.exports`属性
  - `module.exports` 输出的是值的拷贝，一旦输出，模块内发生变化也不回影响到输出值
  - 加载顺序按照代码引入的顺序

## AMD（异步加载）
- 模块化加载时异步的，完全贴合浏览器的
- 异步加载：同时并发记载所依赖的模块，当所有依赖模块都加载完成之后，再执行当前模块的回调函数
```
define(id?,dependencies?, factory)
```
- id：模块名称
- dependencies：一个数组，定义了依赖的模块
- factory：模块初始化时要执行的函数或对象

## CMD
- 整合了 CommonJS 合 AMD 的特点，其规范实现为`sea.js`
- 同时支持t同步和异步加载
```
define(factory)

define(function(require, exports, module) {})
```
- 参数说明
  1. 1.require是一个函数，通过调用它可以引用其他模块，也可以调用
    require.async函数来异步调用模块。
  2. exports是一个对象，当定义模块的时候，需要通过向参数exports添加属
    性来导出模块API。
  3. module是一个对象，它包含3个属性:. uri，模块完整的URI路径;
    . dependencies,模块的依赖;
    exports，模块需要被导出的API，作用同第二个参数exports。

```
define(function(require，exports, module) 
    {
        var add - require( ' math ' ).add;
        exports.increment = function(val) {
            return add(val，1
        );
    };
    module.id - "increment" ;
});
```

## UMD
- 并不是模块管理规范，而是带有前后端同构思想的模块封装工具
- 通过UMD可以在核实的环境选择对应的模块规范
- 实现原理
  - 先判断是否支持 Node.js 模块格式（exports 是否存在）
  - 再判断是否支持 AMD（define 是否存在），存在则使用 AMD 方式加载模块
  - 若两个都不存在，则将模块公开到全局（Window或Global）

## ES6
- CommonJS 和 AMD 是在运行时确认依赖关系（运行时加载）
- ES6 module 在编译时就确认依赖关系，所有的加载其实都是引用，好处时可以执行静态分析和类型检查
- **导出**
```
export const first = 1

const first = 1
export { first }
```
- **as 关键字**
  - 可以通过此关键字
```
const first = 1
export { first as second }
```
- **export default** 
  - 导出默认输出，即用户不需要知道模块中名字，在导入的时候为其指定任意名字
```
export default function () {}
```

- **导入**
```
import { first } from './profile.js'

import { lastName as surname } from './profile.js'

import * as circle from './circle'
```

- **浏览器中使用ES模块**
```
<script type="module">
  import module from './module'
</script>

<script nomodule>
  alert('您的浏览器不支持 ES 模块，请先升级！')
</script>
```

## package.json 与模块化
## main
- 用来指定加载的入口文件，在`browser`和`Node`环境中都可以使用
- 我们将项目发布为`npm`包，当使用`require`导入时，返回的就是`main`字段所列出的文件的`module.exports`属性
- 如果不指定该字段，默认就是根目录下的 `index.js`
```
"main": "lib/index.js"
```

## browser
- 可以定义 npm 包在 browser 环境下的入口文件
```
"browser": "lib/index.js"
```

## module
- 可以定义 npm 包的 ESM 规范入口文件
- browser 和 node 环境均可使用
```
"module": "es/index.js"
```