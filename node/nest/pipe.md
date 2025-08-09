## 内置Pipe
Pipe 是在参数传给 handler 之前对参数做一些验证和转换的 class。
内置的 Pipe 有这些：
- ValidationPipe
- ParseIntPipe
- ParseBoolPipe
- ParseArrayPipe
- ParseUUIDPipe
- DefaultValuePipe
- ParseEnumPipe
- ParseFloatPipe
- ParseFilePipe

### ParseIntPipe
实现：

![image-20250809123001797](image-20250809123001797.png)

正常展示：age为number类型
![image-20250809123021195](image-20250809123021195.png)

非正常展示：age为非number类型，自定义异常处理：

![image-20250809123123624](image-20250809123123624.png)



### validationPipe

post 请求的数据是通过 @Body 装饰器来取，并且要有一个 dto class 来接收。validationPipe 可以对post 参数进行参数校验。

```
npm install class-validator class-transformer
```

![image-20250809210440612](image-20250809210440612.png)

![image-20250809210450922](image-20250809210450922.png)

![image-20250809210524753](image-20250809210524753.png)

## 自定义Pipe

![image-20250809124155794](image-20250809124155794.png)

![image-20250809124215517](image-20250809124215517.png)

![image-20250809124227332](image-20250809124227332.png)

## 总结

Pipe 是在参数传给 handler 之前做一些验证和转换的，有 9 个内置的 Pipe 可以直接用。

我们过了一遍内置的 ParseIntPipe、ParseBoolPipe、ParseArrayPipe、ParseUUIDPipe、ParseEnumPipe、ParseFloatPipe 还有 DefaultValuePipe。
