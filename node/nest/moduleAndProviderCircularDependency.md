## Module 循环依赖demo

```
nest new module-test -p npm

nest g module aM
nest g module bM
```

![image-20250727162749815](image-20250727162749815.png)

![image-20250727162913943](image-20250727162913943.png)

![image-20250727162955962](image-20250727162955962.png)

## 解决Module循环依赖

![image-20250727163743342](image-20250727163743342.png)

![image-20250727163757140](image-20250727163757140.png)



## Provider 循环依赖demo

```
nest g service aS --no-spec --flat
nest g service bS --no-spec --flat
```

![image-20250728213720337](image-20250728213720337.png)

![image-20250728213735719](image-20250728213735719.png)

![image-20250728213752491](image-20250728213752491.png)

![image-20250728213805592](image-20250728213805592.png)