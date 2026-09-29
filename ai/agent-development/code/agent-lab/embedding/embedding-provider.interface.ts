// 抽象 Embedding 模型，解耦具体厂商（OpenAI / 阿里云 / 本地模型）。
export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
  readonly dimensions: number
}
