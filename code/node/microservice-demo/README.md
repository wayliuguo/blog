# NestJS 微服务架构示例

本示例演示 NestJS 微服务架构，包含三个部分：

- **api-gateway**：API 网关，对外提供 HTTP 接口（端口 3000），通过 TCP 调用内部微服务。
- **user-service**：用户微服务，TCP 传输（端口 3001），负责用户数据的增查。
- **order-service**：订单微服务，TCP 传输（端口 3002），创建订单时会调用 user-service 验证用户。

## 架构示意

```
客户端 ──HTTP──> api-gateway(:3000)
                      │
                      ├──TCP──> user-service(:3001)
                      └──TCP──> order-service(:3002) ──TCP──> user-service(:3001) 校验用户
```

## 启动顺序

> **重要**：必须先启动 user-service 和 order-service，最后启动 api-gateway。

```bash
# 1. 安装依赖（仅首次需要）
npm install

# 2. 启动用户微服务（监听 3001）
npm run start:user

# 3. 启动订单微服务（监听 3002）
npm run start:order

# 4. 启动 API 网关（监听 3000）
npm run start:gateway
```

## 接口测试

启动完成后，可使用以下 HTTP 接口：

```bash
# 获取用户
curl http://localhost:3000/users/1

# 创建用户
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"王五","email":"wangwu@example.com"}'

# 获取订单
curl http://localhost:3000/orders/1

# 创建订单（会先校验 userId 是否存在）
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"product":"商品C","amount":50}'
```

## 通信说明

- 网关与微服务、微服务之间均使用 `@nestjs/microservices` 的 `Transport.TCP` 传输。
- 各服务通过 `ClientsModule.register` 注册 `ClientProxy`，再用 `client.send({ cmd }, payload)` 发起请求。
- 控制端通过 `firstValueFrom` 将 Observable 转为 Promise 以便 `async/await` 调用。

## 预期输出

- 前置：`npm install`；按序启动 `user-service`(3001) → `order-service`(3002) → `api-gateway`(3000)。
- 各服务启动后分别打印 TCP 监听端口；网关额外打印 HTTP 监听 `http://localhost:3000`。
- `curl http://localhost:3000/users/1` 经网关 TCP 调用 user-service 返回对应用户信息。
- `POST http://localhost:3000/orders`（body `{"userId":1,...}`）触发 order-service 再 TCP 调用 user-service 校验 userId，校验通过返回创建结果。
- 若先启动网关而下游微服务未起，调用会因 TCP 连接失败报错，印证「先起下游再起网关」的顺序要求。
