## 全局对象
- Global 的作用就是作为属主
- 常见全局变量
  - __filename: 返回正在执行脚本文件的觉得路径
  - __dirname: 返回正在执行脚本所在目录
  - timer类函数： 执行顺序与事件循环间的关系
  - process： 提供与当前进程互动的接口
  - require：实现模块的加载
  - module、exports：处理模块的导出
- process
  ```
  "start": "set NODE_ENV=production &&  node ./1.globalObject.js"
  "start": "cross-env NODE_ENV=production node ./1.globalObject.js"
  
  console.log(process.env.NODE_ENV) // production
  ```

## 核心模块 path
- path.basename(path, suffix):获取路径中的基础名称
  - path: 路径
  - suffix: 扩展名,如果扩展名相同结果则省略扩展名
  ```
  console.log(path.basename(__filename, '.js')) // 2.path
  console.log(path.basename(__filename)) // 2.path.js
  ```
- path.dirname(): 获取路径中最后一个部分的上一次目录所在路径
  ```
  console.log(path.dirname('/a/b/c')) // /a/b
  ```
- path.extname(): 获取路径的扩展名
  ```
  // extname
  console.log(path.extname('/a/b.css')) // .css
  ```
- path.parse(): 解析路径
  - 返回一个对象
  - root: 根路径（如果有）
  - dir: 目录路径
  - base: 文件名+扩展名
  - ext: 文件名（不包括扩展名）
  - name: 文件扩展名（包括点号）
  ```
  console.log(path.parse('/a/b/c/index.html'))
  /* {
      root: '/',
      dir: '/a/b/c',     
      base: 'index.html',
      ext: '.html',
      name: 'index'
  } */
  ```
- path.format(): 序列化路径
  ```
  console.log(
    path.format({
        root: '/',
        dir: '/a/b/c',
        base: 'index.html',
        ext: '.html',
        name: 'index'
    })
  ) // /a/b/c\index.html
  ```
- path.isAbsolute(): 判断参数是否为绝对路径
  ```
  console.log(path.isAbsolute('foo')) // false
  console.log(path.isAbsolute('/foo')) // true
  ```
- path.join(): 拼接路径
  ```
  console.log(path.join('a/b', 'c', '../', 'index.html')) // a\b\index.html
  ```
- path.normalize(): 规范化路径
  ```
  console.log(path.normalize('a/b/c/d')) // a\b\c\d
  ```
- `path.resolve([from], to)`: 获取绝对路径
  ```
  console.log(path.resolve()) // E:\working\blog\code\node\nodeBasic
  console.log(path.resolve('a', 'b')) //  E:\working\blog\code\node\nodeBasic\a\b
  console.log(path.resolve('/a', 'b')) // E:\a\b
  ```

## 全局变量 Buffer
- 作用
  - 处理二进制数据的机制，适用于文件系统，网络通信，加密等场景
  
  - 不占据V8堆内存大小，内存大小由node控制，由v8GC来回收
  
  - 一般配合Stream流使用，充当数据缓冲区
  
    ![buffer](nodeBasic.assets/buffer.png)

- 创建 Buffer
  - 创建时即指定了长度，后续不能改变空间大小，这是和js数组不同的
  - Buffer.alloc(size, fill[, encoding]) 创建指定大小的已初始化 Buffer
  ```
  const buf1 = Buffer.alloc(5, 'abc', 'utf-8')
  console.log(buf1) // <Buffer 61 62 63 61 62>
  ```
  - Buffer.allocUnsafe:  创建指定大小的未初始化Buffer，需要手动初始化
  ```
  const buf2 = Buffer.allocUnsafe(5)
  buf2.fill('abc')
  console.log(buf2) // <Buffer 61 62 63 61 62>
  ```
  - `Buffer.from(value[,encodingOrOffset[,length]])`：根据给定的值创建新的Buffer对象
  ```
  const buf3 = Buffer.from('abc', 'utf-8')
  console.log(buf3) // <Buffer 61 62 63>
  ```
