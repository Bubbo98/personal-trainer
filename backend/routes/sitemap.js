const express = require('express');
const router = express.Router();

// GET /sitemap.xml
// Generate dynamic sitemap for SEO
router.get('/sitemap.xml', (req, res) => {
    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://www.esercizifacili.com'
        : 'http://localhost:3000';

    const currentDate = new Date().toISOString().split('T')[0];

    // Static pages to include in sitemap
    const staticPages = [
        { url: '', priority: '1.0', changefreq: 'weekly' }, // Homepage
        { url: '/about', priority: '0.8', changefreq: 'monthly' },
        { url: '/services', priority: '0.9', changefreq: 'monthly' },
        { url: '/contact', priority: '0.7', changefreq: 'monthly' },
        { url: '/booking', priority: '0.8', changefreq: 'weekly' },
        { url: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
        { url: '/terms-of-service', priority: '0.3', changefreq: 'yearly' },
        { url: '/cookie-policy', priority: '0.3', changefreq: 'yearly' }
    ];

    // Generate XML sitemap
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add static pages
    staticPages.forEach(page => {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}${page.url}</loc>\n`;
        sitemap += `    <lastmod>${currentDate}</lastmod>\n`;
        sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
        sitemap += `    <priority>${page.priority}</priority>\n`;
        sitemap += '  </url>\n';
    });

    sitemap += '</urlset>';

    // Set correct headers for XML
    res.set({
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });

    res.send(sitemap);
});

// GET /robots.txt
// Generate robots.txt for search engines
router.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://www.esercizifacili.com'
        : 'http://localhost:3000';

    let robots = 'User-agent: *\n';
    robots += 'Allow: /\n';
    robots += 'Disallow: /admin\n';
    robots += 'Disallow: /dashboard\n';
    robots += 'Disallow: /api\n';
    robots += '\n';
    robots += `Sitemap: ${baseUrl}/sitemap.xml\n`;

    res.set({
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
    });

    res.send(robots);
});

module.exports = router;