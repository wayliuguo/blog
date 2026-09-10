# Git 与协作

Git 是现代前端项目版本控制与团队协作的基石。本文覆盖 Git 的常用命令与撤销回退技巧（reset / revert）、远程仓库管理与分支协作、Gitee/GitHub 之间的镜像同步，以及 Monorepo（单仓库多模块）工程与 pnpm 工具的实践。掌握这些，你既能独立管理代码历史，也能顺畅地参与团队协作与大型工程维护。

> 级别：初级→中级

按本书四层推进：

- **入门使用**：掌握 `add / commit / push / pull / merge` 等基本命令，看懂提交历史；
- **进阶**：分清 `reset` 与 `revert`、理解分支工作流与冲突解决；
- **实战**：用分支协作 + Gitee/GitHub 镜像同步 + Monorepo/pnpm 落地团队大工程；
- **最小实现掌握原理**：到 `code/frontend/06-engineering` 运行 `mini-dev-hmr.html`，从最朴素的"变更信号"体会协作中"我该拿哪一版"的通病。

## 一、常用命令速览

### 基础操作

```bash
git init                    # 初始化仓库
git add <file>              # 加入暂存区
git add .                   # 暂存所有改动
git commit -m "message"     # 提交
git status                  # 查看工作区状态
git log                     # 查看提交历史
git branch                  # 查看分支
git checkout <branch>       # 切换分支
git merge <branch>          # 合并分支
git pull                    # 拉取并合并远程
git push                    # 推送到远程
```

### 查看提交历史

```bash
git log               # 完整历史
git log --oneline     # 单行简洁展示
git log --graph       # 以图形展示分支合并轨迹
```

## 二、撤销与回退提交

### reset：本地回退（重置提交指针）

`git reset` 会把 `HEAD`（当前分支指针）移动到指定提交。三种模式区别在是否改动**工作区 / 暂存区**：

1. **`--soft`**：仅移动 HEAD 指针，**不会改变工作区和暂存区**。主要用于"撤销最近一次提交"，把改动重新放回暂存区，就好像没有提交过。
2. **`--mixed`（默认）**：移动 HEAD，并更新**暂存区**与指定提交一致，但**不改工作区**。
3. **`--hard`**：移动 HEAD，并同时更新**工作区与暂存区**，使其与指定提交完全一致。**所有未提交的改动都会被丢弃**，慎用。

```bash
# 撤销最近一次提交（回到上一版，改动留在暂存区）
git reset --soft HEAD^

# 回退到指定提交
git reset --soft commitId

# 回退到指定提交（丢弃之后的所有改动，慎用）
git reset --hard commitId

# 强制推送到远程（本地历史已被改写时）
git push --force
```

> 注意：`reset` 会改写本地提交历史，若改动已推到远程共享分支，**不要使用 `--force`**，否则会影响其他协作成员。此时应使用 `revert`。

### revert：安全地"反做"一次提交

`git revert commitId` 会**新建一个相反的提交**来抵消目标提交的改动，而不改写原有历史，非常适合已推送远程的场景。

```bash
git log                 # 找到要撤回的 commitId
git revert commitId
```

**原理示意**：假设历史为 `A --- B --- C --- D`，要撤销提交 `C`，运行 `git revert C` 会创建新提交 `E` 抵消 C 的改动，得到 `A --- B --- C --- D --- E`。原历史保持不变，其他成员可安全 pull。

**注意事项：**

- 执行后会弹出 vim 编辑器并生成默认提交文案，可自行修改。
- 若不想保留这次 revert 的提交，由于 vim 退出后会自动提交，可执行 `git reset HEAD^` 去掉最新提交。

### vim 编辑器小抄

`revert` / `commit` 等命令都会进入 vim，以下是常用操作：

- 启动：`vim filename.txt`
- **保存并退出**：`:wq` 或 `:x`
- **不保存并退出**：`:q!`
- **仅保存不退出**：`:w`

三种模式切换：

