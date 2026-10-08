// 三种意图的 TypeScript 类型：模式由源文约定，类型只做编译期描述。
export type WeatherIntent = {
    intent: 'weather'
    city: string
    date: string
}

export type CalculatorIntent = {
    intent: 'calculator'
    expression: string
}

export type ChatIntent = {
    intent: 'chat'
    message: string
}

export type IntentResult = WeatherIntent | CalculatorIntent | ChatIntent
