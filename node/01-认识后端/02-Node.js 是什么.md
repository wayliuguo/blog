# Node.js 是什么

---

## [初级] Node.js 不是一门语言

Node.js **不是**一门新的编程语言，而是 **JavaScript 的运行环境**。

```
JavaScript 原本只在浏览器中运行
       ↓
Node.js 基于 Chrome V8 引擎，让 JS 可以跑在服务器上
```

- 语言：JavaScript / TypeScript
- 运行环境：Node.js
- 底层引擎：V8（Chrome 浏览器用的那个）

## [初级] Node.js 能做什么

| 用途 | 说明 | 例子 |
|------|------|------|
| Web 服务器 | 处理 HTTP 请求，提供 API | Express、NestJS |
| 命令行工具 | 编写 CLI 工具 | Webpack、create-react-app |
| 桌面应用 | 用 JS 写桌面软件 | VS Code（基于 Electron） |
| 工具链 | 前端构建工具 | Vite、Webpack |

## [初级] 安装与配置

### 下载安装

1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载 **LTS（长期支持）** 版本（推荐）
3. 一路默认安装即可

### 验证安装

打开终端（命令行），输入：

```bash
node -v
# 输出：v18.x.x  （版本号）

npm -v
# 输出：9.x.x
```

## [初级] 第一个 Node.js 程序

创建一个文件 `hello.js`：

```javascript
console.log('Hello, Node.js!')
```

在终端中运行：

```bash
node hello.js
# 输出：Hello, Node.js!
```

### 创建一个简单的 HTTP 服务器

```javascript
const http = require('http')

const server = http.createServer((req, res) => {
    res.end('Hello World')
})

server.listen(3000, () => {
    console.log('Server running at http://localhost:3000')
})
```

运行后，在浏览器打开 `http://localhost:3000`，你会看到 `Hello World`。

---

## 参考

- 上一篇：[后端在做什么](./01-后端在做什么)
- 下一篇：[模块系统与包管理](../02-Node.js%20基础/01-模块系统与包管理)