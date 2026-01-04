const express = require('express')
const { UserController } = require('../../controllers')
const { AuthMiddleWares } = require('../../middlewares')

const userRouter = express.Router()

userRouter.post('/signup',AuthMiddleWares.validateAuthRequest,UserController.createUser)
userRouter.post('/signin',UserController.signin)

module.exports = userRouter