import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ length: 50 })
    name: string

    @Column({ default: 0 })
    age: number

    @Column({ unique: true })
    email: string

    @Column({ type: 'datetime', default: () => 'NOW()' })
    createdAt: Date

    @Column({ type: 'int', default: 0 })
    balance: number
}
