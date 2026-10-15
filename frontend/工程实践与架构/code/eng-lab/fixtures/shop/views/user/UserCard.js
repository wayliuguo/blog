import { maskPhone, money } from '../../shared/format.js'

export function UserCard(user) {
    return `${user.name} ${maskPhone(user.phone)} ${money(user.balance)}`
}
