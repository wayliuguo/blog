import { Controller, Get, Inject } from '@nestjs/common'
import { CacheService } from './cache/cache.service'
import { GreetingService } from './greeting/greeting.service'

@Controller()
export class AppController {
    constructor(
        @Inject('GREETING') private readonly greetingService: GreetingService,
        @Inject('DB_CONNECTION') private readonly db: { host: string },
        private readonly cacheService: CacheService
    ) {}

    @Get()
    getHello(): string {
        return this.greetingService.hello('NestJS')
    }

    @Get('health')
    health(): object {
        return {
            status: 'ok',
            dbHost: this.db.host,
            cache: this.cacheService.describe()
        }
    }
}
