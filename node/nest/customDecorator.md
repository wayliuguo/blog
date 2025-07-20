## 基础使用

### 创建

```
nest g decorator test --flat
```

![image-20250720130108077](image-20250720130108077.png)

### 验证

```
nest g guard test --flat --no-spec
```

![image-20250720131719117](image-20250720131719117.png)

![image-20250720131839047](image-20250720131839047.png)

![image-20250720131855831](image-20250720131855831.png)

## 合并多个装饰器

### 创建

```
nest g decorator test2 --flat
```

![image-20250720150605528](image-20250720150605528.png)

### 验证

![image-20250720150637797](image-20250720150637797.png)

```
访问：http://localhost:3000/hello2
```

![image-20250720150709227](image-20250720150709227.png)

## 自定义参数装饰器

### 参数透传

```
nest g decorator test3 --flat
```

![image-20250720151556337](image-20250720151556337.png)

![image-20250720151622793](image-20250720151622793.png)

![image-20250720151639528](image-20250720151639528.png)

### 实现内置装饰器-headers

```
nest g decorator MyHeaders --flat
```

![image-20250720152322483](image-20250720152322483.png)

![image-20250720152339108](image-20250720152339108.png)

![image-20250720152346878](image-20250720152346878.png)

### 实现内置装饰器-@Query

```
nest g decorator MyQuery --flat
```

![image-20250720152944858](image-20250720152944858.png)

![image-20250720153003279](image-20250720153003279.png)

![image-20250720153016784](image-20250720153016784.png)

## class 装饰器

### 基础使用

```
nest g decorator test4 --flat
```

![image-20250720154934132](image-20250720154934132.png)

![image-20250720155005138](image-20250720155005138.png)

![image-20250720155045855](image-20250720155045855.png)

### 组合多个装饰器

```
nest g decorator test5 --flat
```

![image-20250720155423125](image-20250720155423125.png)

![image-20250720160727249](image-20250720160727249.png)

![image-20250720160741661](image-20250720160741661.png)