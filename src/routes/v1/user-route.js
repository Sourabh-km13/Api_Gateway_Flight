const express = require('express')
const { UserController } = require('../../controllers')

const userRouter = express.Router()

userRouter.post('/signup',UserController.createUser)
userRouter.post('/signin',UserController.signin)

module.exports = userRouter