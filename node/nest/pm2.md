## 安装

```
npm install pm2@latest -g
```



## 启动应用

```
pm2 start .\dist\main.js
```

![image-20251218225556381](image-20251218225556381.png)

PM2 会立即将你的应用放入后台运行，并赋予它一个唯一的 ID。

**常用启动选项** 

- `--name <app_name>`: 为应用起个名字，方便管理。
- `--watch`: 监听文件变化，自动重启应用。
- `-i <instances>`: 启动多个实例（集群模式）。使用 `-i max`会根据你的 CPU 核心数创建最大实例数，实现负载均衡。
- `--max-memory-restart <200MB>`: 当应用内存超过设定值时自动重启。

## 基本命令

### 查看应用列表和状态

查看所有被 `PM2` 管理的应用列表和状态

```
pm2 list 或 pm2 ls
```

### 重启指定应用

重启指定应用。（`<app_name>`可以是应用名、ID 或 `all`)

```
pm2 restart <app_name>
```

### 停止指定应用

停止指定应用，但不会从 `PM2` 列表中移除。（`<app_name>`可以是应用名、ID 或 `all`)

```
pm2 stop <app_name>
```

### 停止并移除指定应用

停止并从 `PM2` 列表中移除指定应用。（`<app_name>`可以是应用名、ID 或 `all`)

```
pm2 delete <app_name>
```

### 显示日志

显示指定应用的实时日志。使用 `Ctrl+C`退出。（`<app_name>`可以是应用名、ID 或 `all`)

```
pm2 logs <app_name>
```

查看`pm2`日子目录下的文件：

```
ls ~/.pm2/logs
```

<img src="./image-20251218230610889.png" alt="image-20251218230610889" style="zoom:100%;" />

进一步查看：

```
cat ~/.pm2/logs/main-out.log
```

### 实时监控仪表板

打开一个实时监控仪表板，查看应用的 CPU、内存使用情况。

```
pm2 monit
```

## 进阶使用

### 集群模式

对于 `Node.js` 应用，`PM2` 的集群模式非常强大，可以轻松实现零停机重启和负载均衡。

```
# 启动一个应用，并利用所有CPU核心进行负载均衡
pm2 start app.js -i max
# 重新启动所有实例，实现不间断更新（Zero Downtime Reload）
pm2 reload all
```

### 开机自动启动

确保服务器重启后，你的应用能自动重新运行。

```
# 1. 生成开机启动脚本（只需运行一次）
pm2 startup
# 2. 保存当前应用列表（每次添加新应用后都应执行）
pm2 save
```

执行后，PM2 和你的应用就会在系统启动时自动运行。

### 使用配置文件

当需要复杂配置（如设置环境变量、指定日志路径）时，推荐使用配置文件。

#### 生成模板配置文件

```
pm2 ecosystem
```

会生成这会生成一个 `ecosystem.config.js`文件。

```
module.exports = {
  apps : [{
    script: 'index.js',
    watch: '.'
  }, {
    script: './service-worker/',
    watch: ['./service-worker']
  }],

  deploy : {
    production : {
      user : 'SSH_USERNAME',
      host : 'SSH_HOSTMACHINE',
      ref  : 'origin/master',
      repo : 'GIT_REPOSITORY',
      path : 'DESTINATION_PATH',
      'pre-deploy-local': '',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};

```

1. `apps` 部分：定义要启动的进程

   1. 第一个进程
      - `script: 'index.js'`：指定启动的入口文件为当前目录的 `index.js`（通常是主应用服务，如 Express/Koa 服务）。
      - `watch: '.'`：开启**热监控**，监控当前目录（`.`）下的所有文件变化，一旦文件修改，PM2 会自动重启该进程。
   2. 第二个进程
      - `script: './service-worker/'`：指定启动的目录为 `./service-worker/`（PM2 会尝试读取该目录下的 `index.js` 作为入口）。
      - `watch: ['./service-worker']`：仅监控 `service-worker` 目录下的文件变化，避免主应用的修改影响该进程。

