import { Injectable } from '@nestjs/common'

@Injectable()
export class ToolsService {
    // 模拟数据：重点在理解 Tool Calling 机制，不在接真实天气 API。
    // 以后换成真实天气 API，对 Agent 侧完全透明。
    getWeather(city: string) {
        return { city, temperature: 32, weather: '晴' }
    }

    // 真实求值：new Function 等价于执行用户输入的任意 JS——存在代码执行风险，
    // 只允许本地 Demo 这样写，生产必须换安全的表达式解析方案。
    calculator(expression: string) {
        const result = new Function(`"use strict"; return (${expression})`)() as number
        return { expression, result }
    }
}
