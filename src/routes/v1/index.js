const express = require('express');

const { InfoController } = require('../../controllers');
const userRouter = require('./user-route');
const { AuthMiddleWares } = require('../../middlewares');

const router = express.Router();

router.get('/info',[AuthMiddleWares.checkAuth], InfoController.info);
router.use('/user',userRouter)

module.exports = router;