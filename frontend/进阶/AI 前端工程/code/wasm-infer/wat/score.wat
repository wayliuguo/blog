;; score.wat — 端侧打分模型内核：y = w·x + b（4 维特征线性模型）
;; 内存布局（f32 各 4 字节）：
;;   offset  0..15  权重 w[0..3]（JS 装载）
;;   offset 16..19  偏置 b（JS 装载）
;;   offset 32..47  特征 x[0..3]（每次推理前 JS 写入）
;;   offset 64..67  结果 y（wasm 写回，JS 读取）
(module
  (memory (export "mem") 1)
  (func (export "score") (result f32)
    (local $i i32)
    (local $acc f32)
    (local.set $i (i32.const 0))
    (local.set $acc (f32.const 0))
    (block
      (loop
        ;; i >= 4 跳出
        (br_if 1 (i32.ge_s (local.get $i) (i32.const 4)))
        ;; acc += w[i] * x[i]
        (local.set $acc
          (f32.add (local.get $acc)
            (f32.mul
              (f32.load (i32.mul (local.get $i) (i32.const 4)))
              (f32.load (i32.add (i32.const 32) (i32.mul (local.get $i) (i32.const 4)))))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br 0)))
    ;; acc + b → 写回 offset 64（演示共享内存往返）→ 返回
    (local.set $acc (f32.add (local.get $acc) (f32.load (i32.const 16))))
    (f32.store (i32.const 64) (local.get $acc))
    (local.get $acc)))
