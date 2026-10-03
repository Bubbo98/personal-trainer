const express = require('express');
const router = express.Router();
const { createDatabase } = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Shared loader: all categories with their products, ordered.
function loadCatalog(db, callback) {
  db.allCallback(
    `SELECT id, name, order_index FROM integration_categories ORDER BY order_index`,
    [],
    (err, categories) => {
      if (err) return callback(err);

      db.allCallback(
        `SELECT id, category_id, name, image_url, product_url, order_index
         FROM integration_products ORDER BY category_id, order_index`,
        [],
        (err, products) => {
          if (err) return callback(err);

          const byCategory = {};
          for (const p of products) {
            if (!byCategory[p.category_id]) byCategory[p.category_id] = [];
            byCategory[p.category_id].push({
              id: p.id,
              name: p.name,
              imageUrl: p.image_url,
              productUrl: p.product_url,
            });
          }

          const result = categories.map((c) => ({
            id: c.id,
            name: c.name,
            products: byCategory[c.id] || [],
          }));

          callback(null, result);
        }
      );
    }
  );
}

// GET /api/integration/products — client-facing catalog
router.get('/products', authenticateToken, (req, res) => {
  const db = createDatabase();
  loadCatalog(db, (err, categories) => {
    db.close();
    if (err) {
      console.error('Error loading integration catalog:', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    res.json({ success: true, data: { categories } });
  });
});

// GET /api/integration/admin/products — same data, for the admin editor
router.get('/admin/products', authenticateToken, requireAdmin, (req, res) => {
  const db = createDatabase();
  loadCatalog(db, (err, categories) => {
    db.close();
    if (err) {
      console.error('Error loading integration catalog:', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    res.json({ success: true, data: { categories } });
  });
});

// POST /api/integration/admin/products — replaces the entire catalog
// Body: { categories: [{ name, products: [{ name, imageUrl, productUrl }] }] }
router.post('/admin/products', authenticateToken, requireAdmin, async (req, res) => {
  const { categories } = req.body;

  if (!Array.isArray(categories)) {
    return res.status(400).json({ success: false, error: 'categories must be an array' });
  }
  for (const cat of categories) {
    if (!cat.name || !Array.isArray(cat.products)) {
      return res.status(400).json({ success: false, error: 'Each category needs a name and a products array' });
    }
    for (const p of cat.products) {
      if (!p.name || !p.productUrl) {
        return res.status(400).json({ success: false, error: 'Each product needs a name and a productUrl' });
      }
    }
  }

  const db = createDatabase();

  try {
    // integration_products.category_id has ON DELETE CASCADE, so this also
    // removes all products belonging to the deleted categories.
    await new Promise((resolve, reject) => {
      db.runCallback('DELETE FROM integration_categories', [], (err) => (err ? reject(err) : resolve()));
    });

    let catOrder = 0;
    for (const cat of categories) {
      const categoryId = await new Promise((resolve, reject) => {
        db.runCallback(
          'INSERT INTO integration_categories (name, order_index) VALUES (?, ?)',
          [cat.name, catOrder++],
          function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      let prodOrder = 0;
      for (const p of cat.products) {
        await new Promise((resolve, reject) => {
          db.runCallback(
            'INSERT INTO integration_products (category_id, name, image_url, product_url, order_index) VALUES (?, ?, ?, ?, ?)',
            [categoryId, p.name, p.imageUrl || null, p.productUrl, prodOrder++],
            (err) => (err ? reject(err) : resolve())
          );
        });
      }
    }

    db.close();
    res.json({ success: true, message: 'Catalog saved' });
  } catch (err) {
    db.close();
    console.error('Error saving integration catalog:', err);
    res.status(500).json({ success: false, error: 'Failed to save catalog' });
  }
});

module.exports = router;
