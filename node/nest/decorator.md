## 装饰器列表

1. @Module： 声明 Nest 模块
2. @Controller：声明模块里的 controller
3. @Injectable：声明模块里可以注入的 provider
4. @Inject：通过 token 手动指定注入的 provider，token 可以是 class 或者 string
5. @Optional：声明注入的 provider 是可选的，可以为空
6. @Global：声明全局模块
7. @Catch：声明 exception filter 处理的 exception 类型
8. @UseFilters：路由级别使用 exception filter
9. @UsePipes：路由级别使用 pipe
10. @UseInterceptors：路由级别使用 interceptor
11. @SetMetadata：在 class 或者 handler 上添加 metadata
12. @Get、@Post、@Put、@Delete、@Patch、@Options、@Head：声明 get、post、put、delete、patch、options、head 的请求方式
13. @Param：取出 url 中的参数，比如 /aaa/:id 中的 id
14. @Query: 取出 query 部分的参数，比如 /aaa?name=xx 中的 name
15. @Body：取出请求 body，通过 dto class 来接收
16. @Headers：取出某个或全部请求头
17. @Session：取出 session 对象，需要启用 express-session 中间件
18. @HostParm： 取出 host 里的参数
19. @Req、@Request：注入 request 对象
20. @Res、@Response：注入 response 对象，一旦注入了这个 Nest 就不会把返回值作为响应了，除非指定 passthrough 为true
21. @Next：注入调用下一个 handler 的 next 方法
22. @HttpCode： 修改响应的状态码
23. @Header：修改响应头
24. @Redirect：指定重定向的 url
25. @Render：指定渲染用的模版引擎