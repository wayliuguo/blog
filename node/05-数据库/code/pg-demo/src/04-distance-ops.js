// 04-distance-ops.js：三个距离算子的实际取值（SQL 在 sql/03-distance-ops.sql）
// 运行： npm run distances
const { pool, runSqlFile, fail } = require('./lib')

;(async () => {
    console.log('=== 执行 sql/03-distance-ops.sql ===')
    const res = await runSqlFile('sql/03-distance-ops.sql')
    console.table(res.rows)

    console.log('=== 怎么读这三个数 ===')
    console.log('  [1,2,3] 与 [2,4,6] 方向完全一致、长度差 2 倍，所以：')
    console.log('  l2_distance ≈ 3.74：√(1²+2²+3²)，纯看位置差异，不为 0')
    console.log('  inner_product = 28：1×2 + 2×4 + 3×6')
    console.log('  cosine_distance ≈ 0：方向一致 → 余弦相似度 = 1（长度不影响结果）')
    console.log('')
    console.log('  所以"语义相似"用 <=>（只看方向、不看长度）；<#> 要自己注意返回的是负内积；')
    console.log('  <-> 适合对"绝对位置"敏感的场景（如图片特征）。')
    console.log('')
    console.log('  三个算子各自对应一种 ops 才能吃到索引：')
    console.log('    <-> → vector_l2_ops、<#> → vector_ip_ops、<=> → vector_cosine_ops')
    console.log('  索引的 ops 和查询的算子必须匹配，否则索引白建')
})()
    .catch(fail)
    .finally(() => pool.end())
