const express = require('express');

const { ServerConfig } = require('./config');
const apiRoutes = require('./routes');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const serverConfig = require('./config/server-config');
const app = express();
const limiter = rateLimit({
    windowMs: 2* 60* 1000,
    max:500,

})
app.use(express.json())
app.use(express.urlencoded())
app.use(limiter)
app.use('/flightservice',createProxyMiddleware({
    target:serverConfig.FLIGHT_SERVICE,
    changeOrigin:true,
    pathRewrite:{'^/flightservice':'/'}
}))
app.use('/bookingservice',createProxyMiddleware({
    target:serverConfig.BOOKING_SERVICE,
    changeOrigin:true,
    pathRewrite:{'^/bookingservice':'/'}
}))
app.use('/api', apiRoutes);

app.listen(ServerConfig.PORT, () => {
    console.log(`Successfully started the server on PORT : ${ServerConfig.PORT}`);
});
