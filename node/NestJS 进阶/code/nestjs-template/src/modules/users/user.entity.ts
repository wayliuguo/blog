/**
 * 用户实体 — 映射到 users 表，存储账号密码认证体系下的用户信息。
 *
 * 字段：id、email（唯一）、username、password（bcrypt 哈希）、role、createdAt、updatedAt。
 * password 字段通过 @Exclude 在序列化输出时排除，避免泄露哈希值。
 */
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger'
import { Exclude } from 'class-transformer'
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('users')
export class User {
    @ApiProperty({ description: '用户 ID' })
    @PrimaryGeneratedColumn({ comment: '主键' })
    id: number

    @ApiProperty({ description: '邮箱（唯一）' })
    @Column({ type: 'varchar', length: 128, unique: true, comment: '邮箱' })
    email: string

    @ApiProperty({ description: '用户名' })
    @Column({ type: 'varchar', length: 64, comment: '用户名' })
    username: string

    /** 密码哈希值，对外序列化时排除，避免泄露 */
    @ApiHideProperty()
    @Exclude()
    @Column({ type: 'varchar', length: 255, comment: '密码哈希' })
    password: string

    @ApiProperty({ description: '角色', default: 'user' })
    @Column({ type: 'varchar', length: 20, default: 'user', comment: '角色' })
    role: string

    @ApiProperty({ description: '创建时间' })
    @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
    createdAt: Date

    @ApiProperty({ description: '更新时间' })
    @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
    updatedAt: Date
}
