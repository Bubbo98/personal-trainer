const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const adminRoutes = require('./routes/admin');
const reviewRoutes = require('./routes/reviews');
const debugRoutes = require('./routes/debug');
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

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for development
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use('/api/reviews', reviewRoutes);
app.use('/api/debug', debugRoutes);

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
});

module.exports = app;