import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { showToast } from 'vant'
import { ENV } from '@/env'

/** 业务错误：code 为后端返回码，网络错误统一 -1 / 408 */
export class ApiError extends Error {
    code: number

    constructor(message: string, code: number) {
        super(message)
        this.name = 'ApiError'
        this.code = code
    }
}

/** 后端约定的登录态失效返回码 */
const AUTH_FAILURE_CODES = [401, 1101, 1106]

const http = axios.create({
    baseURL: ENV.apiBase,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' }
})

// token 来自 .env.local，编译进产物；请求统一带上 Bearer
http.interceptors.request.use(config => {
    if (ENV.apiToken) config.headers.set('Authorization', `Bearer ${ENV.apiToken}`)
    return config
})

/** 后端的统一响应包：{ code, message, data } */
interface Envelope<T> {
    code: number
    message?: string
    data: T
}

/**
 * 所有接口的唯一出口：负责解包 { code, data }、把异常转成 ApiError、
 * 以及把错误提示收敛到一处（页面只需处理成功分支）。
 */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
        const res = await http.request<Envelope<T>>(config)
        const body = res.data
        if (body && body.code === 0) return body.data
        throw new ApiError(body?.message || '请求失败', body?.code ?? -1)
    } catch (error) {
        throw normalizeError(error)
    }
}

/** 统一提示：登录态失效单独给一句可操作的文案 */
function notify(error: ApiError) {
    if (AUTH_FAILURE_CODES.includes(error.code)) {
        showToast({ message: '登录态失效：请在 .env.local 配置 VITE_API_TOKEN', duration: 3000 })
    } else {
        showToast(error.message)
    }
}

function normalizeError(error: unknown): ApiError {
    if (error instanceof ApiError) {
        notify(error)
        return error
    }

    if (axios.isAxiosError(error)) {
        // 非 2xx 时后端仍可能返回 { code, message }，优先按业务错误处理
        const body = error.response?.data as Envelope<unknown> | undefined
        if (body && typeof body.code === 'number') {
            const apiError = new ApiError(body.message || '请求失败', body.code)
            notify(apiError)
            return apiError
        }

        const status = error.response?.status
        if (status === 401) {
            const apiError = new ApiError('登录态失效', 401)
            notify(apiError)
            return apiError
        }

        const timeout = error.code === 'ECONNABORTED'
        const message = timeout ? '请求超时，请重试' : '网络异常，请稍后重试'
        const apiError = new ApiError(message, timeout ? 408 : -1)
        notify(apiError)
        return apiError
    }

    const apiError = new ApiError('未知错误', -1)
    notify(apiError)
    return apiError
}
