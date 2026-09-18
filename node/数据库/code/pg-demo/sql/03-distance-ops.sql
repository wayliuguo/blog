-- 03-distance-ops.sql：同一个向量对上，三个距离算子各返回什么
-- <-> 欧氏距离（vector_l2_ops）、<#> 负内积（vector_ip_ops）、<=> 余弦距离（vector_cosine_ops）
-- 注意：<#> 返回的是「负内积」，值越小代表内积越大（越相似），所以排序统一用 ASC

SELECT
    '[1,2,3]'::vector <-> '[2,4,6]'::vector          AS l2_distance,
    -('[1,2,3]'::vector <#> '[2,4,6]'::vector)       AS inner_product,
    '[1,2,3]'::vector <=> '[2,4,6]'::vector          AS cosine_distance;
