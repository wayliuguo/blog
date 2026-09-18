/**
 * 响应转换拦截器
 *
 * 将控制器返回的原始数据统一包装为 ResOp 格式。
 *
 * 转换规则：
 * - 正常数据：包装为 { code: 0, data: <原始数据>, message: 'success' }
 * - null/undefined 数据：data 字段设为 null
 *
 * 与 AllExceptionsFilter 配合，确保所有响应（成功和失败）都使用统一的
 * { code, message, data } 格式。
 */
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

import { ResOp, RESPONSE_SUCCESS_CODE } from '~/common/dto/api-response.dto'

@Injectable()
export class TransformInterceptor<T = any> implements NestInterceptor<T, ResOp> {
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ResOp> {
        return next.handle().pipe(
            // 统一包装为 { code: 0, data, message: 'success' } 格式
            // data 为 null/undefined 时兜底为 null
            map(data => new ResOp(RESPONSE_SUCCESS_CODE, data ?? null))
        )
    }
}
