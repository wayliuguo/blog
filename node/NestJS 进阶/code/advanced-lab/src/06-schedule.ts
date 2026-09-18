/**
 * 06 - 定时任务（@nestjs/schedule）
 *
 * 真实的 ScheduleModule：装饰器声明的任务 + SchedulerRegistry 动态增删的任务，
 * 都真跑一遍给你看。为了让脚本能在十几秒内结束，动态那个用 6 段表达式设成每 2 秒一次，
 * 装饰器上仍然是文档里的 5 秒 / 10 秒。
 *
 * 运行：npm run 06schedule
 */
import { Injectable, Logger, Module } from '@nestjs/common'
import { Cron, CronExpression, Interval, SchedulerRegistry, Timeout } from '@nestjs/schedule'
import { ScheduleModule } from '@nestjs/schedule'
import { NestFactory } from '@nestjs/core'
import { CronJob } from 'cron'

@Injectable()
export class TasksService {
    private readonly logger = new Logger(TasksService.name)

    // 每天凌晨 2 点执行
    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    handleDailyReport() {
        this.logger.log('生成昨日销售报表...')
        // 查询数据库 → 生成报表 → 发送邮件
    }

    // 每 10 分钟执行一次
    @Cron('*/10 * * * *')
    handleHealthCheck() {
        // 检查服务健康状态
    }

    // 延迟执行（相对时间，仅一次）
    @Timeout(5000) // 5 秒后执行
    handleTimeout() {
        console.log('启动后 5 秒执行')
    }

    // 间隔执行
    @Interval(10000) // 每 10 秒执行
    handleInterval() {
        console.log('每 10 秒执行一次')
    }
}

@Injectable()
export class TaskManager {
    constructor(private schedulerRegistry: SchedulerRegistry) {}

    // 动态添加任务
    addCronJob(name: string, cronTime: string) {
        const job = new CronJob(cronTime, () => {
            console.log(`任务 ${name} 执行`)
        })
        this.schedulerRegistry.addCronJob(name, job)
        job.start()
    }

    // 停止任务
    stopJob(name: string) {
        const job = this.schedulerRegistry.getCronJob(name)
        job.stop()
    }

    // 获取所有任务
    getJobs() {
        return this.schedulerRegistry.getCronJobs()
    }
}

@Module({
    imports: [ScheduleModule.forRoot()],
    providers: [TasksService, TaskManager]
})
export class AppModule {}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function bootstrap() {
    const startedAt = Date.now()
    const stamp = () => `[t=${((Date.now() - startedAt) / 1000).toFixed(1)}s]`

    const app = await NestFactory.createApplicationContext(AppModule, { logger: false })
    const taskManager = app.get(TaskManager)
    const registry = app.get(SchedulerRegistry)

    console.log('=== 1) 动态加一个「每 2 秒」的任务 ===')
    taskManager.addCronJob('heartbeat', '*/2 * * * * *')
    console.log(
        `${stamp()} addCronJob('heartbeat', '*/2 * * * * *') 完成，isActive = ${
            registry.getCronJob('heartbeat').isActive
        }`
    )
    console.log('  等 6 秒，看它自己跑起来...')
    await sleep(6000)

    console.log('\n=== 2) 停掉它 ===')
    taskManager.stopJob('heartbeat')
    console.log(`${stamp()} stopJob('heartbeat') 之后 isActive = ${registry.getCronJob('heartbeat').isActive}`)
    console.log('  再等 4 秒，看上面那种「任务 heartbeat 执行」还有没有继续出现...')
    await sleep(4000)

    console.log('\n=== 3) 10 秒过去，回头看注册表里到底有什么 ===')
    console.log(`  当前时刻 ${stamp()}`)
    console.log(`  getCronJobs()   → ${JSON.stringify([...taskManager.getJobs().keys()])}`)
    console.log(`  getIntervals()  → ${JSON.stringify(registry.getIntervals())}`)
    console.log(`  getTimeouts()   → ${JSON.stringify(registry.getTimeouts())}`)

    console.log('\n=== 4) 收尾 ===')
    console.log('  说明：@Timeout(5000) 打了「启动后 5 秒执行」且只打一次；@Interval(10000) 在 10 秒时打了第一条。')
    console.log('  说明：两个 @Cron 装饰器也进了 getCronJobs()，名字是框架自动生成的 UUID；')
    console.log('  说明：@Timeout / @Interval 不进 getCronJobs()，它们分别在 getTimeouts() / getIntervals() 里。')
    console.log('  说明：@Cron(EVERY_DAY_AT_2AM) 与 @Cron("*/10 * * * *") 在十几秒内不会触发，所以看不到它们。')

    await app.close()
}

void bootstrap()
