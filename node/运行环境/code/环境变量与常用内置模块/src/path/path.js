// path 核心用法：__dirname 定位、拼接、取片段、解析成绝对路径
const path = require('node:path')

// 1) __dirname / __filename：CommonJS 模块自带的绝对路径，不用自己拼、不依赖 cwd
console.log('__dirname  =', __dirname)
console.log('__filename =', __filename)

// 2) path.join：按段拼接，跨平台（Windows '\'、Linux '/' 自动处理），永远不手写分隔符
console.log('path.join     =', path.join(__dirname, 'output', 'hello.txt'))

// 3) 取片段：basename 文件名 / dirname 目录部分 / extname 扩展名
console.log('path.basename =', path.basename('/users/docs/file.txt')) // file.txt
console.log('path.dirname  =', path.dirname('/users/docs/file.txt')) // /users/docs
console.log('path.extname  =', path.extname('report.pdf')) // .pdf

// 4) path.resolve：从右往左解析、遇绝对路径即停，得到基于 cwd（命令执行位置）的绝对路径
console.log('path.resolve  =', path.resolve('output'))

// 5) 结构化拆解：path.parse 拆成对象；path.sep 是当前系统的分隔符
console.log('path.parse    =', path.parse('/users/docs/file.txt'))
console.log('path.sep      =', JSON.stringify(path.sep))
