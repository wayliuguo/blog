// 实体关系速查：一对多 / 多对一 / 多对多集中放在一个文件里演示。
// 真正接数据库时，请按业务拆到各自的 *.entity.ts 里（同名的 User 不要和 users/entities/user.entity.ts 同时加载）。
import {
    Column,
    Entity,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn
} from 'typeorm'

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    // 一对多：一个用户有多个订单
    @OneToMany(() => Order, order => order.user)
    orders: Order[]
}

@Entity()
export class Order {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    total: number

    @ManyToOne(() => User, user => user.orders)
    @JoinColumn({ name: 'user_id' }) // 指定外键列名
    user: User
}

// 多对多
@Entity()
export class Student {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToMany(() => Course, course => course.students)
    @JoinTable() // 需要指定哪一方维护关系
    courses: Course[]
}

@Entity()
export class Course {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToMany(() => Student, student => student.courses)
    students: Student[]
}
