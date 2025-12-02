## 控制器

### 设计意图

- 控制器处理请求，负责接收客户端请求并返回响应
- 遵循单一职责原则

### 用法

控制器负责处理 **HTTP 请求** 并返回响应。

- 使用 `@Controller()` 装饰器定义
- 支持 `@Get()`, `@Post()`, `@Put()`, `@Delete()` 等请求方法装饰器

```
// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller() // 可选参数：指定路由前缀，如 @Controller('users')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get() // 处理 GET / 请求
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('users') // 处理 GET /users 请求
  getUsers() {
    return [{ id: 1, name: '张三' }];
  }
}
```

### 文档资料

#### 资料链接

​	[控制器](https://nest.nodejs.cn/controllers)

#### 其他知识

##### 请求对象

| `@Request(), @Req()`       | `req`                               |
| -------------------------- | ----------------------------------- |
| `@Response(), @Res()`***** | `res`                               |
| `@Next()`                  | `next`                              |
| `@Session()`               | `req.session`                       |
| `@Param(key?: string)`     | `req.params` / `req.params[key]`    |
| `@Body(key?: string)`      | `req.body` / `req.body[key]`        |
| `@Query(key?: string)`     | `req.query` / `req.query[key]`      |
| `@Headers(name?: string)`  | `req.headers` / `req.headers[name]` |
| `@Ip()`                    | `req.ip`                            |
| `@HostParam()`             | `req.hosts`                         |

##### 资源

Nest 为所有标准的 HTTP 方法提供装饰器：`@Get()`、`@Post()`、`@Put()`、`@Delete()`、`@Patch()`、`@Options()` 和 `@Head()`。此外，`@All()` 定义了一个端点来处理所有这些。

```
@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}
  @Get()
  findAll() {
    return this.catsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.catsService.findOne(+id);
  }
  
  ...
}

```

- findAll: `http://localhost:3000/cats`

- findOne: `http://localhost:3000/cats/1`

##### 路由通配符

```
@Get('abcd/*')
findAll() {
  return 'This route uses a wildcard';
}
```

`'abcd/*'` 路由路径将匹配 `abcd/`、`abcd/123`、`abcd/abc` 等。连字符 (`-`) 和点 (`.`) 由基于字符串的路径逐字解释。

##### 状态码

- 响应的默认状态代码始终为 200，但 POST 请求除外，其默认为 201。
- 可以通过在处理程序级别使用 `@HttpCode(...)` 装饰器轻松更改此行为

```
@Post()
@HttpCode(204)
create(@Body() createCatDto: CreateCatDto) {
	return this.catsService.create(createCatDto);
}

create(createCatDto: CreateCatDto) {
	return `create cat: ${createCatDto.name}, ${createCatDto.age}`;
}
```

这里指定了HttpCode(204),会强制NestJs 返回一个空的响应体，无论你的方法返回了什么

##### 响应头

```
@Get()
@Header('Cache-Control', 'no-store')
findAll() {
	return this.catsService.findAll();
}
```

##### 重定向

```
@Get()
@Redirect('https://nest.nodejs.cn', 301)


@Get('docs')
@Redirect('https://nest.nodejs.cn', 302)
getDocs(@Query('version') version) {
  if (version && version === '5') {
    return { url: 'https://nest.nodejs.cn/v5/' };
  }
}
```

##### 路由参数

`http://localhost:3000/cats/1`

使用@Param()

```
@Get(':id')
findOne(@Param('id') id: string) {
	return this.catsService.findOne(+id);
}
```

##### 请求负载

使用@Query

![image-20251130220328669](image-20251130220328669.png)

```
// create-cat.dto.ts
export class CreateCatDto {
  name: string;
  age: number;
  breed: string;
}

@Post()
create(@Body() createCatDto: CreateCatDto) {
	return this.catsService.create(createCatDto);
}

create(createCatDto: CreateCatDto) {
	return `create cat: ${createCatDto.name}, ${createCatDto.age}, ${createCatDto.breed}`;
}
```

##### 查询参数

`http://localhost:3000/cats?breed=波斯猫`

```
@Get()
findAll(@Query('breed') breed?: string) {
	return this.catsService.findAll(breed);
}
```

##### 其他

1. 子域路由
2. 状态共享
3. 异步性