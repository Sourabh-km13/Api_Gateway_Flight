const  CrudRepository  = require("./crud-repository");
const {Roles} = require("../models")
class RoleRepository extends CrudRepository{
    constructor(){
        super(Roles)
    }
    async getrolebyName(name){
        const response = await Roles.findOne({
            where:{name:name}
        })
        return response
    }
}

module.exports = RoleRepository