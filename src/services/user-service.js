const { StatusCodes } = require("http-status-codes");
const { UserRepository } = require("../repositories");
const AppError = require("../utils/errors/app-error");

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

module.exports = {create}