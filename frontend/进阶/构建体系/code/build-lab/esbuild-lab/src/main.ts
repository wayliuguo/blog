import { formatName, repeat } from './util.ts'

export function main() {
    const name = formatName({ first: 'well', last: 'liu' })
    return repeat(name, 2)
}
