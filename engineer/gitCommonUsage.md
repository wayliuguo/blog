## 去除不需要的提交-reset

```
git log 查看提交

// reset第一个提交
git reset --soft HEAD^ 

// reset 一个commit
git reset --soft commitId

// 提交（强制）
git push --force
```

三种模式：

1. `--soft模式`：这种模式会将HEAD指针移动到指定的提交，但不会改变工作区和暂存区的内容。它主要用于撤销最近的提交，把提交的更改重新放回暂存区，就好像你从来没有提交过一样
2. `--mixed模式`（默认模式）：它会将HEAD指针移动到指定的提交，并且会更新暂存区，使其与指定的提交一致，但不会改变工作区的内容
3. `--hard模式`：它会将HEAD指针移动到指定的提交，并且会同时更新工作区和暂存区，使其与指定的提交完全一致。这意味着所有未提交的更改都会被丢弃，包括工作区和暂存区的内容

## 去除不需要的提交-revert

1. 关键步骤命令

   ```
   # 查看提交commit
   
   git log 
   
   git revert commitId
   ```

2. 原理
假设你有以下提交历史：A --- B --- C --- D，如果你想撤销提交 C，可以运行：git revert C，这将创建一个新的提交 E，撤销 C 的更改：A --- B --- C --- D --- E
3. 注意
- 执行后，终端会弹出一个vim编辑器,并生成默认提交文案，可通过vim编辑器进行更改

- 如果不想提交此次revert，由于vim退出后会自动提交此次revert，可以执行 git reset HEAD^ 去掉最新提交

  ![1280X1280](1280X1280.png)

## vim 编辑器使用指南

1. 启动和退出

```
# 启动

vim filename.txt

# 保存并退出

:wq 或者 :x

# 不保存并退出

:q!

# 仅保存但不退出
:w
```

2. 模式切换
  - 普通模式（Normal Mode）：
    - 默认模式，用于执行命令和导航。
    - 从其他模式按 Esc 键返回普通模式。
  - 插入模式（Insert Mode）：
    - 用于输入文本。
    - 从普通模式按 i 进入插入模式（在光标前插入）。
    - 其他进入插入模式的方式：
      - a：在光标后插入。
      - o：在当前行下方插入新行并进入插入模式。
      - O：在当前行上方插入新行并进入插入模式。
  - 命令模式（Command Mode）：
    - 在普通模式下按 : 进入命令模式，用于执行保存、退出等命令。

## 更改关联远程仓库

1. 查看关联

```
PS E:\private\blog> git remote -v
origin  https://gitee.com/wayliuhaha/blog.git (fetch)
origin  https://gitee.com/wayliuhaha/blog.git (push) 
```

2. 去除关联

```
git remote rm origin
```

3.  添加关联

```Java
 git remote add origin https://gitee.com/wayliuhaha/blog.git
```