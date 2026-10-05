const express = require('express');
const { db } = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { route, badRequest } = require('../utils/http');

// Supplements catalog ("Integrazione"): categories with product links
const router = express.Router();

/** All categories with their products, in order. */
async function loadCatalog() {
    const [categories, products] = await Promise.all([
        db.query('SELECT id, name FROM integration_categories ORDER BY order_index'),
        db.query('SELECT id, category_id, name, image_url, product_url FROM integration_products ORDER BY category_id, order_index'),
    ]);
    return categories.map((c) => ({
        id: c.id,
        name: c.name,
        products: products
            .filter((p) => p.category_id === c.id)
            .map((p) => ({ id: p.id, name: p.name, imageUrl: p.image_url, productUrl: p.product_url })),
    }));
}

// GET /api/integration/products — client catalog
router.get('/products', authenticateToken, route(async (req, res) => {
    res.json({ success: true, data: { categories: await loadCatalog() } });
}));

// GET /api/integration/admin/products — same data, for the admin editor
router.get('/admin/products', authenticateToken, requireAdmin, route(async (req, res) => {
    res.json({ success: true, data: { categories: await loadCatalog() } });
}));

// POST /api/integration/admin/products — replaces the whole catalog in one transaction
// Body: { categories: [{ name, products: [{ name, productUrl, imageUrl? }] }] }
router.post('/admin/products', authenticateToken, requireAdmin, route(async (req, res) => {
    const { categories } = req.body;
    if (!Array.isArray(categories)) throw badRequest('categories must be an array');
    for (const cat of categories) {
        if (!cat.name || !Array.isArray(cat.products)) throw badRequest('Each category needs a name and a products array');
        if (cat.products.some((p) => !p.name || !p.productUrl)) throw badRequest('Each product needs a name and a productUrl');
    }

    await db.transaction(async (tx) => {
        // Products go with their categories (ON DELETE CASCADE)
        await tx.run('DELETE FROM integration_categories');
        for (const [catOrder, cat] of categories.entries()) {
            const { lastId: categoryId } = await tx.run(
                'INSERT INTO integration_categories (name, order_index) VALUES (?, ?)',
                [cat.name, catOrder]
            );
            for (const [prodOrder, p] of cat.products.entries()) {
                await tx.run(
                    'INSERT INTO integration_products (category_id, name, image_url, product_url, order_index) VALUES (?, ?, ?, ?, ?)',
                    [categoryId, p.name, p.imageUrl || null, p.productUrl, prodOrder]
                );
            }
        }
    });
    res.json({ success: true, message: 'Catalog saved' });
}));

module.exports = router;
