const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const adminRoutes = require('./routes/admin');
const reviewRoutes = require('./routes/reviews');
const sitemapRoutes = require('./routes/sitemap');
const pdfRoutes = require('./routes/pdf');
const feedbackRoutes = require('./routes/feedback');
const trainingDaysRoutes = require('./routes/training-days');
const workoutRoutes = require('./routes/workout');
const cronRoutes = require('./routes/cron');
const bodyCompositionRoutes = require('./routes/body-composition');
const integrationRoutes = require('./routes/integration');
const thumbnailRoutes = require('./routes/thumbnails');
const { authenticateToken } = require('./middleware/auth');
const { errorHandler } = require('./utils/http');

const app = express();
const PORT = process.env.PORT || 3001;

// Vercel's proxy sets X-Forwarded-For: req.ip must be the client's (login rate limit)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const allowedOrigins = [
    'http://localhost:3000',
    'https://personal-trainer-prod.vercel.app',
    'https://esercizifacili.com',
    'https://www.esercizifacili.com',
    'https://app.esercizifacili.com'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        // Deployed commit (set by Vercel): tells which code is live after a push
        version: (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7)
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', authenticateToken, videoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/training-days', trainingDaysRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/workout', workoutRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/body-composition', bodyCompositionRoutes);
app.use('/api/integration', integrationRoutes);
app.use('/api/thumbnails', thumbnailRoutes);

// SEO Routes (sitemap.xml, robots.txt)
app.use('/', sitemapRoutes);

// 404 for unknown endpoints, then the central error handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found', path: req.path, method: req.method });
});
app.use(errorHandler);

// Start server only when run directly (`node server.js`): Vercel and the tests import the app
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
        console.log(`🔒 Environment: ${process.env.NODE_ENV}`);
        console.log(`💾 Database: ${process.env.DB_PATH}`);
    });
}

module.exports = app;