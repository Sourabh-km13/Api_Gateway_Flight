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

// Render (and other reverse proxies) set X-Forwarded-For; required for express-rate-limit.
app.set('trust proxy', 1)

const limiter = rateLimit({
    windowMs: 2 * 60 * 1000,
    max: 500,
})

function pingHealth(healthUrl) {
    try {
        const url = new URL(healthUrl)
        const client = url.protocol === 'https:' ? https : http
        const request = client.get(url, (response) => {
            response.resume()
            const status = response.statusCode
            if (status >= 200 && status < 300) {
                return
            }
            // 502/503 are common while Render free-tier services cold-start; the ping still wakes them.
            if (status === 502 || status === 503 || status === 504) {
                console.warn(`Downstream wake pending for ${healthUrl}: HTTP ${status} (service may still be starting)`)
                return
            }
            console.error(`Downstream wake failed for ${healthUrl}: HTTP ${status}`)
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
    const serviceBases = [serverConfig.FLIGHT_SERVICE, serverConfig.BOOKING_SERVICE]
    for (const base of serviceBases) {
        if (!base) {
            continue
        }

        const healthUrl = `${String(base).replace(/\/$/, '')}/health`
        pingHealth(healthUrl)
    }
}

// CORS must run before /health so the SPA can read the wake response in the browser.
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-access-token', 'Authorization'],
}));

app.get('/health', (req, res) => {
    wakeDownstreamServices()
    res.status(200).json({
        success: true,
        message: 'API Gateway is healthy'
    });
});

app.use(limiter)

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
