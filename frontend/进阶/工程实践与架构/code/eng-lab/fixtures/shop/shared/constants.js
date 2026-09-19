// 领域无关的常量与契约。shared 不 import 项目内任何模块 —— 它是依赖图的叶子。
export const ORDER_STATUS = {
    CREATED: 'created',
    PAID: 'paid',
    SHIPPED: 'shipped',
    CLOSED: 'closed'
}

export const CURRENCY = 'CNY'

export const PAGE_SIZE = 20
