const express = require('express')
const { UserController } = require('../../controllers')

const userRouter = express.Router()

userRouter.post('/',UserController.createUser)

module.exports = userRouter