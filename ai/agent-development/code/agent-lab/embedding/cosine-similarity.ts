// 计算两个向量的余弦相似度：越接近 1 越相似，越接近 0 越不相关。
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('向量维度必须一致')
  }
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

// 运行：npx tsx cosine-similarity.ts
if (process.argv[1] && process.argv[1].endsWith('cosine-similarity.ts')) {
  console.log(cosineSimilarity([1, 0, 0], [1, 0, 0])) // 1
}
