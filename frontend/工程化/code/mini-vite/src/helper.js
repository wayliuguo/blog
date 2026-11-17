import { deep } from './deep.js'

export function hi(name) {
    return `hi, ${name}! (${deep()})`
}
