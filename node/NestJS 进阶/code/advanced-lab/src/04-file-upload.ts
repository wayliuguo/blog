/**
 * 04 - 文件上传：拦截器落盘、两道校验闸、管道校验、静态资源访问
 *
 * 真实的 Nest + multer：起一个上传服务，然后用 fetch 真的把文件传上去，
 * 把「成功 / 类型不对 / 体积超限 / 多文件 / 管道拒绝」五种结果都打出来，
 * 最后再按返回的 URL 把文件读回来，验证静态资源确实开好了。
 *
 * 运行：npm run 04upload
 */
import {
    BadRequestException,
    Controller,
    Get,
    Injectable,
    Module,
    PipeTransform,
    Post,
    UploadedFile,
    UploadedFiles,
    UseInterceptors
} from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'

/** 上传根目录放在系统临时目录里，跑完删掉，不污染仓库 */
const UPLOAD_ROOT = join(tmpdir(), 'advanced-lab-uploads')
const AVATAR_DIR = join(UPLOAD_ROOT, 'avatars')

// ====== 4) 自定义文件校验管道 ======
// （写在 controller 前面：装饰器里的 new FileValidationPipe(...) 在类定义时就会求值）
@Injectable()
export class FileValidationPipe implements PipeTransform {
    constructor(private readonly maxSize: number) {}

    transform(file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('文件不能为空')
        }

        // 校验文件大小
        if (file.size > this.maxSize) {
            throw new BadRequestException(`文件大小不能超过 ${this.maxSize / 1024 / 1024}MB`)
        }

        // 校验文件类型
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        if (!allowed.includes(file.mimetype)) {
            throw new BadRequestException('不支持的文件类型')
        }

        return file
    }
}

// ====== 1) 单文件上传：拦截器 + 落盘 + 两道校验闸 ======
@Controller('upload')
export class UploadController {
    @Post('avatar')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: AVATAR_DIR,
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
                    const ext = extname(file.originalname)
                    callback(null, `${uniqueSuffix}${ext}`)
                }
            }),
            limits: {
                fileSize: 2 * 1024 * 1024 // 2MB
            },
            fileFilter: (req, file, callback) => {
                if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
                    callback(new BadRequestException('只支持 JPEG/PNG/WebP 格式'), false)
                    return
                }
                callback(null, true)
            }
        })
    )
    uploadAvatar(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('请选择文件')
        }
        return {
            url: `/uploads/avatars/${file.filename}`,
            size: file.size,
            mimetype: file.mimetype
        }
    }

    // ====== 2) 多文件上传 ======
    // 这里没传 storage，用的是 multer 默认的内存存储：文件不落盘，内容在 file.buffer 里，
    // 也**没有** file.filename（那个字段只有 diskStorage 才会填），只演示「一次收多个文件 + 限制数量」
    @Post('photos')
    @UseInterceptors(FilesInterceptor('files', 10)) // 最多 10 张
    uploadPhotos(@UploadedFiles() files: Express.Multer.File[]) {
        return files.map(file => ({
            name: file.originalname,
            size: file.size
        }))
    }

    // ====== 3) 文件也能被管道校验 ======
    @Post('document')
    @UseInterceptors(FileInterceptor('file'))
    uploadDoc(@UploadedFile(new FileValidationPipe(10 * 1024 * 1024)) file: Express.Multer.File) {
        return { filename: file.originalname, size: file.size, mimetype: file.mimetype }
    }

    /** 看看磁盘上到底落了多少文件 */
    @Get('list')
    async list() {
        return {
            avatars: existsSync(AVATAR_DIR) ? await readdir(AVATAR_DIR) : []
        }
    }
}

// ====== 4) 自定义文件校验管道（本体见上方 FileValidationPipe）======

@Module({
    controllers: [UploadController]
})
class AppModule {}

/** 造一个内存里的假文件 */
function fakeFile(name: string, type: string, bytes: number) {
    return new Blob([new Uint8Array(bytes).fill(65)], { type })
}

async function postFile(base: string, path: string, field: string, name: string, type: string, bytes: number) {
    const form = new FormData()
    form.append(field, fakeFile(name, type, bytes), name)
    const res = await fetch(`${base}${path}`, { method: 'POST', body: form })
    const text = await res.text()
    console.log(`  POST ${path.padEnd(15)} ${name.padEnd(12)} (${type}, ${bytes}B) → ${res.status} ${text}`)
    return { status: res.status, text }
}

async function bootstrap() {
    mkdirSync(AVATAR_DIR, { recursive: true })

    const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false })

    // ====== 静态资源访问 ======
    // 不挂这行，文件虽然存下来了，但 /uploads/xxx 访问不到
    app.useStaticAssets(UPLOAD_ROOT, {
        prefix: '/uploads/' // 访问路径：http://localhost:3000/uploads/xxx.jpg
    })

    await app.listen(0, '127.0.0.1')
    const port = (app.getHttpServer().address() as { port: number }).port
    const base = `http://127.0.0.1:${port}`

    console.log('=== 1) 单文件上传：图片通过两道闸，落盘并返回 URL ===')
    const ok = await postFile(base, '/upload/avatar', 'file', 'avatar.png', 'image/png', 2048)
    const { url } = JSON.parse(ok.text) as { url: string }

    console.log('\n=== 2) 按返回的 URL 把文件读回来：静态资源确实开好了 ===')
    const fileRes = await fetch(`${base}${url}`)
    const downloaded = await readFile(join(UPLOAD_ROOT, url.replace('/uploads/', '')))
    console.log(`  GET  ${url} → ${fileRes.status} ${fileRes.headers.get('content-type')}`)
    console.log(`  磁盘上这个文件 ${downloaded.length} 字节，和上传的 2048 字节一致：${downloaded.length === 2048}`)

    console.log('\n=== 3) fileFilter 挡下非图片：只支持 JPEG/PNG/WebP ===')
    await postFile(base, '/upload/avatar', 'file', 'note.txt', 'text/plain', 128)

    console.log('\n=== 4) limits.fileSize 挡下超大文件：2MB 上限 ===')
    await postFile(base, '/upload/avatar', 'file', 'huge.png', 'image/png', 3 * 1024 * 1024)

    console.log('\n=== 5) 多文件上传：FilesInterceptor(files, 10) ===')
    const form = new FormData()
    form.append('files', fakeFile('p1.png', 'image/png', 100), 'p1.png')
    form.append('files', fakeFile('p2.png', 'image/png', 200), 'p2.png')
    form.append('files', fakeFile('p3.png', 'image/png', 300), 'p3.png')
    const multiRes = await fetch(`${base}/upload/photos`, { method: 'POST', body: form })
    console.log(`  POST /upload/photos 3 个文件 → ${multiRes.status} ${await multiRes.text()}`)

    console.log('\n=== 6) FileValidationPipe：大小与 mimetype 白名单 ===')
    await postFile(base, '/upload/document', 'file', 'report.pdf', 'application/pdf', 4096)
    await postFile(base, '/upload/document', 'file', 'tool.exe', 'application/x-msdownload', 4096)

    console.log('\n=== 7) 落到磁盘上的文件 ===')
    console.log(`  ${JSON.stringify(await (await fetch(`${base}/upload/list`)).json())}`)

    console.log(
        '\n说明：fileFilter 拦下的请求进不了 controller；limits 超限是 413（PayloadTooLarge）；管道抛出的是 400。'
    )
    console.log('说明：filename 里用「时间戳 + 随机数 + 原扩展名」，既避免重名也避免中文文件名乱码。')

    await app.close()
    rmSync(UPLOAD_ROOT, { recursive: true, force: true })
}

void bootstrap()
