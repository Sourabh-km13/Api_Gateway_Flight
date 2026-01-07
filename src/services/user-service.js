const { StatusCodes } = require("http-status-codes");
const { UserRepository } = require("../repositories");
const AppError = require("../utils/errors/app-error");
const { auth } = require("../utils/common");

const userRepository = new UserRepository()
async function create(data){
    try {
        const response = await userRepository.create(data)
        return response 
    } catch (error) {
        if(error.name==='SequelizeValidationError' || error.name ==='SequelizeUniqueConstraintError'){
            let explanation = []
            error.errors.forEach(err => {
                explanation.push(err.message)
            });
            
            throw new AppError(explanation , StatusCodes.BAD_REQUEST)
        }
        else{
            throw new AppError('Cannot create new user object',StatusCodes.BAD_REQUEST)
        }
    }
}
async function signin(data){
    try {
        const response = await userRepository.getUserbyEmail(data.email);
        if(!response){
            throw new AppError('User not found',StatusCodes.UNAUTHORIZED)
        }
        const passwordMatch = auth.checkPassword(data.password,response.password)
        if(!passwordMatch){
            throw new AppError('Password did not match',StatusCodes.UNAUTHORIZED)
        }
        const jwt = auth.createToken({id:response.id,email:response.email})
        return jwt
    } catch (error) {
        console.log(error);
        
        if(error instanceof AppError){
            throw error
        }
        throw new AppError(error.message,StatusCodes.INTERNAL_SERVER_ERROR)
    }
}
async function isAuthenticated(token){
    try {
        
        if(!token){
            throw new AppError('Jwt token missing',StatusCodes.BAD_REQUEST)
        }
        const response = auth.verifyToken(token)
        const user = await userRepository.get(response.id)
        if(!user){
            throw new AppError('No user found',StatusCodes.NOT_FOUND)
        }
        return user.id
    } catch (error) {
        if(error instanceof AppError){
            throw error
        }
        if(error.name==='JsonWebTokenError'||error.name==='TokenExpiredError'){
            throw new AppError(error,StatusCodes.BAD_REQUEST)

        }
        console.log('Errrservce',error)
        throw new AppError(error.message,StatusCodes.INTERNAL_SERVER_ERROR)
    }
}

module.exports = {create,signin,isAuthenticated}