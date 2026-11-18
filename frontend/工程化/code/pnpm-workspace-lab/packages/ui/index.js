const { slug } = require('@lab/utils')

exports.section = text => `<section>${slug(text)}</section>`
