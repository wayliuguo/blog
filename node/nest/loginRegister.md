## 两种登录状态保存方式

两种状态登录保存方式：

- 服务端存储的 session + cookie
- 客户端存储的 token

### 服务端存储的 session + cookie

#### 核心原理

- **Session**：服务器为每个登录用户创建的「身份凭证」，存储在服务器端（内存 / 数据库 / Redis），包含用户 ID、登录状态、过期时间等信息，有唯一的 `sessionId`；

- **Cookie**：浏览器端存储的小文本，服务器通过 `Set-Cookie` 响应头，将用户的 `sessionId` 写入浏览器 Cookie；
- **登录流程**：用户登录 → 服务器创建 Session 并生成 `sessionId` → 把 `sessionId` 写入用户 Cookie → 后续请求时浏览器自动携带 `sessionId` Cookie → 服务器通过 `sessionId` 找到对应的 Session，验证用户身份。

#### CSRF

##### 典型场景

以「用户登录电商网站后被 CSRF 攻击」为例：

1. 用户登录 `shop.com`，浏览器保存登录 Cookie；

2. 攻击者诱导用户点击恶意链接 `evil.com/attack`，该页面包含一段隐藏代码：

   ```
   <!-- 恶意页面的隐藏表单，自动提交转账请求到 shop.com -->
   <form action="https://shop.com/api/transfer" method="POST">
     <input type="hidden" name="toAccount" value="attacker123">
     <input type="hidden" name="amount" value="1000">
   </form>
   <script>document.forms[0].submit();</script>
   ```

3. 用户浏览器会自动向 `shop.com` 发送 POST 请求，且携带 `shop.com` 的登录 Cookie；

4. `shop.com` 验证 Cookie 有效，误以为是用户主动转账，执行转账操作。

##### 解决方案

- 服务器为每个用户会话生成一个**唯一的、随机的 CSRF Token**；
- 前端发起请求时，必须携带这个 Token（如放在请求头、表单隐藏字段）；
- 服务器收到请求时，验证 Token 是否有效（是否与用户会话中的 Token 一致）；
- 攻击者无法获取用户的 Token，因此无法构造合法请求。

##### 缺点

1. 如果是多台服务器，需要做分布式session

   - 一种是 session 复制，也就是通过一种机制在各台机器自动复制 session，并且每次修改都同步下。这个有对应的框架来做，比如 java 的 spring-session。
   - 一种方案是把 session 保存在 redis，这样每台服务器都去那里查，只要一台服务器登录了，其他的服务器也就能查到 session，这样就不需要复制了。

2. 跨域

   cookie 为了安全，是做了 domain 的限制的，设置 cookie 的时候会指定一个 domain，只有这个 domain 的请求才会带上这个 cookie。不同的domain，例如有多级域名，则需要设置为顶级域名

### 客户端存储 token

#### jwt 结构

JWT 由 **Header（头部）、Payload（载荷）、Signature（签名）** 三部分组成，用 `.` 分隔，例如：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwiaWQiOjEsImV4cCI6MTczNTY4OTYwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

##### 1. Header（头部）

- 包含加密算法和 Token 类型，Base64 编码（可解码，非加密）；
- 示例：`{ "alg": "HS256", "typ": "JWT" }`（HS256 是对称加密算法）。

##### 2. Payload（载荷）

- 存储用户身份信息（如 ID、用户名）和过期时间，Base64 编码（可解码，**不要存敏感信息**）；
- 内置字段（推荐使用）：
  - `exp`：过期时间（时间戳，必填，防止 Token 永久有效）；
  - `iss`：签发者；
  - `sub`：主题（用户 ID）。
- 示例：`{ "id": 1, "username": "admin", "exp": 1735689600 }`。

##### 3. Signature（签名）

- 服务器用「Header 指定的算法 + 密钥」对 Header+Payload 加密，生成签名；

- 核心作用：防止 Token 被篡改（一旦篡改，签名验证失败）；

- 计算公式（HS256 算法）：

  ```plaintext
  HMACSHA256(
    base64UrlEncode(Header) + "." + base64UrlEncode(Payload),
    服务器密钥（如 "your-secret-key"）
  )
  ```

#### 流程

![img](66-5.png)

#### 优缺点

1. 优点
   - **无状态**：服务器无需存储 Token，高并发 / 分布式部署更友好；
   - **跨域友好**：Token 放在请求头，突破 Cookie 同源策略限制；
   - **多端兼容**：适配 Web/APP/ 小程序（统一用 Token 验证）；
   - **轻量高效**：字符串格式，传输 / 解析成本低。
2. 缺点
   - **无法主动作废**：Token 签发后，服务器无法主动销毁（除非存黑名单，失去无状态优势）；
   - **Payload 可解码**：不能存敏感信息，仅能存非敏感身份标识；
   - **过期时间固定**：无法动态调整（需刷新 Token 机制补充）；
   - **签名密钥风险**：密钥泄露会导致 Token 被伪造，需定期更换。

## nest 里实现 session 和 jwt

### nest 里实现session

