## rollup

- 特点

  - 不会生成过多的运行代码
  - 可以多模块规范打包

- 核心配置

  - input: 入口
  - output: 
    - dir: 输出目录，与 file二选一
    - file: 输出目录
    - format: 必须，输出的模块化
  - external: 忽略打包进bundle的
  - plugins

- 打包第三方

  ```
  npm i @rollup/plugin-node-resolve -D 
  ```

- 压缩

  ```
  npm i @rollup/plugin-terser -D  
  ```

## vite

- 特点
  - 最大特点使用esm，让代码不像传统的构建工具一样去分析引入，打包构建，而是直接保持模块化，省去大量的编译时间，让代码更改后响应速度大量提升
  - 原理是给script标签添加`type: module`使浏览器能自己分析模块，有兼容性
  
- 处理各种资源

  - 天生支持css以及预处理语言
  - 支持typescript
  - 能处理各种资源

- 特殊语言需要添加插件

  - vue

    ```
    npm i @vitejs/plugin-vue -D
    ```

  - jsx

    ```
    esbuild: {
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        jsxInject: "import {h} from 'vue'"
    }
    ```

- 代码分隔

  - vite 会自动分隔异步引入代码，第三方库vendor或者特殊拆分需要借助rollup 的 manualChunks
  
- server

  ```
  server: {
  	port: 8080,
  		proxy: {
  			'/api': {
  			target: 'http://localhost:3000',
  			rewrite: path => {
  				console.log(path)
  				return path
  				// return path.replace(/^\/api/, '')
  			}
  		}
  	}
  }
  ```

  