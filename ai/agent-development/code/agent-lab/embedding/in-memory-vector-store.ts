import { cosineSimilarity } from './cosine-similarity'

export interface VectorItem {
  id: string
  vector: number[]
  payload: Record<string, unknown>
}

// 内存版向量库：写入向量，按余弦相似度取 Top K。
export class InMemoryVectorStore {
  private items: VectorItem[] = []

  upsert(item: VectorItem): void {
    const idx = this.items.findIndex(i => i.id === item.id)
    if (idx >= 0) this.items[idx] = item
    else this.items.push(item)
  }

  search(query: number[], topK = 3): Array<VectorItem & { similarity: number }> {
    return this.items
      .map(item => ({ ...item, similarity: cosineSimilarity(query, item.vector) }))
      .sort((x, y) => y.similarity - x.similarity)
      .slice(0, topK)
  }
}

// 运行：npx tsx in-memory-vector-store.ts
if (process.argv[1] && process.argv[1].endsWith('in-memory-vector-store.ts')) {
  const store = new InMemoryVectorStore()
  store.upsert({ id: 'a', vector: [1, 0, 0], payload: {} })
  console.log(store.search([1, 0, 0], 1))
}
