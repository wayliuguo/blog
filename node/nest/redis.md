## 快速入门

### 运行和字符串操作

```
// 运行
docker run --name redis-test -p 6379:6379 -v E:\redis-volumn:/data -e KEY1=VALUE1 -d redis:latest

// 进入容器操作
C:\Users\10855>docker exec -it redis-test /bin/bash
root@9ae9fe66c1b7:/data# redis-cli
127.0.0.1:6379> set key1 value1

// 查看 keys
127.0.0.1:6379> keys key1
1) "key1"
127.0.0.1:6379> keys *
1) "key1"
127.0.0.1:63
```

### 数据结构与操作

| **数据结构** | **命令示例**                             | **应用场景**           |
| ------------ | ---------------------------------------- | ---------------------- |
| **字符串**   | `SET user:1 "Tom"` `INCR counter`        | 计数器、会话存储       |
| **哈希**     | `HSET user:1001 name "Alice" age 25`     | 存储对象（如用户信息） |
| **列表**     | `LPUSH tasks "task1"` `RPOP tasks`       | 消息队列、最近访问记录 |
| **集合**     | `SADD tags "redis"` `SINTER tags1 tags2` | 去重（标签系统）       |
| **有序集合** | `ZADD leaderboard 100 "Player1"`         | 排行榜、优先级队列     |

### 列表操作

```
// lpush（从左往右push），相反的有 rpush
127.0.0.1:6379> lpush list1 111
(integer) 1
127.0.0.1:6379> lpush list1 222, 333
(integer) 3

// 查看 lrange list start stop
127.0.0.1:6379> lrange list1 0 -1
1) "333"
2) "222,"
3) "111"

// lpop (从左往右pop) 相反的有 rpop
127.0.0.1:6379> lpop list1
"333"
127.0.0.1:6379> lrange list1 0 -1
1) "222,"
2) "111"
```

### 集合

- set 只能去重、判断包含，不能对元素排序。
- sadd 集合名 元素：往集合添加元素
- sismember 集合名 元素：判断元素在集合内

```
127.0.0.1:6379> sadd set1 111
(integer) 1
127.0.0.1:6379> sadd set1 111
(integer) 0
127.0.0.1:6379> sadd set1 222
(integer) 1

// 判断包含
127.0.0.1:6379> sismember set1 111
(integer) 1
```

### 有序集合

- zadd 集合名 排序 元素：往集合添加元素且排序
- zrange 集合名 start sop：查看有序集合

```
127.0.0.1:6379> zadd zset1 5 five
(integer) 1
127.0.0.1:6379> zadd zset1 4 four
(integer) 1
127.0.0.1:6379> zadd zset1 3 three
(integer) 1
127.0.0.1:6379> zadd zset1 6 six
(integer) 1
127.0.0.1:6379> zrange zset1 0 -1
1) "three"
2) "four"
3) "five"
4) "six"
```

### 哈希

- hset 哈希表名 key value
- hget 哈希表名 key

```
127.0.0.1:6379> hset hash1 key1 1
(integer) 1
127.0.0.1:6379> hset hash1 key2 2
(integer) 1
127.0.0.1:6379> hset hash1 key3 3
(integer) 1
127.0.0.1:6379> hset hash1 key4 4
(integer) 1
127.0.0.1:6379> hset hash1 key5 5
(integer) 1
127.0.0.1:6379> hget hash1 key3
"3"
```

## 在nest里操作 redis

