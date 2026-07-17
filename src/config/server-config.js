const dotenv = require('dotenv');

dotenv.config();

module.exports = {
    PORT: process.env.PORT,
    FLIGHT_SERVICE: process.env.FLIGHT_SERVICE,
    BOOKING_SERVICE: process.env.BOOKING_SERVICE,
    SALT_ROUNDS: process.env.SALT_ROUNDS,
    JWT_KEY: process.env.JWT_KEY,
    JWT_EXPIRY: process.env.JWT_EXPIRY,
    DB_USER: process.env.DB_USER,
    DB_PASS: process.env.DB_PASS,
    DB_NAME: process.env.DB_NAME,
    DB_HOST: process.env.DB_HOST,
    DB_DIALECT: process.env.DB_DIALECT
}
