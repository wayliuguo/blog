import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const e="/blog/assets/image-20230814221937758.41e2c0cb.png",D=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"node/mongoDB.md","filePath":"node/mongoDB.md","lastUpdated":1692274482000}'),o={name:"node/mongoDB.md"},p=l('<h2 id="基础概念与操作" tabindex="-1">基础概念与操作 <a class="header-anchor" href="#基础概念与操作" aria-label="Permalink to &quot;基础概念与操作&quot;">​</a></h2><ul><li><p>类似一个大对象，对象里面有不同的集合，集合里面有不同的文档</p><p><img src="'+e+`" alt="image-20230814221937758"></p></li><li><p>数据库操作</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 显示数据库</span></span>
<span class="line"><span style="color:#A6ACCD;">show dbs</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 创建数据库</span></span>
<span class="line"><span style="color:#A6ACCD;">use myDB</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 删除数据库</span></span>
<span class="line"><span style="color:#A6ACCD;">db.dropDatabase()</span></span></code></pre></div></li><li><p>集合</p><ul><li>语法规则：<code>db.collectionName.method</code></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 创建集合</span></span>
<span class="line"><span style="color:#A6ACCD;">db.users.insertOne({name: &#39;well&#39;, age: 18})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 删除集合</span></span>
<span class="line"><span style="color:#A6ACCD;">db.users.drop()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 查看集合</span></span>
<span class="line"><span style="color:#A6ACCD;">show collections</span></span></code></pre></div></li><li><p>文档</p><ul><li><p>MongoDB 将数据记录存储为 BSON 文档</p></li><li><p>BSON（Binary JSON）是 JSON 文档的二进制表示形式，它比 JSON 包含更多的数据类型</p></li><li><p><a href="http://bsonspec.org/" target="_blank" rel="noreferrer">BSON 规范</a></p></li><li><p><a href="https://docs.mongodb.com/manual/reference/bson-types/" target="_blank" rel="noreferrer">BSON 支持的数据类型</a></p></li><li><p>常用数据类型</p><table><thead><tr><th>类型</th><th>整数标识符</th><th>别名（字符串标识符）</th></tr></thead><tbody><tr><td>Double</td><td>1</td><td>“double”</td></tr><tr><td>String</td><td>2</td><td>“string”</td></tr><tr><td>Object</td><td>3</td><td>“object”</td></tr><tr><td>Array</td><td>4</td><td>“array”</td></tr><tr><td>Binary data</td><td>5</td><td>“binData”</td></tr><tr><td>ObjectId</td><td>7</td><td>“objectId”</td></tr><tr><td>Boolean</td><td>8</td><td>“bool”</td></tr><tr><td>Date</td><td>9</td><td>“date”</td></tr><tr><td>Null</td><td>10</td><td>“null”</td></tr><tr><td>Regular Expression</td><td>11</td><td>“regex”</td></tr><tr><td>32-bit integer</td><td>16</td><td>“int”</td></tr><tr><td>Timestamp</td><td>17</td><td>“timestamp”</td></tr><tr><td>64-bit integer</td><td>18</td><td>“long”</td></tr><tr><td>Decimal128</td><td>19</td><td>“decimal”</td></tr></tbody></table></li><li><p>_id 字段</p><ul><li>默认情况下，MongoDB 在创建集合时会在 <code>_id</code> 字段上创建唯一索引</li><li><code>_id</code> 字段始终是文档中的第一个字段</li><li><code>_id</code> 字段可以包含任何 BSON 数据类型的值，而不是数组</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">db.users.find()</span></span>
<span class="line"><span style="color:#A6ACCD;">// {</span></span>
<span class="line"><span style="color:#A6ACCD;">//  _id: ObjectId(&quot;64da394f3793e664ffacbefc&quot;),</span></span>
<span class="line"><span style="color:#A6ACCD;">//  name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">//  age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">// }</span></span></code></pre></div></li></ul><h2 id="创建文档" tabindex="-1">创建文档 <a class="header-anchor" href="#创建文档" aria-label="Permalink to &quot;创建文档&quot;">​</a></h2><ul><li>db.collection.insertOne()</li><li>db.collection.insertMany()</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">db.users.insertOne({name: &#39;xiaoming&#39;, age: 25, info: {sport: [&#39;football&#39;]}})</span></span></code></pre></div><h2 id="查询文档" tabindex="-1">查询文档 <a class="header-anchor" href="#查询文档" aria-label="Permalink to &quot;查询文档&quot;">​</a></h2><ul><li><p>常用查询<a href="https://www.mongodb.com/docs/manual/reference/operator/query/" target="_blank" rel="noreferrer">操作符</a></p><ol><li>比较操作符 <ul><li><code>$eq</code>：等于</li><li><code>$ne</code>：不等于</li><li><code>$gt</code>：大于</li><li><code>$gte</code>：大于等于</li><li><code>$lt</code>：小于</li><li><code>$lte</code>：小于等于</li><li><code>$in</code>：在给定数组中</li><li><code>$nin</code>：不在给定数组中</li></ul></li><li>逻辑操作符 <ul><li><code>$and</code>：逻辑与</li><li><code>$or</code>：逻辑或</li><li><code>$not</code>：逻辑非</li><li><code>$nor</code>：既不是此又不是那个</li></ul></li><li>元素操作符 <ul><li><code>$exists</code>：字段是否存在</li><li><code>$type</code>：字段类型</li></ul></li><li>数组操作符 <ul><li><code>$all</code>：匹配包含所有指定元素的数组</li><li><code>$elemMatch</code>：匹配数组中满足指定条件的元素</li><li><code>$size</code>：匹配数组长度为指定大小的文档</li></ul></li><li>正则表达式操作符 <ul><li><code>$regex</code>：正则表达式匹配</li></ul></li><li>文本搜索操作符 <ul><li><code>$text</code>：文本搜索</li></ul></li><li>日前操作符 <ul><li><code>$date</code>：日期和时间操作</li></ul></li></ol></li><li><p>查询文档</p><ul><li><code>db.collection.find([query][, projection])</code><ul><li>query: 查询条件</li><li>投影操作符指定返回的键，1：返回 0：不返回</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">db.users.find()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 指定查询内容与返回字段</span></span>
<span class="line"><span style="color:#A6ACCD;">db.users.find({name:&#39;well&#39;}, {age: 1})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 利用操作符指定查询内容</span></span>
<span class="line"><span style="color:#A6ACCD;">db.users.find({name: &#39;well&#39;, age: {$lt: 30}})</span></span>
<span class="line"><span style="color:#A6ACCD;">db.users.find({</span></span>
<span class="line"><span style="color:#A6ACCD;">	$or: [</span></span>
<span class="line"><span style="color:#A6ACCD;">        {name: &#39;liuguowei&#39;},</span></span>
<span class="line"><span style="color:#A6ACCD;">        {age: {$lt: 30}}</span></span>
<span class="line"><span style="color:#A6ACCD;">	]</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div></li></ul><h2 id="更新文档" tabindex="-1">更新文档 <a class="header-anchor" href="#更新文档" aria-label="Permalink to &quot;更新文档&quot;">​</a></h2><ul><li>db.collection.updateOne(queryObj, updateObj)</li><li>db.collection.updateMany(queryObj, updateObj)</li><li>db.collection.replaceOne(queryObj, updateObj)</li><li>queryObj：查询条件对象：指定要匹配的文档条件</li><li>updateObj：更新操作对象：指定要应用于匹配文档的更新操作</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">db.users.updateOne({name: &#39;well&#39;}, {$set: {&quot;info.sex&quot;: &#39;femal&#39;}})</span></span></code></pre></div><h2 id="删除文档" tabindex="-1">删除文档 <a class="header-anchor" href="#删除文档" aria-label="Permalink to &quot;删除文档&quot;">​</a></h2><ul><li>db.inventory.deleteMany(queryObj)</li><li>db.inventory.deleteOne(queryObj)</li></ul><h2 id="node-操作mongodb" tabindex="-1"><a href="https://www.mongodb.com/docs/drivers/node/current/quick-start/connect-to-mongodb/" target="_blank" rel="noreferrer">node 操作MongoDB</a> <a class="header-anchor" href="#node-操作mongodb" aria-label="Permalink to &quot;[node 操作MongoDB](https://www.mongodb.com/docs/drivers/node/current/quick-start/connect-to-mongodb/)&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm install mongodb</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">/* eslint-disable @typescript-eslint/no-var-requires */</span></span>
<span class="line"><span style="color:#A6ACCD;">const { MongoClient } = require(&#39;mongodb&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const client = new MongoClient(&#39;mongodb://127.0.0.1:27017&#39;, {</span></span>
<span class="line"><span style="color:#A6ACCD;">    useUnifiedTopology: true</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async function run() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    try {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 开始连接</span></span>
<span class="line"><span style="color:#A6ACCD;">        await client.connect()</span></span>
<span class="line"><span style="color:#A6ACCD;">        const personDB = client.db(&#39;myDB&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        const usersCollection = personDB.collection(&#39;users&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        const userDocument = {</span></span>
<span class="line"><span style="color:#A6ACCD;">            name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">            age: 18,</span></span>
<span class="line"><span style="color:#A6ACCD;">            info: {</span></span>
<span class="line"><span style="color:#A6ACCD;">                job: &#39;player&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">                sport: [&#39;soccer&#39;, &#39;pingpong&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        await usersCollection.insertOne(userDocument)</span></span>
<span class="line"><span style="color:#A6ACCD;">        const ret = await usersCollection.find()</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(await ret.toArray())</span></span>
<span class="line"><span style="color:#A6ACCD;">    } catch (err) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 连接失败</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;连接失败&#39;, err)</span></span>
<span class="line"><span style="color:#A6ACCD;">    } finally {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 关闭连接</span></span>
<span class="line"><span style="color:#A6ACCD;">        await client.close()</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">run()</span></span></code></pre></div><h2 id="mongoose" tabindex="-1"><a href="http://www.mongoosejs.net/" target="_blank" rel="noreferrer">mongoose</a> <a class="header-anchor" href="#mongoose" aria-label="Permalink to &quot;[mongoose](http://www.mongoosejs.net/)&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm i mongoose --save</span></span></code></pre></div><ul><li>Schema <ul><li>用于定义数据库中文档结构的规范</li><li>定义了文档所包含的字段、字段类型、验证规则等信息</li></ul></li><li>Model <ul><li>通过 Schema 编译生成的构造函数，用于创建具有相同属性和行为的文档实例</li><li>Model允许你操作数据库，如保存、查询、更新和删除文档等</li></ul></li><li>Document <ul><li>Document是Model的实例，表示数据库中的一个文档</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const mongoose = require(&#39;mongoose&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">mongoose.connect(&#39;mongodb://127.0.0.1:27017/myDB&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 使用mongoose连接数据库</span></span>
<span class="line"><span style="color:#A6ACCD;">const db = mongoose.connection</span></span>
<span class="line"><span style="color:#A6ACCD;">// 当连接失败的时候</span></span>
<span class="line"><span style="color:#A6ACCD;">db.on(&#39;error&#39;, err =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;MongoDB 数据库连接失败&#39;, err)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">// 当连接成功的时候</span></span>
<span class="line"><span style="color:#A6ACCD;">db.once(&#39;open&#39;, function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;MongoDB 数据库连接成功&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    start()</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 定义 Schema</span></span>
<span class="line"><span style="color:#A6ACCD;">const userSchema = new mongoose.Schema({</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: String,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: Number,</span></span>
<span class="line"><span style="color:#A6ACCD;">    info: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        job: String,</span></span>
<span class="line"><span style="color:#A6ACCD;">        sport: Array</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 创建数据模型</span></span>
<span class="line"><span style="color:#A6ACCD;">const users = mongoose.model(&#39;users&#39;, userSchema)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const start = async () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    try {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // const user = new users({</span></span>
<span class="line"><span style="color:#A6ACCD;">        //     name: &#39;mike&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        //     age: 18,</span></span>
<span class="line"><span style="color:#A6ACCD;">        //     info: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        //         job: &#39;player&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        //         sport: [&#39;basketball&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">        //     }</span></span>
<span class="line"><span style="color:#A6ACCD;">        // })</span></span>
<span class="line"><span style="color:#A6ACCD;">        // await user.save()</span></span>
<span class="line"><span style="color:#A6ACCD;">        const result = await users.find()</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(result)</span></span>
<span class="line"><span style="color:#A6ACCD;">    } catch (error) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.error(error.message)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div>`,19),t=[p];function c(i,r,d,C,A,y){return n(),a("div",null,t)}const g=s(o,[["render",c]]);export{D as __pageData,g as default};
