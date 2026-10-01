import { upper } from './utils/upper.js'

export function greet(name) {
    return 'hello, ' + upper(name)
}

export const SEPARATOR = '-'.repeat(16)
