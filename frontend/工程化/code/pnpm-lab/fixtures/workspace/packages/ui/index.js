const { greet } = require('@lab/utils')

function card(name) {
    return `<section>${greet(name)}</section>`
}

module.exports = { card }
