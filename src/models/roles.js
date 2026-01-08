'use strict';
const {
  Model
} = require('sequelize');
const { Enums } = require('../utils/common');
const {CUSTOMER,FLIGHT_COMPANY,ADMIN}= Enums.USER_ROLES_ENUMS
module.exports = (sequelize, DataTypes) => {
  class Roles extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsToMany(models.User,{through:'UserRoles',as:'user'})
    }
  }
  Roles.init({
    name:{
      type:DataTypes.ENUM({
        values:[CUSTOMER,FLIGHT_COMPANY,ADMIN]
      }),
      allowNull:false,
      defaultValue:CUSTOMER
    },

  }, {
    sequelize,
    modelName: 'Roles',
  });
  return Roles;
};