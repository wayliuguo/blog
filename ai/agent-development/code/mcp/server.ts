/**
 * 天气 MCP Server（stdio 传输）
 * 文章正文「从零实现一个天气查询服务」的配套代码。
 * 运行前需安装 SDK：npm install（已加入 @modelcontextprotocol/server / client）。
 *   npm run mcp-server   # 启动服务（stdio，需配合 Inspector 或 Client 调用）
 * 真实天气查询需要可访问 Open-Meteo 的网络；工具发现 / 参数校验无需网络。
 */
import { McpServer } from '@modelcontextprotocol/server'
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { z } from 'zod'

const cities = {
    北京: { latitude: 39.9042, longitude: 116.4074 },
    上海: { latitude: 31.2304, longitude: 121.4737 },
    西安: { latitude: 34.3416, longitude: 108.9398 }
}

const weatherNames: Record<number, string> = {
    0: '晴',
    1: '大部晴朗',
    2: '局部多云',
    3: '阴',
    45: '雾',
    48: '雾凇',
    51: '小毛毛雨',
    53: '中等毛毛雨',
    55: '强毛毛雨',
    56: '轻微冻毛毛雨',
    57: '强冻毛毛雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    66: '轻微冻雨',
    67: '强冻雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    77: '米雪',
    80: '小阵雨',
    81: '中等阵雨',
    82: '强阵雨',
    85: '小阵雪',
    86: '强阵雪',
    95: '雷暴',
    96: '雷暴伴小冰雹',
    97: '强雷暴',
    99: '雷暴伴大冰雹'
}

async function getWeather(city: keyof typeof cities) {
    const location = cities[city]
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.search = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
        temperature_unit: 'celsius',
        wind_speed_unit: 'ms',
        timezone: 'Asia/Shanghai'
    }).toString()

    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!response.ok) throw new Error(`天气接口返回 HTTP ${response.status}`)

    const data = z
        .object({
            current: z.object({
                time: z.string(),
                temperature_2m: z.number(),
                relative_humidity_2m: z.number(),
                weather_code: z.number(),
                wind_speed_10m: z.number()
            })
        })
        .parse(await response.json())

    const current = data.current
    return {
        city,
        time: current.time,
        timezone: 'Asia/Shanghai',
        weather: weatherNames[current.weather_code] ?? `未知天气代码 ${current.weather_code}`,
        temperature: `${current.temperature_2m} °C`,
        humidity: `${current.relative_humidity_2m}%`,
        windSpeed: `${current.wind_speed_10m} m/s`,
        source: 'Open-Meteo'
    }
}

const server = new McpServer({ name: 'weather-server', version: '1.0.0' })
server.registerTool(
    'get_weather',
    {
        description: '查询北京、上海或西安的当前天气、温度、湿度和风速。数据来自 Open-Meteo 天气模型。',
        inputSchema: z.object({ city: z.enum(['北京', '上海', '西安']).describe('要查询的城市') })
    },
    async ({ city }) => {
        try {
            const weather = await getWeather(city)
            return { content: [{ type: 'text', text: JSON.stringify(weather, null, 2) }] }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            console.error('天气查询失败：', message)
            return { isError: true, content: [{ type: 'text', text: `天气查询失败：${message}` }] }
        }
    }
)

async function main() {
    await server.connect(new StdioServerTransport())
    console.error('Weather MCP Server 已启动')
}

main().catch(error => {
    console.error(error)
    process.exit(1)
})
