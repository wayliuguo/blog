## [基本配置](https://webpack.docschina.org/concepts/)
- entry：必须项，文件入口
- mode: 模式，默认 production，可选 development
- module：非必须，loader 编写的地方
- output：必须项，最终产出js配置
- plugins：非必须，插件
- mode：webpack4后必填
- optimization：非必须，优化相关
- devServer：非必须，开发模式配置
- resolve：非必须，提供一些简化功能

## 安装
```
npm install webpack webpack-cli --save-dev

npm install webpack webpack-cli -g
webpack -v
```

## 体验
```
const path = require('path')

module.exports = {
    mode: 'development',
    entry: './index.js',
    output: {
        // 输出文件
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].[hash:4].bundle.js'
    }
}
```

## babel-loader

```
npm i babel-loader @babel/core @babel/preset-env
```

- babel-loader 处理js，其内部依赖 @babel/core
- @babel/preset-env: 转译的规范

```
module: {
        rules: [
            {
                test: /\.js$/,
                // use: 'babel-loader'
                use: {
                    loader: 'babel-loader',
                    options: {
                        /* presets: [
                            [
                                '@babel/preset-env',
                                {
                                    targets: {
                                        browsers: ['>1%', 'last 2 versions', 'not ie<=8']
                                    }
                                }
                            ]
                        ] */
                    }
                }
            }
        ]
    }
```

- .babelrc 可以替代上面注释调的 presets

```
{
    "presets": [
        [
            "@babel/preset-env",
            {
                "targets": {
                    "browsers": [">1%", "last 2 versions", "not ie<=8"]
                }
            }
        ]
    ]
}
```

## 样式处理

css 处理路径，webpack只能处理js

1. js中引入css =》css loader =》style loader(把 css 写入 js，执行后作为 style 标签插入html)
2. js中引入css =》css loader =》mini-css-extract-plugin (提取css为独立文件)

```
npm install css-loader style-loader mini-css-extract-plugin -D
```

```
const minicss = require('mini-css-extract-plugin')

rules: [
	{
		test: /\.css$/i,
        // use: ['style-loader', 'css-loader']
        use: [minicss.loader, 'css-loader']
	}
]

// 用于提取为独立文件
plugins: [
	new minicss({
		filename: 'test.bundle.css'
	})
]
```

3. 预处理语言

```
npm i less less-loader -D
```

```
{
	test: /\.less/,
	use: [minicss.loader, 'css-loader', 'less-loader']
}
```

4. 压缩

```
npm i css-minimizer-webpack-plugin -D
```

## 资源文件

- css 文件中引入 =》file-loader| url-loader(webpack5自带支持) =》一些优化操作（hash、转base64等）
- 如果需要自定义配置，需要安装 file-loader url-loader

```
npm i file-loader url-loader -D
```

```
{
	test: /\.(png|svg|jpg|jpeg|gif)$/i,
	type: 'asset',
		parser: {
			dataUrlCondition: {
			maxSize: 4 * 1024 // 4kb
		}
	},
	generator: {
		filename: '[name].[hash][ext]'
	}
}
/* {
test: /\.(png|svg|jpg|jpeg|gif)$/i,
loader: 'url-loader',
options: {
	// 小于 5 kb
	limit: 5 * 1024,
	name: '[name].[hash:4].[ext]'
}
} */
```

- webpack 对资源文件的处理更推荐 type 的处理
- `asset/resource` 发送一个单独的文件并导出 URL。之前通过使用 `file-loader` 实现。
- `asset/inline` 导出一个资源的 data URI。之前通过使用 `url-loader` 实现。
- `asset/source` 导出资源的源代码。之前通过使用 `raw-loader` 实现。
- `asset` 在导出一个 data URI 和发送一个单独的文件之间自动选择。之前通过使用 `url-loader`，并且配置资源体积限制实现。

## loader 原理

- 接收内容，对内容进行处理并返回

```
// mycss-loader/index.js
module.exports = function (cssContent) {
    cssContent = cssContent.replace('0', '1px')
    return cssContent
}
```

```
{
	test: /\.css$/i,
    // use: ['style-loader', 'css-loader']
    use: [minicss.loader, 'css-loader', './mycss-loader']
},
```

## html 处理

**期望**

1. 提供一个html模板，复用固定功能
2. 打包的时候生成一个html
3. 打包出来的html自动引入js

**安装**

```
npm i html-webpack-plugin -D
```

```
// index.html

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>webpack</title>
</head>

<body>
    <div id="app"></div>
</body>

</html>
```

```
new htmlwebpackplugin({
	template: './index.html',
	filename: 'index.html',
	// 生产默认开启了压缩等功能
	minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeAttributeQuotes: true
	}
})
```

## 代码分割

- 如果文件全打包在一个文件里，会导致文件过大，首屏加载慢
- 如果分割过多会导致http请求数量过多
- 需要分割的应该是文件特别大而且首屏不需要的
- splitChunks
  - async：异步代码
  - initial：同步代码
  - all：两者
- minChunks: 1 :被引用次数大于多少才分隔
- minSize: 0 ：多大的才分隔
- maxSize: 超过多大继续分

```
optimization: {
	splitChunks: {
        chunks: 'all',
        minChunks: 1,
        minSize: 0,
        // 单独定义分隔规则（单独打包第三方库）
    	cacheGroups: {
            vendor: {
                test: /[\\/]node_modules[\\/]/,
                filename: 'vendor.js',
                chunks: 'all',
                minChunks: 1
            }
		}
	},
    // 运行时的代码打包成一个文件
    runtimeChunk: {
        name: 'runtime'
    }
}
```

## 技巧性配置

- hash 值的意义

  - 避免浏览器缓存没有变更

- resolve

  - alias: 别名，提供路由简写

  - Extensions: 扩展省略，定义可省略的扩展名

    ```
    resolve: {
    	alias: {
    		'@': path.resolve(__dirname)
    	},
    	extensions: ['.js', '.css', '.json']
    }
    ```

- require.context

  - 批量引入指定文件夹下的所有文件

    ```
    // index.js
    // 批量引入 (路径,是否引入子文件,匹配规则)
    let _all = 0
    const r = require.context('@/total', false, /.js/)
    r.keys().forEach(item => {
        console.log(r(item).default)
        _all += r(item).default
    })
    console.log(_all)
    ```

- filename

  - 可以指定输出的文件夹， 有filename这个选项的都可以

    ```
    new minicss({
       filename: './css/test.bundle.css'
    })
    
    // 添加路径 './css'
    new minicss({
       filename: './css/test.bundle.css'
    }),
    ```

- publicPath

  - 用于在html引入的时候作为前缀，一般作为cdn使用

  - 其打包出来的html引用会加上

    ```
    output: {
        publicPath: 'www.baidu.com'
    }
    ```

## 开发模式

- mode
- devServer
- source-map

**配置**

```
devServer: {
	port: 1000,
	hot: true,
	proxy: {
		'/': {
			target: 'http://localhost:3000'
		}
	}
}
```

**服务器**

```
// express.js
const express = require('express')
const app = new express()

app.get('/api/getNum', (req, res) => {
    res.status(200).end('hello world')
})

app.listen(3000)
```

**请求**

```
import axios from 'axios'
axios.get('/api/getNum').then(res => console.log(res))
```

