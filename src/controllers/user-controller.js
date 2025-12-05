const { StatusCodes } = require("http-status-codes");
const { UserService } = require("../services");
const { failResponse, successResponse } = require("../utils/common");
const  AppError  = require("../utils/errors/app-error");

async function createUser(req, res){
    try {
        const response = await UserService.create({
            email:req.body.email,
            password:req.body.password,
        })
        successResponse.data = response
        res.status(StatusCodes.CREATED).json(successResponse)
    } catch (error) {
        if(error instanceof AppError){
            failResponse.data = error
            res.status(error.statusCode).json({
                failResponse
            })
        }
        else{
            failResponse.message = error.message
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                failResponse
            })
        }
    }
    
}
async function signin(req , res){
    try {
        const response = await UserService.signin({
            email:req.body.email,
            password:req.body.password,
        })
        successResponse.data = response
        res.status(StatusCodes.CREATED).json(successResponse)
    } catch (error) {
        if(error instanceof AppError){
            failResponse.data = error
            res.status(error.statusCode).json({
                failResponse
            })
        }
        else{
            failResponse.message = error.message
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                failResponse
            })
        }
    }
}

module.exports = {
    createUser,signin
}