2. `deploy` 部分：定义自动化部署流程

   ```
   deploy: {
     production: {
       user: 'SSH_USERNAME', // 服务器的 SSH 用户名
       host: 'SSH_HOSTMACHINE', // 服务器的 SSH 地址（IP/域名）
       ref: 'origin/master', // 要拉取的 Git 分支（如 origin/main）
       repo: 'GIT_REPOSITORY', // Git 仓库地址（如 git@github.com:xxx/xxx.git）
       path: 'DESTINATION_PATH', // 项目在服务器上的部署路径
       'pre-deploy-local': '', // 本地部署前执行的命令（空表示不执行）
       'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production', // 部署后执行的命令
       'pre-setup': '' // 服务器初始化前执行的命令（空表示不执行）
     }
   }
   ```

   这部分是 `PM2` 的 **`pm2 deploy`** 命令的配置，用于通过 SSH 自动将 Git 仓库的代码拉取到服务器并完成部署。

3. 注意点

   1. `watch: '.'` 的性能与风险问题

      - **问题**：监控当前目录（`.`）会包含 `node_modules`、`logs`、`tmp` 等无关目录，这些目录的文件变化（如日志写入、依赖安装）会触发不必要的进程重启，导致：

        - 性能损耗：PM2 频繁扫描所有文件，占用服务器资源。
        - 意外重启：比如 `npm install` 时修改 `node_modules`，会导致进程反复重启。

      - **解决**：**精确指定监控的目录 / 文件**，并排除无关目录：

        ```
        {
          script: 'index.js',
          watch: ['src', 'config'], // 仅监控业务代码目录
          ignore_watch: ['node_modules', 'logs', '*.log'], // 排除无需监控的目录/文件
          watch_options: {
            followSymlinks: false // 关闭符号链接跟踪，提升性能
          }
        }
        ```

   2. `script: './service-worker/'` 的模糊性

      - **问题**：指定目录作为 `script` 时，PM2 会默认寻找该目录下的 `index.js`，但如果该目录下没有 `index.js`，会启动失败。

      - **解决**：**明确指定入口文件**，提高可读性和稳定性：

        ```
        {
          script: './service-worker/index.js', // 明确入口文件
          watch: ['./service-worker']
        }
        ```

   3. 部署配置的占位符未替换

      - **问题**：`SSH_USERNAME`、`SSH_HOSTMACHINE`、`GIT_REPOSITORY`、`DESTINATION_PATH` 都是占位符，直接使用会导致部署失败。

      - **解决**：替换为实际的配置，例如：

        ```
        user: 'root', // 服务器 SSH 用户名
        host: '47.98.123.45', // 服务器 IP
        ref: 'origin/main', // Git 分支（注意：GitHub 新仓库默认分支是 main 而非 master）
        repo: 'git@github.com:your-name/your-project.git', // Git 仓库地址（推荐 SSH 方式）
        path: '/var/www/your-project', // 服务器上的部署路径
        ```

   4. 部署后命令的健壮性问题

      - **问题**：`post-deploy: 'npm install && pm2 reload ecosystem.config.js --env production'` 存在两个风险：

        - 如果 `npm install` 失败（如依赖下载超时），后续的 `pm2 reload` 仍会执行，导致服务异常。
        - 未指定 `node`/`npm` 版本（如果服务器有多个 Node 版本，可能导致依赖安装错误）。

      - **解决：**

        - 使用 `&&` 改为 `;` 或添加错误判断（推荐用 `set -e` 让命令链在出错时终止）。

        - 指定 Node 版本（如使用 `nvm` 或 `node -v` 确认版本）。

          ```
          'post-deploy': 'cd /var/www/your-project && nvm use 18 && npm install --production && pm2 reload ecosystem.config.js --env production',
          ```

          （`--production` 表示只安装生产依赖，加快部署速度）

   5. 缺少进程的基础配置

      - **问题**：当前配置未指定进程名称、内存限制、日志路径等关键参数，不利于多进程管理和问题排查。

      - **解决**：添加常用配置项，示例：

        ```
        apps: [{
          name: 'main-app', // 进程名称（方便 pm2 list 识别）
          script: 'index.js',
          watch: ['src', 'config'],
          ignore_watch: ['node_modules', 'logs'],
          instances: 2, // 启动多实例（CPU 核心数，推荐用 max）
          exec_mode: 'cluster', // 集群模式（利用多核 CPU）
          max_memory_restart: '1G', // 内存超过 1G 时自动重启
          log_date_format: 'YYYY-MM-DD HH:mm:ss', // 日志时间格式
          error_file: './logs/main-app-error.log', // 错误日志路径
          out_file: './logs/main-app-out.log', // 标准输出日志路径
          env: {
            NODE_ENV: 'development' // 开发环境变量
          },
          env_production: {
            NODE_ENV: 'production' // 生产环境变量
          }
        }, {
          name: 'service-worker', // 第二个进程的名称
          script: './service-worker/index.js',
          watch: ['./service-worker'],
          instances: 1,
          max_memory_restart: '512M'
        }]
        ```

