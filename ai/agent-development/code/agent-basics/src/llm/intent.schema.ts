// 运行时校验：JSON 合法 ≠ Schema 正确，必须显式 parse 才进业务系统。
import { z } from 'zod'
import type { IntentResult } from './intent.types'

const WeatherIntentSchema = z.object({
    intent: z.literal('weather'),
    city: z.string().min(1),
    date: z.string().min(1)
})

const CalculatorIntentSchema = z.object({
    intent: z.literal('calculator'),
    expression: z.string().min(1)
})

const ChatIntentSchema = z.object({
    intent: z.literal('chat'),
    message: z.string().min(1)
})

export const IntentResultSchema = z.discriminatedUnion('intent', [
    WeatherIntentSchema,
    CalculatorIntentSchema,
    ChatIntentSchema
])

export function validateIntent(raw: unknown): IntentResult {
    return IntentResultSchema.parse(raw) as IntentResult
}
