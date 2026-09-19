import { BUILD_INFO } from 'virtual:build-info'
import { add, mul } from '../src/math.js'

export function run(a, b) {
    return { result: add(a, b) * mul(a, b), builtAt: BUILD_INFO.builtAt }
}
