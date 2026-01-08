const express = require('express')
const { UserController } = require('../../controllers')
const { AuthMiddleWares } = require('../../middlewares')

const userRouter = express.Router()

userRouter.post('/signup',AuthMiddleWares.validateAuthRequest,UserController.createUser)
userRouter.post('/signin',AuthMiddleWares.validateAuthRequest,UserController.signin)
userRouter.post('/role',AuthMiddleWares.checkAuth,AuthMiddleWares.isAdmin,UserController.addRoletoUser)

module.exports = userRouter