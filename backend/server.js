const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const adminRoutes = require('./routes/admin');
const reviewRoutes = require('./routes/reviews');
const debugRoutes = require('./routes/debug');
const sitemapRoutes = require('./routes/sitemap');
const pdfRoutes = require('./routes/pdf');
const feedbackRoutes = require('./routes/feedback');
const analyticsRoutes = require('./routes/analytics');
const trainingDaysRoutes = require('./routes/training-days');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

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

// Rate limiting - Disabled
// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for development
//     message: 'Too many requests from this IP, please try again later.'
// });
// app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (videos, thumbnails, pdf, etc.)
app.use('/videos', express.static(path.join(__dirname, '..', 'public', 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, '..', 'public', 'thumbnails')));
app.use('/pdf', express.static(path.join(__dirname, '..', 'public', 'pdf')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', authenticateToken, videoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/training-days', trainingDaysRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/analytics', analyticsRoutes);

// SEO Routes (sitemap.xml, robots.txt)
app.use('/', sitemapRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Default error response
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Don't leak error details in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'Internal Server Error';
    }

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`🔒 Environment: ${process.env.NODE_ENV}`);
    console.log(`💾 Database: ${process.env.DB_PATH}`);

    // Schedule check reminder emails daily at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('🔔 Running scheduled check reminder job...');
        try {
            const { run } = require('./scripts/send-checkin-reminders');
            await run();
        } catch (err) {
            console.error('❌ Check reminder job failed:', err);
        }
    }, {
        timezone: 'Europe/Rome'
    });
    console.log('⏰ Check reminder cron job scheduled (daily at 9:00 AM Europe/Rome)');
});

module.exports = app;