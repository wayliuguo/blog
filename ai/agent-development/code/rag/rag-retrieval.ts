import { cosineSimilarity } from '../embedding/cosine-similarity'

interface Chunk {
    id: string
    content: string
    vector: number[]
}

// 用"伪 embedding"演示 RAG 检索本质：把文本按字符频次折算成低维向量做余弦 TopK。
// 真实场景里 vector 来自 Embedding 模型；这里只为不依赖外部服务即可跑通检索链路。
function pseudoEmbedding(text: string, dim = 16): number[] {
    const vec = new Array(dim).fill(0)
    for (let i = 0; i < text.length; i++) {
        vec[text.charCodeAt(i) % dim] += 1
    }
    return vec
}

export function retrieve(chunks: Chunk[], query: string, topK = 2): Chunk[] {
    const qv = pseudoEmbedding(query)
    return chunks
        .map(c => ({ chunk: c, score: cosineSimilarity(qv, c.vector) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map(x => x.chunk)
}

// 运行：npx tsx rag-retrieval.ts
if (process.argv[1] && process.argv[1].endsWith('rag-retrieval.ts')) {
    const chunks: Chunk[] = [
        { id: '1', content: 'Refresh Token 有效期 30 天', vector: pseudoEmbedding('Refresh Token 有效期 30 天') },
        { id: '2', content: '年假 10 天', vector: pseudoEmbedding('年假 10 天') }
    ]
    console.log(retrieve(chunks, '登录凭证多久失效').map(c => c.content))
}
