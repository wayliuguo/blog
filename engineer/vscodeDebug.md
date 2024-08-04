## 常见场景

1. Node.js

```
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "启动程序",
            "skipFiles": ["<node_internals>/**"],
            "cwd": "${workspaceFolder}",
            "program": "bin\\index.js",
            "env": {
                "NODE_ENV": "development"
            },
            "args": ["h", "v"]
        }
    ]
}
```

2. Web 调试

```
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}

```

## 常见配置参数详解

1. **`"type"`**：指定调试器的类型，例如 "node" 表示 Node.js 调试器，"python" 表示 Python 调试器，"java" 表示 Java 调试器等。
2. **`"request"`**：指定调试的请求类型，可以是 "launch"（启动一个新的进程）或 "attach"（附加到已有的进程）。
3. **`"name"`**：为配置提供一个友好的名称，方便识别不同的调试配置。
4. **`"cwd"`**：指定程序的工作目录，可以是绝对路径或相对于工作目录的路径。
5. **`"program"`**：用于指定程序的入口文件路径，可以是绝对路径或相对于工作目录的路径。
6. **`"args"`**：传递给程序的命令行参数，以数组形式提供。
7. **`"env"`**：设置程序运行时的环境变量，以对象形式提供。
8. **`"stopOnEntry"`**：设置为 **`true`** 时，在启动后会在入口处停止，等待调试器连接。
9. **`"preLaunchTask"`**：指定在启动调试前运行的任务，通常是一个编译任务。
10. **`"postDebugTask"`**：指定在调试结束后运行的任务，比如清理任务。
11. **`"outFiles"`**：设置输出文件的路径，用于映射源代码和编译后的文件。
12. **`"sourceMaps"`**：控制是否启用源代码映射，可以是 "inline"、"both" 或 "false"。
13. **`"sourceMapPathOverrides"`**：用于根据源代码映射调整文件路径。
14. **`"externalConsole"`**：设置为 **`true`** 时，将在外部控制台中运行程序。
15. **`"internalConsoleOptions"`**：控制内部控制台的显示方式，可以是 "neverOpen"、"openOnSessionStart" 或 "openOnFirstSessionStart"。
16. **`"showAsyncStacks"`**：设置为 **`true`** 时，在堆栈跟踪中显示异步调用的信息。
17. **`"stopOnError"`**：设置为 **`true`** 时，当发生错误时暂停调试。
18. **`"smartStep"`**：设置为 **`true`** 时，跳过无需调试的代码。
19. **`"skipFiles"`**：指定不需要调试的文件或文件夹。
20. **`"justMyCode"`**：设置为 **`true`** 时，只调试自己的代码。



## 常用配置参数详情

1. cwd 和 program 

```
"cwd": "${workspaceFolder}",
"program": "bin\\index.js"

等于
"program": "${workspaceFolder}\\bin\\index.js"
```

2. env

```
"env": {
	"NODE_ENV": "development"
}

console.log(process.env.NODE_ENV) // development
```

3. args

```
"args": ["h", "v"]

console.log(process.argv)
[
'C:\\Program Files\\nodejs\\node.exe', ''E:\\working\\create_sql\\bin\\index.js'',
'h',
'v'
]
```

4. skipFiles

```
"skipFiles": ["<node_internals>/**"] 跳过node内部调试文件
```

