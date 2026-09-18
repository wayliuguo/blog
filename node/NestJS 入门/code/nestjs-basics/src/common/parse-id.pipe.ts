import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common'

@Injectable()
export class ParseIdPipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata) {
        // 只处理 :id 这个路径参数，其余参数原样放行 —— 这样它也能安全地全局注册
        if (metadata.type !== 'param' || metadata.data !== 'id') return value

        const id = parseInt(value, 10)
        if (isNaN(id) || id <= 0) {
            throw new BadRequestException('ID 必须是正整数')
        }
        return id
    }
}
