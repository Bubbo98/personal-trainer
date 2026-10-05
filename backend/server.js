const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { errorHandler, forbidden } = require('./utils/http');

const app = express();

// Vercel's proxy sets X-Forwarded-For: req.ip must be the client's (login rate limit)
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
    // No Origin header: same-origin requests, curl, mobile apps
    origin: (origin, callback) => (!origin || config.corsOrigins.includes(origin)
        ? callback(null, true)
        : callback(forbidden('Origin not allowed by CORS'))),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.env,
        version: config.version,
    });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/training-days', require('./routes/training-days'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/pdf', require('./routes/pdf'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/workout', require('./routes/workout'));
app.use('/api/cron', require('./routes/cron'));
app.use('/api/body-composition', require('./routes/body-composition'));
app.use('/api/integration', require('./routes/integration'));
app.use('/api/thumbnails', require('./routes/thumbnails'));

// 404 for unknown endpoints, then the central error handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found', path: req.path, method: req.method });
});
app.use(errorHandler);

// Listen only when run directly (`node server.js`): Vercel and the tests import the app
if (require.main === module) {
    app.listen(config.port, () => {
        console.log(`Server on port ${config.port} (${config.env}), database ${config.database.url.replace(/\/\/.*@/, '//')}`);
    });
}

module.exports = app;
