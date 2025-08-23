```
npm install express multer cors
```

![image-20250823152112870](image-20250823152112870.png)

![image-20250823152138491](image-20250823152138491.png)

app.use 使用中间件 cors 来处理跨域。

用 multer 处理文件上传，指定保存目录为 uploads/

```
nodemon index.js
npx http-server .
```

