

## 前置准备

### 安装

```
# 项目中安装 mysql2
npm install mysql2
# 或 yarn/pnpm
yarn add mysql2
pnpm add mysql2
```

### 资料

[mysql2](https://github.com/sidorares/node-mysql2?tab=readme-ov-file)

## 建立数据库连接

### 普通连接

```
const mysql = require("mysql2");

// 普通连接
const connection = mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "123456",
  database: "practice",
});

connection.connect((err) => {
  if (err) {
    console.error("连接失败：", err);
    return;
  }
  console.log("数据库连接成功！");
});

connection.end((err) => {
  if (err) console.error('关闭连接失败：', err);
});
```

### 连接池（推荐，生产环境必用）

连接池会创建多个连接并复用，避免频繁创建 / 销毁连接的性能损耗

```
const mysql = require("mysql2");

// 创建连接池
const pool = mysql.createPool({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "123456",
  database: "practice",
});

pool.query("SELECT * FROM customers", function (err, results, fields) {
  console.log(results);
  console.log(fields.map((item) => item.name));
});

// 连接池无需手动关闭，程序退出时自动释放

```

### 支持Promise/async-await

```
const mysql = require("mysql2/promise"); // 直接引入 promise 版本

async function main() {
  try {
    // 创建连接池
    const pool = mysql.createPool({
      host: "localhost",
      port: 3306,
      user: "root",
      password: "123456",
      database: "practice",
    });

    const [rows, fields] = await pool.query(
      "SELECT * FROM customers WHERE name LIKE ?",
      ["李%"]
    );
    console.log(rows);
    console.log(fields.map((item) => item.name));
  } catch (error) {
    console.error("查询失败：", error);
  }
}

main();
```

## 核心功能

### CRUD 操作

基于 Promise 版本实现完整的 CRUD，重点使用**预处理语句**（`?` 占位符）防止 `SQL` 注入

```
const mysql = require('mysql2/promise');

// 创建连接池
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'test_db',
  connectionLimit: 10
});

// 1. 新增（CREATE）
async function addDepartment(name) {
  const [result] = await pool.query(
    'INSERT INTO department (name) VALUES (?)',
    [name] // 参数数组，对应 ? 占位符
  );
  console.log('新增成功，ID：', result.insertId);
  return result;
}

// 2. 查询（READ）
async function getDepartmentById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM department WHERE id = ?',
    [id]
  );
  return rows[0]; // 返回单条数据
}

// 3. 更新（UPDATE）
async function updateDepartment(id, newName) {
  const [result] = await pool.query(
    'UPDATE department SET name = ? WHERE id = ?',
    [newName, id] // 多个占位符按顺序传参
  );
  console.log('更新行数：', result.affectedRows);
  return result;
}

// 4. 删除（DELETE）
async function deleteDepartment(id) {
  const [result] = await pool.query(
    'DELETE FROM department WHERE id = ?',
    [id]
  );
  console.log('删除行数：', result.affectedRows);
  return result;
}

// 执行测试
async function testCRUD() {
  await addDepartment('测试部门'); // 新增
  const dept = await getDepartmentById(1); // 查询
  console.log('查询到的部门：', dept);
  await updateDepartment(1, '测试部门_修改'); // 更新
  await deleteDepartment(1); // 删除
}

testCRUD().catch(err => console.error('CRUD 失败：', err));
```

### 事务处理

`mysql2` 支持事务，核心步骤：`beginTransaction()` → 执行 SQL → `commit()`/`rollback()`

```
async function transferMoney(fromId, toId, amount) {
  // 获取一个连接（事务需绑定单个连接）
  const connection = await pool.getConnection();
  try {
    // 1. 开启事务
    await connection.beginTransaction();

    // 2. 执行多步 SQL
    // 扣减转出人金额
    await connection.query(
      'UPDATE account SET money = money - ? WHERE id = ?',
      [amount, fromId]
    );
    // 增加转入人金额
    await connection.query(
      'UPDATE account SET money = money + ? WHERE id = ?',
      [amount, toId]
    );

    // 3. 提交事务
    await connection.commit();
    console.log('转账成功！');
  } catch (err) {
    // 4. 出错回滚
    await connection.rollback();
    console.error('转账失败，已回滚：', err);
    throw err;
  } finally {
    // 5. 释放连接（必须！）
    connection.release();
  }
}

// 测试转账
transferMoney(1, 2, 100).catch(err => console.error(err));
```

### 批量操作

```
async function batchInsertEmployees(employees) {
  // 预处理语句模板
  const sql = 'INSERT INTO employee (name, salary, department_id) VALUES (?, ?, ?)';
  // 批量执行
  const [result] = await pool.query(sql, employees);
  console.log('批量插入成功，行数：', result.affectedRows);
}

// 测试批量插入
const employees = [
  ['张三', 20000, 1],
  ['李四', 15000, 1],
  ['王五', 10000, 2]
];
batchInsertEmployees(employees).catch(err => console.error(err));
```