- Buffer 实例方法
  - fill(value, offset[,end][,encoding])
    - 用指定的值填充 Buffer，可以指定开始和结束位置，默认会重复写入
  ```
  const bufFill = Buffer.alloc(6)
  bufFill.fill('abc')
  console.log(bufFill) // <Buffer 61 62 63 61 62 63>
  ```
  - write(string[, offset[, length]][, encoding])
    - 将字符串写入Buffer并返回写入的字数
  ```
  const bufWrite = Buffer.alloc(10)
  bufWrite.write('hello', 0, 5, 'utf-8')
  console.log(bufWrite) // <Buffer 68 65 6c 6c 6f 00 00 00 00 00>
  ```
  - slice([start[, end]])
    - 创建一个新的Buffer，包含原始Buffer的指定部分
  ```
  const bufSlice = Buffer.from('hello', 'utf-8').slice(1, 4)
  console.log(bufSlice) // <Buffer 65 6c 6c>
  ```
  - indexOf(value[, byteOffset][, encoding])
    - 在 Buffer 中查找指定值的第一个出现位置，并返回其索引
  ```
  console.log(Buffer.from('hello', 'utf8').indexOf('e')) // 1
  ```
  - copy(targetBuffer[, targetStart[, sourceStart[, sourceEnd]]])
    - 将当前 Buffer 的内容复制到目标 Buffer 中
  ```
  const bufCopy1 = Buffer.alloc(5)
  const bufCopy2 = Buffer.from('hello', 'utf-8')
  bufCopy2.copy(bufCopy1)
  console.log(bufCopy1) // <Buffer 68 65 6c 6c 6f>
  ```
  - toString()
    - 从 Buffer 中提取数据
  ```
  console.log(Buffer.from('liuguowei', 'utf-8').toString()) // liuguowei
  ``` 
- Buffer 静态方法
  - concat： 将多个buffer拼接成一个新的buffer
  - isBuffer：判断当前数据是否为buffer

## 核心模块 FS
- 权限位
  - 每个文件或目录都由一个9位的权限位组合，用来指定不同用户对该文件或目录的读取、写入和执行权限
  - 9位权限位组合包括三组权限：所有者权限、群组权限和其他用户权限
    - 每组权限由三个字符表示
    - r: 读取
    - w：写入
    - x：执行
  - -rwxr-wr--
    - 第一个字符-表示该条目是一个文件（如果是d则表示是一个目录）
    - 接下来的三个字符rwx表示所有者具有读取、写入和执行权限
    - 然后的三个字符r-x表示群组用户具有读取和执行权限
    - 最后的三个字符r--表示其他用户只具有读取权限
- 操作符 flag
  - 'w'：覆盖模式，如果文件存在，则先清空文件内容再写入新内容
  - 'a'：追加模式，如果文件存在，则将新内容追加到文件末尾
  - 'wx'：排他模式下的写入，只有当文件不存在时才创建文件并写入内容
  - 'ax'：排他模式下的追加，只有当文件不存在时才创建文件并追加内容
- 文件操作 API
  - readFile: 从指定文件中读取数据
  ```
  fs.readFile(path.resolve('data.txt'), { encoding: 'utf-8' }, (err, data) => {
    console.log(data) // 我是一只程序猿
  })
  ```
  - writeFile(file, data[, options], callback)：向指定文件中写入数据
    - options
      -  encoding
      -  mode: 权限位
      -  flag：操作符
  ```
  const options = {
    flag: 'a'
  }
  fs.writeFile(path.resolve('data.txt'), '我不是一只程序员', options, (err, data) => {
      if (!err) {
          console.log('操作成功')
      }
  })
  ```
  - appendFile: 追加的方式向指定文件中写入数据
  ```
  fs.appendFile(path.resolve('data.txt'), 'hello world', (err, data) => {
      console.log('追加成功')
  })
  ```
  - copyFile：将某个文件中的数据拷贝至另一文件
  ```
  fs.copyFile(path.resolve('data.txt'), 'test.txt', () => {
    console.log('拷贝成功')
  })
  ```
  - fs.watchFile(file[, options], listener)：对指定文件进行监控
    - options
      -  persistent：指定监视是否持续运行，默认为 true。设置为 false 后，当回调函数执行完毕时会停止监视
      -  interval：设置轮询间隔（以毫秒为单位），即检查文件变化的频率。默认为 5007 毫秒（约为 5 秒）
      -  bigint：指示是否将 mtime 和 ctime 字段作为 BigInt 类型返回。默认为 false
  ```
  fs.watchFile('data.txt', { interval: 20 }, (curr, prev) => {
    console.log(curr)
    console.log(prev)
    if (curr.mtime !== prev.mtime) {
      console.log('文件被修改了')
      fs.unwatchFile('data.txt')
    }
  })
  ```

-