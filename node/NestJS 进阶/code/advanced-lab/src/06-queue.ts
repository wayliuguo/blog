/**
 * 06 - 消息队列（@nestjs/bull）：注册 / 生产者 / 消费者
 *
 * 这一份只做「结构与类型」演示，**不连 Redis**：Bull 的任务队列全都在 Redis 里，
 * 没有 Redis 跑起来只会看到一堆重连告警，看不到任何有价值的东西。
 *
 * 校验编译：npm run typecheck
 * 想看真实收发：本地起一个 Redis（redis-server，或 docker run -p 6379:6379 redis），
 * 再照着 nestjs-template 的 Redis 配置接上即可。
 */
import { Injectable, Module } from '@nestjs/common'
import { BullModule, InjectQueue, Process, Processor } from '@nestjs/bull'
import { Job, Queue } from 'bull'

// ====== 2) 生产者：发送任务 ======
@Injectable()
export class EmailQueue {
    constructor(@InjectQueue('email') private emailQueue: Queue) {}

    // 发送验证邮件
    async sendVerification(to: string, code: string) {
        await this.emailQueue.add(
            'verification',
            {
                to,
                code
            },
            {
                attempts: 3, // 最多重试 3 次
                backoff: 5000, // 重试间隔 5 秒
                removeOnComplete: true
            }
        )
    }

    // 延迟发送（预约邮件）
    async scheduleEmail(to: string, content: string, delayMs: number) {
        await this.emailQueue.add(
            'scheduled',
            {
                to,
                content
            },
            {
                delay: delayMs // 延迟执行
            }
        )
    }
}

// ====== 3) 消费者：处理任务 ======
@Processor('email')
export class EmailProcessor {
    @Process('verification')
    async handleVerification(job: Job<{ to: string; code: string }>) {
        const { to, code } = job.data
        console.log(`发送验证码 ${code} 到 ${to}`)
        // 调用邮件服务...
    }

    @Process('scheduled')
    async handleScheduled(job: Job<{ to: string; content: string }>) {
        console.log(`发送预约邮件到 ${job.data.to}`)
        // 调用邮件服务...
    }
}

// ====== 1) 注册模块 ======
// （写在最后：@Module 里的 providers 在类定义时求值，得等上面两个类先声明完）
@Module({
    imports: [
        BullModule.forRoot({
            redis: {
                host: 'localhost',
                port: 6379
            }
        }),
        BullModule.registerQueue({
            name: 'email' // 队列名称
        })
    ],
    providers: [EmailProcessor, EmailQueue]
})
export class QueueModule {}

if (require.main === module) {
    console.log('06-queue.ts 只做结构演示：Bull 的队列数据全在 Redis 里，没有 Redis 看不到真实收发。')
    console.log('  校验编译：npm run typecheck')
    console.log('  真实运行：先 redis-server（或 docker run -p 6379:6379 redis），再把这个文件挂进 Nest 应用启动。')
    console.log(`  本文件定义了：${[QueueModule.name, EmailQueue.name, EmailProcessor.name].join(' / ')}`)
}
