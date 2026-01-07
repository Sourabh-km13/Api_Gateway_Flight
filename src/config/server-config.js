const dotenv = require('dotenv');

dotenv.config();

module.exports = {
    PORT: process.env.PORT,
    FLIGHT_SERVICE:process.env.FLIGHT_SERVICE,
    BOOKING_SERVICE:process.env.BOOKING_SERVICE,
    SALT_ROUNDS: process.env.SALT_ROUNDS,
    JWT_KEY:process.env.JWT_KEY,
    JWT_EXPIRY:process.env.JWT_EXPIRY
}