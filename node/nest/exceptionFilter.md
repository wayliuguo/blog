## 异常默认处理

Exception Filter 是在 Nest 应用抛异常的时候，捕获它并返回一个对应的响应。如：

![image-20250809214945498](image-20250809214945498.png)

## 自定义异常返回格式

```
nest new exception-filter-test

nest g filter hello --flat --no-spec
```

![image-20250816151341902](image-20250816151341902.png)

![image-20250816151357398](image-20250816151357398.png)

![image-20250816151413758](image-20250816151413758.png)

## 异常filter & ValidationPipe 兼容

### 其他异常无法自定义格式

![image-20250816160926764](image-20250816160926764.png)

由于filter catch的是BadRequestException，所以这里无法格式化

![image-20250816161013362](image-20250816161013362.png)

### 使用HttpException 实现

那我们只要 @Catch 指定 HttpException 不就行了？

因为 BadRequestExeption、BadGateWayException 等都是它的子类

![image-20250816162258519](image-20250816162258519.png)

### 兼容 ValidationPipe

```
npm install --save class-validator class-transformer
```

![image-20250816172827981](image-20250816172827981.png)

![image-20250816172841577](image-20250816172841577.png)

![image-20250816172859341](image-20250816172859341.png)

可以看到，提示的错误也不对了。
自定义的 exception filter 会拦截所有 HttpException，但是没有对这种情况做支持。

不加filter 的返回值应该是：

![image-20250816173003398](image-20250816173003398.png)

优化 filter：

![image-20250816173107810](image-20250816173107810.png)

![image-20250816173434269](image-20250816173434269.png)
