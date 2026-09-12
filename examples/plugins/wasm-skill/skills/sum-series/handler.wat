(module
  ;; 无导入纯计算：run() 返回 1+2+…+9 = 45
  (func (export "run") (result i32)
    (local $i i32)
    (local $sum i32)
    (local.set $i (i32.const 1))
    (block $done
      (loop $loop
        (br_if $done (i32.gt_s (local.get $i) (i32.const 9)))
        (local.set $sum (i32.add (local.get $sum) (local.get $i)))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $loop)
      )
    )
    (local.get $sum)
  )
)
