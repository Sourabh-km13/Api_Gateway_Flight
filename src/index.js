const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');

const { ServerConfig } = require('./config');
const apiRoutes = require('./routes');
const adminRouter = require('./routes/admin-route');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const serverConfig = require('./config/server-config');
const { AuthMiddleWares } = require('./middlewares');
const app = express();
const limiter = rateLimit({
    windowMs: 2 * 60 * 1000,
    max: 500,
})

let downstreamWakeStarted = false

function pingHealth(healthUrl) {
    try {
        const url = new URL(healthUrl)
        const client = url.protocol === 'https:' ? https : http
        const request = client.get(url, (response) => {
            response.resume()
            if (response.statusCode < 200 || response.statusCode >= 300) {
                console.error(`Downstream wake failed for ${healthUrl}: HTTP ${response.statusCode}`)
            }
        })
        request.setTimeout(90000, () => {
            request.destroy(new Error('Downstream wake timed out'))
        })
        request.on('error', (error) => {
            console.error(`Downstream wake failed for ${healthUrl}:`, error.message)
        })
    } catch (error) {
        console.error(`Downstream wake failed for ${healthUrl}:`, error.message)
    }
}

function wakeDownstreamServices() {
    if (downstreamWakeStarted) {
        return
    }
    downstreamWakeStarted = true

    const serviceBases = [serverConfig.FLIGHT_SERVICE, serverConfig.BOOKING_SERVICE]
    for (const base of serviceBases) {
        if (!base) {
            continue
        }

        const healthUrl = `${String(base).replace(/\/$/, '')}/health`
        pingHealth(healthUrl)
    }
}

app.get('/health', (req, res) => {
    wakeDownstreamServices()
    res.status(200).json({
        success: true,
        message: 'API Gateway is healthy'
    });
});

app.use(limiter)

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-access-token', 'Authorization'],
}));
app.use('/flightservice', AuthMiddleWares.checkAuth, createProxyMiddleware({
    target: serverConfig.FLIGHT_SERVICE,
    changeOrigin: true,
    pathRewrite: { '^/flightservice': '/' }
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
    target: serverConfig.BOOKING_SERVICE,
    changeOrigin: true,
    pathRewrite: { '^/bookingservice': '/' }
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api', apiRoutes);
app.use('/admin', adminRouter);

app.listen(ServerConfig.PORT, () => {
    console.log(`Successfully started the server on PORT : ${ServerConfig.PORT}`);
});