4. 优化后的完整配置

   ```
   module.exports = {
     apps: [{
       // 主应用进程
       name: 'main-app',
       script: 'index.js',
       // 监控配置
       watch: ['src', 'config'],
       ignore_watch: ['node_modules', 'logs', '*.log'],
       watch_options: {
         followSymlinks: false
       },
       // 进程性能配置
       instances: 'max', // 启动与 CPU 核心数一致的实例
       exec_mode: 'cluster', // 集群模式
       max_memory_restart: '1G', // 内存超限重启
       // 日志配置
       log_date_format: 'YYYY-MM-DD HH:mm:ss',
       error_file: './logs/main-app-error.log',
       out_file: './logs/main-app-out.log',
       // 环境变量
       env: {
         NODE_ENV: 'development'
       },
       env_production: {
         NODE_ENV: 'production'
       }
     }, {
       // 服务工作进程
       name: 'service-worker',
       script: './service-worker/index.js',
       watch: ['./service-worker'],
       ignore_watch: ['node_modules'],
       instances: 1,
       max_memory_restart: '512M',
       error_file: './logs/service-worker-error.log',
       out_file: './logs/service-worker-out.log',
       env: {
         NODE_ENV: 'development'
       },
       env_production: {
         NODE_ENV: 'production'
       }
     }],
   
     deploy: {
       production: {
         user: 'root', // 服务器 SSH 用户名
         host: '47.98.123.45', // 服务器 IP/域名
         ref: 'origin/main', // Git 分支
         repo: 'git@github.com:your-name/your-project.git', // Git 仓库（SSH 地址）
         path: '/var/www/your-project', // 服务器部署路径
         'pre-deploy-local': '', // 本地预部署命令（如拉取最新代码）
         'post-deploy': 'cd /var/www/your-project && npm install --production && pm2 reload ecosystem.config.js --env production',
         'pre-setup': '' // 服务器初始化前命令（如创建目录）
       }
     }
   };
   ```

#### 常用命令

##### 启动进程

```
pm2 start ecosystem.config.js
```

##### 启动生产环境进程

```
pm2 start ecosystem.config.js --env production
```

##### 查看进程状态

```
pm2 list
```

##### 重启进程

```
pm2 reload ecosystem.config.js
```

##### 部署到生产服务器

```
pm2 deploy ecosystem.config.js production
```

##### 查看部署日志

```
pm2 deploy ecosystem.config.js production --verbose
```

## nest 项目使用

### nest pm2 配置

#### 明确 nestjs 的生产环境启动方式

`NestJS` 项目开发时用 `nest start --watch`，生产环境需先编译（`nest build`）生成 `dist` 目录，然后启动 `dist/main.js`（默认入口）。

#### 适配 NestJS 的 PM2 配置文件

我测试的项目不需要`nest-worker`这个配置

