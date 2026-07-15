const express = require('express');

const { ServerConfig } = require('./config');
const apiRoutes = require('./routes');
const adminRouter = require('./routes/admin-route');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const serverConfig = require('./config/server-config');
const { AuthMiddleWares } = require('./middlewares');
const app = express();
const limiter = rateLimit({
    windowMs: 2* 60* 1000,
    max:500,

})
console.log(serverConfig.FLIGHT_SERVICE);
console.log(serverConfig.BOOKING_SERVICE);

app.use(limiter)
app.use('/flightservice',AuthMiddleWares.checkAuth, createProxyMiddleware({
    target: serverConfig.FLIGHT_SERVICE,
    changeOrigin:true,
    pathRewrite:{'^/flightservice':'/'}
}))
app.use(
    '/admin/flightservice',
    AuthMiddleWares.checkAuth,
    AuthMiddleWares.isAdmin,
    createProxyMiddleware({
        target: serverConfig.FLIGHT_SERVICE,
        changeOrigin: true,
        pathRewrite: { '^/admin/flightservice': '/' },
    }),
)
app.use('/bookingservice', AuthMiddleWares.checkAuth, createProxyMiddleware({
    target:serverConfig.BOOKING_SERVICE,
    changeOrigin:true,
    pathRewrite:{'^/bookingservice':'/'}
}))
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use('/api', apiRoutes);
app.use('/admin', adminRouter);

app.listen(ServerConfig.PORT, () => {
    console.log(`Successfully started the server on PORT : ${ServerConfig.PORT}`);
});