- **普通模式（Normal）**：默认，用于执行命令和导航，从其他模式按 `Esc` 返回。
- **插入模式（Insert）**：普通模式下按 `i` 进入（光标前插入）；`a` 光标后插入；`o` 下方新增一行；`O` 上方新增一行。
- **命令模式（Command）**：普通模式下按 `:` 进入，执行保存、退出等命令。

## 三、远程仓库管理

### 查看关联的远程仓库

```bash
git remote -v
```

```bash
# 输出示例
PS E:\private\blog> git remote -v
origin  https://gitee.com/wayliuhaha/blog.git (fetch)
origin  https://gitee.com/wayliuhaha/blog.git (push)
```

### 更改关联的远程仓库

```bash
git remote rm origin                                   # 移除关联
git remote add origin https://gitee.com/wayliuhaha/blog.git   # 重新添加关联
git push -u origin main                                # 首次指定上游推送
```

> 当仓库地址改变（如换 GitHub / Gitee 镜像）时，只需移除 `origin` 再重新 `add` 即可，本地历史与分支不受影响。

## 四、工作流与分支协作

多成员协作时，为避免直接向主分支乱推，常见做法是：

1. 从主分支拉最新代码并创建自己的功能分支：`git checkout -b feature/my-feature`
2. 在分支上开发并提交。
3. 推送到远程分支并发起合并请求（Merge/Pull Request）。
4. 主分支管理员评审后合并，其他成员 `git pull` 同步。

分支管理常用命令：

```bash
git branch                # 查看所有分支
git branch -vv            # 查看每个分支与远程的关联情况
git checkout -b <name>    # 新建并切换分支
git merge <branch>        # 把某分支合并到当前分支
git pull                  # 拉取并合并（等价 fetch + merge）
git pull --rebase         # 拉取并以变基方式合并，历史更线性
```

### 合并冲突解决要点

- 调用 `git merge` / `git pull` 后若提示冲突，会标记出冲突文件（`both modified`）。
- 打开冲突文件，通过 `<<<<<<<`、`=======`、`>>>>>>>` 区域手动选择保留的代码。
- 解决后 `git add <file>` 并 `git commit` 完成合并。
- 技巧：提前 `git pull` 保持分支最新、提交粒度保持单一切合主题，能显著减少冲突。

## 五、Gitee / GitHub 镜像同步

如果你同时使用 Gitee（国内访问快）与 GitHub（国际社区），可配置**仓库镜像**让两者自动同步，避免"提交两边"。以 Gitee 镜像到 GitHub 为例（Push 方向：提交到 Gitee 时自动同步到 GitHub）。

### 在 Gitee 配置镜像

1. 进入需要使用镜像功能的仓库，进入「管理」→「仓库镜像管理」→ 点击「添加镜像」。
2. 若未绑定 GitHub 账号，根据弹窗提示绑定。
3. 在「镜像方向」中选择 **Push 方向**。
4. 在「镜像仓库」下拉列表中选择需要镜像的仓库。
5. 在「个人令牌」中输入你的 GitHub 私人令牌。
   - **重要**：私人令牌中必须包含对 `repo` 的访问授权，否则添加后镜像不可用。
6. 点击「添加」保存镜像配置。

### 触发与限制

- 提交代码到 Gitee 仓库即可自动触发镜像同步。
- 也可在镜像管理中**手动更新镜像**。
- 镜像触发的最短间隔时间为 **5 分钟**。
- Push 方向镜像会自动同步分支（Branches）、标签（Tags）、提交记录（Commits）。

> 若只配置了 Push 方向镜像，理论上不限制"从 GitHub 拉代码再推到 Gitee"的流程；但要注意，反向（GitHub 上的改动回推 Gitee）若希望自动同步，需另配 Pull 方向镜像。实际使用中建议统一以 Gitee 为"提交主力"，GitHub 作为联动镜像即可。

### GitHub 私人令牌

GitHub → Settings（设置）→ Developer settings（开发者设置）→ Personal access tokens（Personal Access Token）→ Generate new token，勾选 `repo` 相关权限后生成，妥善保存（令牌仅显示一次）。

## 六、Monorepo（单仓库多模块）

### 什么是 Monorepo

