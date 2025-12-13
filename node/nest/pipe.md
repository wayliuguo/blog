## 核心作用

**数据验证（Validation）**：检查输入数据是否符合特定的规则和约束。如果数据无效，管道会抛出一个异常，该异常最终会被 NestJS 的异常处理层捕获，并返回一个错误响应（如 HTTP 400 Bad Request）给客户端。

**数据转换（Transformation）**：将输入数据从一种格式或类型转换为另一种。例如，将 URL 参数中的字符串 `"123"`转换为数字 `123`，以便在业务逻辑中直接使用。

## 内置管道

NestJS 提供了一系列开箱即用的内置管道，覆盖了常见的验证和转换场景。以下是其中一些最常用的管道：

| 管道名称               | 主要功能                                                     | 典型应用场景示例                                             |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **`ValidationPipe`**   | 结合 `class-validator`库，对 DTO（数据传输对象）进行强大且声明式的验证。 | 验证请求体（`@Body()`）的格式，如用户名是否为空、邮箱格式是否正确。 |
| **`ParseIntPipe`**     | 将字符串转换为整数。转换失败则抛出异常。                     | 转换路径参数中的 ID，如 `@Param('id', ParseIntPipe) id: number`。 |
| **`ParseBoolPipe`**    | 将字符串（如 `"true"`, `"1"`）转换为布尔值。                 | 转换查询参数中的状态标志，如 `@Query('active', ParseBoolPipe) isActive: boolean`。 |
| **`ParseArrayPipe`**   | 将字符串表示的数组（如 `"1,2,3"`）转换为真正的数组，并可指定元素类型。 | 处理多选查询参数，如 `@Query('ids', new ParseArrayPipe({ items: Number })) ids: number[]`。 |
| **`ParseUUIDPipe`**    | 验证参数是否为有效的 UUID 格式。                             | 验证路径参数中的资源标识符。                                 |
| **`DefaultValuePipe`** | 当查询参数为 `undefined`或 `null`时，提供默认值。            | 为分页参数设置默认值，如 `@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number`。 |

## 管道的绑定方式

### 参数级别

```
import {
  Controller,
  Get,
  ParseIntPipe,
} from '@nestjs/common';

@Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.catsService.findOne(id);
  }
```

### 方法级别

```
// create-cat.dto.ts
export class CreateCatDto {
  @IsNotEmpty({message: '名字不能为空'})
  name: string;

  @IsInt({message: '年龄必须是数字'})
  age: number;
  
  @IsNotEmpty({message: '品种不能为空'})
  breed: string;
}
```

```
// cats.controller.ts
@Post()
@UsePipes(new ValidationPipe())
create(@Body() createCatDto: CreateCatDto) {
	return this.catsService.create(createCatDto);
}
```

### 控制器级别

```
@Controller('cats')
@UsePipes(ValidationPipe)
export class CatsController {
  // ... 该控制器下所有方法的参数都会经过 ValidationPipe
}
```

### 全局级别

```
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3000);
}
```

## 深入使用 ValidationPipe

ValidationPipe是最强大和最常用的管道，它通常与 class-validator和 class-transformer库配合使用。

### 安装依赖

```
npm install class-validator class-transformer
```

### 定义DTO并设置验证规则

使用 `class-validator`提供的装饰器来声明验证规则。

```
// create-user.dto.ts
import { IsString, IsEmail, IsInt, Min, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MaxLength(20)
  name: string;

  @IsEmail()
  email: string;

  @IsInt()
  @Min(0)
  age: number;
}
```

### 启用全局 ValidationPipe 并配置选项

在 `main.ts`中，可以配置 `ValidationPipe`的强大选项。

```
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,        // 自动移除 DTO 中未定义的属性
    forbidNonWhitelisted: true, // 当请求包含 DTO 未定义的属性时，直接抛出错误
    transform: true,        // 自动将普通 JS 对象转换为 DTO 类的实例，并尝试进行类型转换（如字符串转数字）
  }));
  
  await app.listen(3000);
}
```

- whitelist: true：确保你的 API 只接受预定义的字段，增强安全性
- forbidNonWhitelisted: true：在开发阶段快速发现前端传递的多余或错误字段
- transform: true：自动进行类型转换，让控制器方法直接获得类型正确的数据

## 创建自定义管道

这个管道用于验证输入的电话号码格式。

```
import { PipeTransform, Injectable, BadRequestException, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class PhoneValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    console.log('PhoneValidationPipe-metadata', metadata);
    const checkExp = /^(\+86-)?1[3456789]\d{9}$/; // 简单的手机号正则
    if (!checkExp.test(value.phone)) {
      throw new BadRequestException('手机号码格式不正确');
    }
    return value; // 验证通过，返回原值
  }
}
```

```
import { Controller, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { PhoneValidationPipe } from 'src/common/pipe/phone-validation.pipe';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body(PhoneValidationPipe) registerUserDto: RegisterUserDto) {
    return this.userService.register(registerUserDto);
  }
}
```

