const express = require('express')
const { UserController } = require('../controllers')
const { AuthMiddleWares } = require('../middlewares')

const adminRouter = express.Router()

adminRouter.post('/signin', AuthMiddleWares.validateAuthRequest, UserController.adminSignin)

module.exports = adminRouter
