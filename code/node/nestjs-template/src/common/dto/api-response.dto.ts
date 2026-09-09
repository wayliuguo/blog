/**
 * 统一响应模型
 *
 * 所有 API 接口的标准响应格式：
 * - code: 业务状态码，0 表示成功，异常时为 HTTP 状态码
 * - data: 响应数据，泛型支持任意类型，无数据时为 null
 * - message: 响应消息，默认 'success'
 *
 * 与 TransformInterceptor 和 AllExceptionsFilter 配合，
 * 确保成功响应和异常响应都使用相同的数据结构。
 */
import { ApiProperty } from '@nestjs/swagger'

/** 成功响应业务码 */
export const RESPONSE_SUCCESS_CODE = 0
/** 成功响应默认消息 */
export const RESPONSE_SUCCESS_MSG = 'success'

/** 统一响应结构 { code, data, message } */
export class ResOp<T = any> {
    @ApiProperty({ type: 'object', additionalProperties: true })
    data?: T | null

    @ApiProperty({ type: 'number', default: RESPONSE_SUCCESS_CODE })
    code: number

    @ApiProperty({ type: 'string', default: RESPONSE_SUCCESS_MSG })
    message: string

    constructor(code: number, data: T | null, message: string = RESPONSE_SUCCESS_MSG) {
        this.code = code
        this.data = data
        this.message = message
    }
}
