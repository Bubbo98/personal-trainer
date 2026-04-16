const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/analytics
// Get analytics data from Vercel Analytics API
router.get('/', async (req, res) => {
    try {
        const { timeframe = '7d' } = req.query; // 7d, 30d, 90d, etc.

        // Check if Vercel token is configured
        if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_PROJECT_ID) {
            return res.status(503).json({
                success: false,
                error: 'Analytics not configured. Please set VERCEL_TOKEN and VERCEL_PROJECT_ID in environment variables.',
                data: null
            });
        }

        // Calculate date range based on timeframe
        const now = new Date();
        const daysAgo = parseInt(timeframe) || 7;
        const since = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).getTime();
        const until = now.getTime();

        // Fetch analytics from Vercel API
        const teamId = process.env.VERCEL_TEAM_ID; // Optional: if using a team
        const projectId = process.env.VERCEL_PROJECT_ID;

        const baseUrl = teamId
            ? `https://api.vercel.com/v1/analytics/teams/${teamId}`
            : 'https://api.vercel.com/v1/analytics';

        // Fetch page views
        const pageViewsUrl = `${baseUrl}?projectId=${projectId}&since=${since}&until=${until}&event=pageview`;
        const visitorsUrl = `${baseUrl}?projectId=${projectId}&since=${since}&until=${until}&event=visitor`;

        const headers = {
            'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
            'Content-Type': 'application/json'
        };

        // Note: Vercel Analytics API might require different endpoints
        // This is a placeholder structure. You'll need to adjust based on actual Vercel API
        console.log('Fetching from URLs:', { pageViewsUrl, visitorsUrl });

        const [pageViewsResponse, visitorsResponse] = await Promise.all([
            fetch(pageViewsUrl, { headers }).catch(err => {
                console.error('Page views fetch error:', err.message);
                return null;
            }),
            fetch(visitorsUrl, { headers }).catch(err => {
                console.error('Visitors fetch error:', err.message);
                return null;
            })
        ]);

        let pageViews = 0;
        let uniqueVisitors = 0;
        let topPages = [];
        let topCountries = [];
        let apiError = null;

        if (pageViewsResponse) {
            console.log('Page views response status:', pageViewsResponse.status);
            if (pageViewsResponse.ok) {
                const data = await pageViewsResponse.json();
                console.log('Page views data:', JSON.stringify(data).substring(0, 200));
                pageViews = data.total || 0;
                topPages = data.pages || [];
            } else {
                const errorText = await pageViewsResponse.text();
                console.error('Page views error:', pageViewsResponse.status, errorText);
                apiError = `API Error: ${pageViewsResponse.status}`;
            }
        }

        if (visitorsResponse) {
            console.log('Visitors response status:', visitorsResponse.status);
            if (visitorsResponse.ok) {
                const data = await visitorsResponse.json();
                console.log('Visitors data:', JSON.stringify(data).substring(0, 200));
                uniqueVisitors = data.total || 0;
                topCountries = data.countries || [];
            } else {
                const errorText = await visitorsResponse.text();
                console.error('Visitors error:', visitorsResponse.status, errorText);
            }
        }

        // Calculate derived metrics
        const avgSessionDuration = uniqueVisitors > 0
            ? Math.floor((pageViews / uniqueVisitors) * 2.5) // Rough estimate
            : 0;

        const bounceRate = pageViews > 0
            ? ((uniqueVisitors / pageViews) * 100).toFixed(1)
            : '0.0';

        console.log(`Admin ${req.user.username} accessed analytics dashboard`);

        res.json({
            success: true,
            data: {
                timeframe,
                pageViews,
                uniqueVisitors,
                avgSessionDuration: `${Math.floor(avgSessionDuration / 60)}:${(avgSessionDuration % 60).toString().padStart(2, '0')}`,
                bounceRate: `${bounceRate}%`,
                topPages: topPages.slice(0, 5).map(page => ({
                    path: page.path || page.url || '/',
                    views: page.count || page.views || 0
                })),
                topCountries: topCountries.slice(0, 4).map(country => ({
                    country: country.name || country.code || 'Unknown',
                    visitors: country.count || country.visitors || 0
                })),
                lastUpdated: new Date().toISOString(),
                ...(apiError && { apiError })
            }
        });

    } catch (error) {
        console.error('Analytics fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch analytics data',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/analytics/debug
// Debug endpoint to check Vercel API configuration
router.get('/debug', async (req, res) => {
    try {
        const hasToken = !!process.env.VERCEL_TOKEN;
        const hasProjectId = !!process.env.VERCEL_PROJECT_ID;
        const hasTeamId = !!process.env.VERCEL_TEAM_ID;

        // Try a simple API call to verify credentials
        if (hasToken && hasProjectId) {
            const testUrl = `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}`;
            const response = await fetch(testUrl, {
                headers: {
                    'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`
                }
            });

            const statusCode = response.status;
            let responseData = null;

            try {
                responseData = await response.json();
            } catch (e) {
                responseData = await response.text();
            }

            return res.json({
                success: true,
                config: {
                    hasToken,
                    hasProjectId,
                    hasTeamId,
                    tokenPrefix: process.env.VERCEL_TOKEN?.substring(0, 10) + '...',
                    projectId: process.env.VERCEL_PROJECT_ID,
                    teamId: process.env.VERCEL_TEAM_ID || 'not set'
                },
                apiTest: {
                    url: testUrl,
                    statusCode,
                    response: typeof responseData === 'string' ? responseData.substring(0, 500) : responseData
                }
            });
        }

        res.json({
            success: false,
            config: {
                hasToken,
                hasProjectId,
                hasTeamId
            },
            message: 'Missing required environment variables'
        });

    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/analytics/web-vitals
// Get Web Vitals data (optional, if you want Core Web Vitals)
router.get('/web-vitals', async (req, res) => {
    try {
        if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_PROJECT_ID) {
            return res.status(503).json({
                success: false,
                error: 'Analytics not configured',
                data: null
            });
        }

        const projectId = process.env.VERCEL_PROJECT_ID;
        const teamId = process.env.VERCEL_TEAM_ID;

        const baseUrl = teamId
            ? `https://api.vercel.com/v1/web-vitals/teams/${teamId}`
            : 'https://api.vercel.com/v1/web-vitals';

        const url = `${baseUrl}?projectId=${projectId}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Vercel API responded with ${response.status}`);
        }

        const data = await response.json();

        res.json({
            success: true,
            data: {
                vitals: data.vitals || {},
                lastUpdated: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Web Vitals fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch web vitals data',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
