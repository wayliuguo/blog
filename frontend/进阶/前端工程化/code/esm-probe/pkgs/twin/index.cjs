const { box } = require('./state.cjs')

exports.source = 'index.cjs（require 条件命中）'
exports.read = () => box.count
exports.bump = () => (box.count += 1)
