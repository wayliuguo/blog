import { Global, Module } from '@nestjs/common'
import { ConfigService } from './config.service'

@Global()
@Module({
    providers: [
        ConfigService,
        // useValue：注入常量或配置对象，取值要配 @Inject('CONFIG')
        { provide: 'CONFIG', useValue: { port: 3000 } }
    ],
    exports: [ConfigService, 'CONFIG']
})
export class ConfigModule {}