```
module.exports = {
  apps: [
    {
      // 主 NestJS 应用进程
      name: 'nest-main',
      // 指向 NestJS 编译后的入口文件
      script: './dist/main.js',
      // 集群模式（NestJS 支持 Cluster 模式，利用多核 CPU）
      exec_mode: 'cluster',
      // 启动与 CPU 核心数一致的实例（或指定数字，如 2）
      instances: 'max',
      // 内存超限重启（根据项目需求调整）
      max_memory_restart: '1G',
      // 环境变量（可覆盖 NestJS 的 .env 文件）
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // 日志配置（NestJS 的日志可结合 PM2 日志）
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/nest-main-error.log',
      out_file: './logs/nest-main-out.log',
      // 监控配置（仅监控编译后的 dist 目录和配置文件，避免源码变更触发重启）
      watch: ['./dist', './config'],
      ignore_watch: ['node_modules', 'logs', '*.log'],
      watch_options: {
        followSymlinks: false
      }
    },
    {
      // 服务工作线程进程（如定时任务、消息队列消费服务）
      name: 'nest-worker',
      // 假设 worker 的编译后入口在 dist/service-worker/main.js
      script: './dist/service-worker/main.js',
      // 辅助服务单实例即可
      instances: 1,
      max_memory_restart: '512M',
      error_file: './logs/nest-worker-error.log',
      out_file: './logs/nest-worker-out.log',
      watch: ['./dist/service-worker'],
      ignore_watch: ['node_modules', 'logs']
    }
  ]
};
```

#### 关键注意事项

- **避免监控源码目录**：NestJS 的源码（`src`）变更不会直接生效，需先编译，因此 PM2 只需监控 `dist` 目录（编译后的产物）。
- **集群模式的兼容性**：NestJS 的 `@nestjs/core` 从 v7 开始原生支持 Cluster 模式，无需额外配置。
- **环境变量**：PM2 的 `env` 会覆盖 NestJS 的 `.env` 文件，可根据环境灵活配置。

#### 测试

![image-20251219221904682](image-20251219221904682.png)

### 结合docker部署方案

Docker 容器化 NestJS + PM2 项目的核心是**构建轻量级镜像**，并在容器内通过 PM2 启动进程。

#### 两种常见部署模式

| 模式             | 适用场景                 | 优点                   | 缺点                               |
| ---------------- | ------------------------ | ---------------------- | ---------------------------------- |
| **单容器多进程** | 小型项目、资源有限的环境 | 配置简单，运维成本低   | 单容器故障会导致所有进程挂掉       |
| **多容器单进程** | 中大型项目、微服务架构   | 进程隔离，可独立扩缩容 | 配置复杂，需用 Docker Compose 管理 |

#### 编写 Dockerfile (基于 Node 镜像)

选择**轻量级的 Node 镜像**（如 `node:18-alpine`），减少镜像体积。

```
# 阶段1：构建依赖和编译代码（构建阶段）
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json（利用 Docker 缓存）
COPY package*.json ./

# 安装所有依赖（包括开发依赖，因为需要 nest build 编译）
RUN npm install

# 复制项目源码
COPY . .

# 编译 NestJS 项目（生成 dist 目录）
RUN npm run build

# 阶段2：生产环境镜像（运行阶段）
FROM node:18-alpine AS production

# 设置工作目录
WORKDIR /app

# 安装 PM2（生产环境需要 PM2 进程管理）
RUN npm install -g pm2

# 从构建阶段复制依赖和编译后的代码
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/ecosystem.config.js ./
# 若有配置文件（如 config 目录、.env），也需要复制
COPY --from=builder /app/config ./config
COPY --from=builder /app/.env ./

# 安装生产依赖（忽略开发依赖，减小镜像体积）
RUN npm install --production

# 创建日志目录（PM2 日志需要写入权限）
RUN mkdir -p /app/logs

# 暴露 NestJS 服务端口（与配置中的 PORT 一致）
EXPOSE 3000

# 用 PM2 启动应用（使用生产环境配置）
CMD ["pm2-runtime", "ecosystem.config.js", "--env", "production"]
```

Dockerfile 关键说明：

- **多阶段构建**：将构建和运行分离，避免镜像中包含开发依赖和源码，减小体积。
- **pm2-runtime**：PM2 提供的**运行时模式**（专为容器化设计），能正确处理容器的信号（如 SIGTERM），保证进程优雅退出。
- **日志目录**：提前创建 `logs` 目录，避免 PM2 启动时因权限问题无法写入日志。

#### 编写 `.dockerignore`文件

排除不必要的文件，加快构建速度，减小镜像体积：

```
# 依赖目录（构建阶段已安装，生产阶段重新安装）
node_modules/
# 日志目录（容器内动态生成）
logs/
# 临时文件
*.log
.DS_Store
.git
.gitignore
.npmrc
# 其他无关文件
README.md
```

####  Docker Compose 简化部署（可选）