**Monorepo** 指在**单个仓库中管理多个项目/模块**，有助于简化代码共享、版本控制、构建和部署的复杂性，提供更好的可复用性与协作性。这种方式已被 Google、Facebook、Microsoft 等大型公司广泛采用。

### 与 MultiRepo 对比

| 场景 | MultiRepo（多仓库多模块） | MonoRepo（单仓库多模块） |
| --- | --- | --- |
| 代码可见性 | ✅ 代码隔离，各 owner 只关心自己仓库；❌ 出问题时需到依赖包中排查 | ✅ 一个仓库看清变化趋势，协作更好；❌ 增加非 owner 改动代码的风险 |
| 依赖管理 | ❌ 多仓库各自 `node_modules`，重复安装、占用磁盘大 | ✅ 相同版本依赖提升到顶层只安装一次，省磁盘 |
| 代码权限 | ✅ 项目隔离、不会误改、单项目问题不影响其他 | ❌ 无项目级权限管控，一项目出问题可能影响整体 |
| 开发迭代 | ❌ 多仓库来回切换效率低，跨仓依赖需手动 `npm link` | ✅ 同仓开发、复用与重构方便；❌ 仓库体积可达数 G，`git clone` 时间较长 |
| 工程配置 | ❌ 各项目构建/校验各自维护，易不一致 | ✅ 工程配置一致，代码质量与风格易统一 |
| 构建部署 | ❌ 跨项目依赖需按顺序手动改版本部署 | ✅ 构建工具可配置依赖优先级，一次命令完成部署 |

### 为什么用 pnpm

在 Monorepo 中，`pnpm` 是流行的包管理器：

- **磁盘空间节省**：相同的文件只存储一次，多个项目共享依赖时避免冗余。
- **安装更快**：文件已存在于 store 中，无需重复下载解压。
- **更优的依赖结构**：
  - npm3 之前是**嵌套结构**（node_modules 里套 node_modules），问题是安装时间延长、重复安装、磁盘占用大。
  - npm3 之后改为**扁平结构**，问题是依赖结构不确定（不同包依赖同一包不同版本，最终版本不确定，需靠 lock 文件锁定）、扁平化算法复杂耗时、以及会出现**幽灵依赖**（未声明的包也能被非法访问）。
- **原生支持 Monorepo（workspace）**。

### pnpm 基本使用

```bash
npm i pnpm -g          # 全局安装
pnpm init              # 初始化 package.json（私有库）
pnpm install vue typescript   # 添加依赖
```

只有 `package.json` 中显式声明的 `vue` 与 `typescript` 会出现在 `node_modules` 根目录，其余依赖放在 `.pnpm` 目录下。

使用 pnpm 时建议建立 `.npmrc`，否则部分模块无法正确放置到 `node_modules`：

```ini
# .npmrc
shamefully-hoist = true
```

安装子模块到根目录、以及 monorepo workspace 内相互引用版本：

```bash
pnpm install @scope/pkg -w     # -w 表示安装到 workspace 根
```

```bash
pnpm -w add -D <dep>           # 给根目录添加开发依赖
pnpm --filter <pkg> add <dep>  # 给某个子包添加依赖
```

> 提示：pnpm 通过 `workspace:` 协议在内部将子包互相链接，从而避免 `npm link` 的手动操作，这也是它在 Monorepo 中更省心的原因之一。

## 最小实现：用 Demo 验证原理

Git 属于版本控制，难以纯前端复现；但工程化里"多人面对的同一份资源、如何感知并同步它的变更"这一思路，可在 `code/frontend/06-engineering` 的 `mini-dev-hmr.html` 看到最朴素的形态：定时轮询一份"变更信号"来决定是否取用新版。原理一句话：协作的本质是"变更的可见与可追溯"，无论 Git 的提交历史还是 HMR 的变更推送，都在回答"现在该拿哪一版"。

## 面试衔接

本节对应 `90-附录-面试体系` 的「工程化与构建」板块：`git reset` 三种模式与 `revert` 区别、分支与冲突解决、Monorepo 与 pnpm 的依赖管理。回到正文，进入本节最后一小节 `05-调试技巧`。