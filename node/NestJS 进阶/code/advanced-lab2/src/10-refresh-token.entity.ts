/**
 * 10 - 项目模板：刷新令牌实体
 *
 * 模板里没有这一张表（模板的 refresh token 存在 Redis），这里补上 TypeORM 版本，
 * 并把两张实体的「装饰器 → 建表元数据」对照打印出来，验证写法真的会被 TypeORM 读走。
 *
 * 运行：npm run 10entity
 */
import 'reflect-metadata'

import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    ManyToOne,
    PrimaryGeneratedColumn,
    getMetadataArgsStorage
} from 'typeorm'

import { User } from './10-user.entity'

@Entity('refresh_tokens')
export class RefreshToken {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User

    /** 只存 SHA-256 哈希，不存明文（见 11 篇） */
    @Index()
    @Column({ type: 'varchar', length: 64 })
    tokenHash: string

    /** 设备指纹：同一用户多设备登录时用它区分会话 */
    @Column({ type: 'varchar', length: 64 })
    deviceId: string

    @Column({ type: 'datetime', comment: '过期时间' })
    expiresAt: Date

    @Column({ type: 'boolean', default: false, comment: '是否已吊销' })
    revoked: boolean

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date
}

/** 装饰器里的 type 既可能是字符串（'varchar'），也可能是构造函数（Number / Date） */
function typeName(type: unknown): string {
    return typeof type === 'function' ? type.name : String(type)
}

function main() {
    const storage = getMetadataArgsStorage()

    for (const target of [User, RefreshToken]) {
        const table = storage.tables.find(t => t.target === target)!
        console.log(`\n=== @Entity('${table.name}') → 表 ${table.name} ===`)

        for (const col of storage.columns.filter(c => c.target === target)) {
            const o = col.options as Record<string, any>
            const parts = [
                o.type ? `type=${typeName(o.type)}` : '',
                o.length ? `length=${o.length}` : '',
                o.unique ? 'unique' : '',
                o.default !== undefined ? `default=${o.default}` : '',
                o.select === false ? 'select=false' : '',
                o.name ? `name=${o.name}` : ''
            ].filter(Boolean)
            console.log(`  ${col.propertyName.padEnd(10)} ${parts.join(' ')}`)
        }

        for (const rel of storage.relations.filter(r => r.target === target)) {
            console.log(`  ${rel.propertyName.padEnd(10)} ${rel.relationType} → ${(rel.type as any)().name}`)
        }
    }

    console.log('\n=== 从元数据能反推出什么 ===')
    const rtCols = storage.columns.filter(c => c.target === RefreshToken)
    const rtIndexes = storage.indices.filter(i => i.target === RefreshToken)
    const idxCols = rtIndexes.flatMap(i => (Array.isArray(i.columns) ? i.columns : []))
    const password = (storage.columns.find(c => c.target === User && c.propertyName === 'password')?.options ??
        {}) as Record<string, any>
    console.log(`  refresh_tokens 列数        = ${rtCols.length}`)
    console.log(`  refresh_tokens 上的索引列   = ${idxCols.join(', ')}`)
    console.log(`  User.password 标了 select:false 吗 = ${password.select === false}（模板靠 @Exclude 序列化时剔除）`)
}

main()
