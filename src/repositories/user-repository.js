const  CrudRepository  = require("./crud-repository");
const {User} = require("../models")
class UserRepository extends CrudRepository{
    constructor(){
        super(User)
    }
    async getUserbyEmail(email){
        const response = await User.findOne({
            where:{email:email}
        })
        return response
    }
}

module.exports = UserRepository