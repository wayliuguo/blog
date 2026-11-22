/**
 * Prisma 侧的向量读写：ORM 方法表达不了 <=>，所以写入与检索都必须走 raw query。
 * 建表时先 CREATE EXTENSION vector;（HNSW 索引要手写 CREATE INDEX，Prisma 不支持声明式定义）
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 写入向量：用 Prisma 的 $executeRaw，向量要拼成 '[1,2,...]' 字符串
async function saveChunk(content: string, vector: number[]) {
    await prisma.$executeRaw`
    INSERT INTO "document_chunks" (content, embedding)
    VALUES (${content}, ${'[' + vector.join(',') + ']'}::vector)
  `
}

// 相似度查询：raw query 取 TopK
async function search(queryVector: number[], topK = 5) {
    const vec = '[' + queryVector.join(',') + ']'
    return prisma.$queryRawUnsafe(
        `SELECT id, content,
            1 - (embedding <=> $1::vector) AS similarity
     FROM document_chunks
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
        vec,
        topK
    )
}

// 演示入口：需要真的能连上 DATABASE_URL 才跑得动
async function main() {
    const vector = Array.from({ length: 1536 }, (_, i) => Math.sin(i / 37))
    await saveChunk('向量检索的相似度计算必须走 raw query', vector)
    const rows = await search(vector, 5)
    console.log('TopK =', rows)
    await prisma.$disconnect()
}

export { saveChunk, search, main }
