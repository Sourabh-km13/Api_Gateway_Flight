const { StatusCodes } = require("http-status-codes")
const { failResponse } = require("../utils/common")
const { UserService } = require("../services")
const AppError = require("../utils/errors/app-error")

function validateAuthRequest(req, res, next){
    if(!req.body.email){
        failResponse.message = 'Something went wrong while authenticating'
        failResponse.error = 'email not found in the incoming request'
        
        return res.status(StatusCodes.BAD_REQUEST).json(failResponse)
    }
    if(!req.body.password){
        failResponse.message = 'Something went wrong while authenticating'
        failResponse.error = 'password not found in the incoming request'
        
        return res.status(StatusCodes.BAD_REQUEST).json(failResponse)
    }
    next()
}
async function checkAuth(req,res,next){
        try {
            const response = await UserService.isAuthenticated(req.headers['x-access-token'])
            if(response){
                req.user = response
                next()
            }
        } catch (error) {
            res.status(error.statusCode).json(error)
        }
        
        

}
module.exports = {validateAuthRequest, checkAuth}