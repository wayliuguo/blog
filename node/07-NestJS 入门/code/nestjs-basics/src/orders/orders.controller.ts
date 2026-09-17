import {
    BadRequestException,
    Body,
    ConflictException,
    Controller,
    DefaultValuePipe,
    ForbiddenException,
    Get,
    InternalServerErrorException,
    NotFoundException,
    Param,
    ParseIntPipe,
    Post,
    Query,
    UnauthorizedException
} from '@nestjs/common'
import { OrdersService } from './orders.service'

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    @Get()
    findAll(@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number) {
        return { page, orders: this.ordersService.findAll() }
    }

    @Get('stats')
    stats() {
        return this.ordersService.stats()
    }

    @Get('errors/:type')
    throwOne(@Param('type') type: string): never {
        switch (type) {
            case 'bad-request':
                throw new BadRequestException('参数错误') // 400
            case 'unauthorized':
                throw new UnauthorizedException('未登录') // 401
            case 'forbidden':
                throw new ForbiddenException('无权限') // 403
            case 'not-found':
                throw new NotFoundException('资源不存在') // 404
            case 'conflict':
                throw new ConflictException('资源冲突') // 409
            default:
                throw new InternalServerErrorException('服务器错误') // 500
        }
    }

    @Post()
    create(@Body() body: { userId: number; total: number }) {
        return this.ordersService.create(body.userId, body.total)
    }
}
