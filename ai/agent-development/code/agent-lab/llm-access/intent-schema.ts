import { z } from 'zod'

export const WeatherIntent = z.object({
  intent: z.literal('weather'),
  city: z.string(),
  date: z.string()
})
export const CalculatorIntent = z.object({
  intent: z.literal('calculator'),
  expression: z.string()
})
export const ChatIntent = z.object({
  intent: z.literal('chat'),
  message: z.string()
})
export const IntentResult = z.discriminatedUnion('intent', [
  WeatherIntent,
  CalculatorIntent,
  ChatIntent
])

// 运行时校验：JSON 合法 ≠ Schema 正确，必须显式 parse 才进业务系统。
export function parseIntent(raw: unknown): z.infer<typeof IntentResult> {
  return IntentResult.parse(raw)
}

// 运行需先安装 zod：npm install zod，然后 npx tsx intent-schema.ts
