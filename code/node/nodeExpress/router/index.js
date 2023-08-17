const express = require('express')
const router = express.Router()

// 用户相关模块
router.use(require('./user'))

module.exports = router
