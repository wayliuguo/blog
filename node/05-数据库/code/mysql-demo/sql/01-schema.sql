-- ============================================================
-- 01-schema.sql  建库 + 建表
-- 运行： mysql -u root -p < sql/01-schema.sql
-- 设计意图：索引不是越多越好，每条索引都要回答“为什么建”
-- ============================================================

-- 建库：统一用 utf8mb4，避免中文/emoji 乱码（utf8 只是 3 字节，存不了 emoji）
CREATE DATABASE IF NOT EXISTS mysql_demo DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mysql_demo;

-- 用户表：登录、余额、账户状态
CREATE TABLE users (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email       VARCHAR(191)    NOT NULL,                 -- 登录账号
  username    VARCHAR(64)     NOT NULL,
  status      TINYINT         NOT NULL DEFAULT 1,        -- 1=正常 2=冻结 3=注销（低区分度，故意不建单列索引）
  balance     DECIMAL(10,2)   NOT NULL DEFAULT 0.00,    -- 账户余额
  version     INT             NOT NULL DEFAULT 1,        -- 乐观锁版本号
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- 为什么建唯一索引：email 是登录查询的高频等值条件，且必须全局唯一
  UNIQUE KEY uq_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 商品表：库存是防超卖的关键字段
CREATE TABLE products (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(128)    NOT NULL,
  price       DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  stock       INT             NOT NULL DEFAULT 0,        -- 库存
  version     INT             NOT NULL DEFAULT 1,        -- 乐观锁版本号
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
  -- 为什么“不”给 stock 建单列索引：stock 区分度低（大量商品库存接近），
  -- 且更新极频繁，单列索引几乎用不上还会拖慢写入。这是“低区分度字段不建索引”的反面教材。
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';

-- 订单表：核心业务表
CREATE TABLE orders (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,                 -- 下单用户
  amount      DECIMAL(10,2)   NOT NULL DEFAULT 0.00,    -- 订单金额
  status      TINYINT         NOT NULL DEFAULT 1,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- 为什么建联合索引 (user_id, created_at)：
  -- “某用户的历史订单”几乎总是“按 user_id 等值 + 按 created_at 排序/范围”，
  -- 联合索引能一次性命中等值并避免额外排序，还能覆盖只查这两列的查询。
  KEY idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- 订单明细表：一笔订单包含多个商品
CREATE TABLE order_items (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id    BIGINT UNSIGNED NOT NULL,
  product_id  BIGINT UNSIGNED NOT NULL,
  quantity    INT             NOT NULL DEFAULT 1,
  price       DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order (order_id),      -- 按订单查明细
  KEY idx_product (product_id)   -- 按商品查被买记录
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';

-- 余额流水表：事务演示里记录每一笔扣款/充值，便于核对账目
CREATE TABLE balance_log (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  change_amount DECIMAL(10,2)   NOT NULL,                -- 正=充值 负=消费
  type          VARCHAR(16)     NOT NULL,               -- pay=消费 recharge=充值
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='余额流水表';
