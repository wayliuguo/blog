const Router = require('@koa/router')
const userController = require('../controllers/userController')
const auth = require('../middleware/auth')
const validate = require('../middleware/validate')
const { registerSchema, loginSchema } = require('../utils/schemas')

const router = new Router()

router.post('/users/register', validate(registerSchema), userController.register)
router.post('/users/login', validate(loginSchema), userController.login)
router.get('/users/profile', auth, userController.getProfile)

module.exports = router
