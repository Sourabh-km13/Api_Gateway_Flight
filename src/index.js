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
const waitForService = require('./services/wake-server');

const app = express();

// Render (and other reverse proxies) set X-Forwarded-For; required for express-rate-limit.
app.set('trust proxy', 1)

const limiter = rateLimit({
    windowMs: 2 * 60 * 1000,
    max: 500,
})



// CORS must run before /health so the SPA can read the wake response in the browser.
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-access-token', 'Authorization'],
}));

app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API Gateway is healthy'
    });
});
app.get('/wake', async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Waking downstream services'
    });
});
app.use(limiter)

app.use('/flightservice', AuthMiddleWares.checkAuth,
    async function wakeServer(req, res, next) {
        const isReady = await waitForService(
            `${serverConfig.FLIGHT_SERVICE}`
        )

        if (!isReady) {
            return res.status(503).json({
                success: false,
                message: 'Flight service is waking up'
            })
        }

        next()
    },
    createProxyMiddleware({
        target: serverConfig.FLIGHT_SERVICE,
        changeOrigin: true,
        pathRewrite: { '^/flightservice': '/' }
    }))
app.use(
    '/admin/flightservice',
    AuthMiddleWares.checkAuth,
    AuthMiddleWares.isAdmin,
    async function wakeServer(req, res, next) {
        const isReady = await waitForService(
            `${serverConfig.FLIGHT_SERVICE}`
        )

        if (!isReady) {
            return res.status(503).json({
                success: false,
                message: 'Flight service is waking up'
            })
        }

        next()
    },
    createProxyMiddleware({
        target: serverConfig.FLIGHT_SERVICE,
        changeOrigin: true,
        pathRewrite: { '^/admin/flightservice': '/' },
    }),
)
app.use('/bookingservice',
    AuthMiddleWares.checkAuth,
    async function wakeServer(req, res, next) {
        const isReady = await waitForService(
            `${serverConfig.BOOKING_SERVICE}`
        )

        if (!isReady) {
            return res.status(503).json({
                success: false,
                message: 'Flight service is waking up'
            })
        }

        next()
    },
    createProxyMiddleware({
        target: serverConfig.BOOKING_SERVICE,
        changeOrigin: true,
        pathRewrite: { '^/bookingservice': '/' },

    }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api', apiRoutes);
app.use('/admin', adminRouter);

app.listen(ServerConfig.PORT, () => {
    console.log(`Successfully started the server on PORT : ${ServerConfig.PORT}`);
});