如果需要管理多个服务（如 NestJS + Redis + MySQL），可编写 `docker-compose.yml`：

```
version: '3.8'

services:
  nest-app:
    # 构建镜像
    build: .
    # 容器名称
    container_name: nest-pm2-app
    # 重启策略（容器故障自动重启）
    restart: always
    # 端口映射（宿主端口:容器端口）
    ports:
      - "3000:3000"
    # 环境变量（可覆盖 PM2 和 NestJS 的配置）
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://root:password@mysql:3306/nest_db
    # 卷挂载（持久化日志和配置）
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config
    # 依赖服务（如先启动 mysql 和 redis）
    depends_on:
      - mysql
      - redis

  # 数据库服务（示例）
  mysql:
    image: mysql:8.0
    container_name: nest-mysql
    restart: always
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=nest_db
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql

  # Redis 服务（示例）
  redis:
    image: redis:alpine
    container_name: nest-redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

# 数据卷（持久化数据）
volumes:
  mysql-data:
  redis-data:
```

#### 构建和运行容器

#####  构建 Docker 镜像

```
docker build -t nest-pm2-app:latest .
```

##### 直接运行容器（无 Docker Compose）

```
docker run -d -p 3000:3000 --name nest-app nest-pm2-app:latest
```

##### 用 Docker Compose 启动所有服务

```
# 启动服务（后台运行）
docker-compose up -d

# 查看日志
docker-compose logs -f nest-app

# 停止服务
docker-compose down
```

##### 容器内PM2操作

```
# 进入容器
docker exec -it nest-app /bin/sh

# 查看 PM2 进程状态
pm2 list

# 查看日志
pm2 logs nest-main

# 重启进程
pm2 reload ecosystem.config.js
```

## nest start/deploy/runtime

### 核心定义与用途对比

| 命令          | 核心用途                                                     | 适用场景                           | 本质角色           |
| ------------- | ------------------------------------------------------------ | ---------------------------------- | ------------------ |
| `pm2 start`   | **启动 / 管理本地 Node.js 进程**（单台服务器上的进程生命周期管理） | 开发环境、单台服务器的生产环境     | 本地进程管理器     |
| `pm2 deploy`  | **通过 SSH 自动化部署代码到远程服务器**（从本地 / 仓库到远程的全流程部署） | 多台服务器的生产环境部署、持续交付 | 自动化部署工具     |
| `pm2-runtime` | **为 Docker/K8s 容器化环境优化的 PM2 运行时**（适配容器的信号和生命周期） | Docker/K8s 等容器化环境的进程运行  | 容器化进程守护进程 |



### 核心差异总结

#### 作用范围不同

- `pm2 start`：**本地单进程**（当前服务器）。
- `pm2 deploy`：**本地 → 远程**（跨服务器的部署流程）。
- `pm2-runtime`：**容器内进程**（容器环境的进程运行）。

#### 依赖环境不同

- `pm2 start`：依赖当前服务器的代码和 Node 环境。
- `pm2 deploy`：依赖 SSH 连接、Git 仓库和远程服务器环境。
- `pm2-runtime`：依赖 Docker/K8s 等容器化环境，需作为容器主进程。

#### 核心目标不同

- `pm2 start`：**管理进程**（启动、监控、重启）。
- `pm2 deploy`：**交付代码**（从仓库到服务器的自动化部署）。
- `pm2-runtime`：**适配容器**（让 PM2 能在容器中稳定运行）。

### 最佳实践：如何选择使用？

1. **开发环境**：
   - 用 `pm2 start index.js --watch` 启动进程，方便热更新。
2. **单台物理机 / 虚拟机生产环境**：
   - 先用 `git pull` 拉取代码，再用 `pm2 start ecosystem.config.js` 启动进程。
   - 若需自动化，可结合 `pm2 deploy` 简化流程。
3. **多台服务器生产环境**：
   - 用 `pm2 deploy` 实现批量部署，统一管理多台服务器的代码和进程。
4. **Docker/K8s 容器化环境**：
   - 用 `pm2-runtime` 启动进程，绝对不要用 `pm2 start`（容器会秒退）。
   - 部署通过 Docker 镜像构建 + 容器编排实现，`pm2 deploy` 仅作为辅助。