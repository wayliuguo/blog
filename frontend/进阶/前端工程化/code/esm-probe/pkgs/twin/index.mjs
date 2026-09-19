import { box } from './state.mjs'

export const source = 'index.mjs（import 条件命中）'
export const read = () => box.count
export const bump = () => (box.count += 1)
