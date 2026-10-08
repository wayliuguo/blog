'use strict'

const path = require('node:path')

// 项目根：lib/ 的上一级。对外展示的路径都相对它，日志里才短、才能直接对照文档
const ROOT = path.resolve(__dirname, '..')

// 绝对路径 → 相对项目根的 posix 路径（Windows 的 \ 统一成 /，避免日志里出现反斜杠）
const rel = file => path.relative(ROOT, file).split(path.sep).join('/')

module.exports = { ROOT, rel }
