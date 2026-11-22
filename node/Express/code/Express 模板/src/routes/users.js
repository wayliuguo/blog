const { Router } = require('express')
const userController = require('../controllers/userController')
const auth = require('../middleware/auth')
const validate = require('../middleware/validate')
const { registerSchema, loginSchema } = require('../utils/schemas')

const router = Router()

router.post('/register', validate(registerSchema), userController.register)
router.post('/login', validate(loginSchema), userController.login)
router.get('/profile', auth, userController.getProfile)

module.exports = router
