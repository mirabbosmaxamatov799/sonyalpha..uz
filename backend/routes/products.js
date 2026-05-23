const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/database');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads/products directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '-' + safeName);
  }
});
const upload = multer({ storage });

// GET /api/products — all products with filters
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { category, search, badge, sort, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT p.*, c.name_ru as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;
    const params = [];

    if (category) {
      sql += ' AND c.slug = ?';
      params.push(category);
    }
    if (badge) {
      sql += ' AND p.badge = ?';
      params.push(badge);
    }
    if (search) {
      sql += ' AND (p.name_ru LIKE ? OR p.model LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const sortMap = {
      price_asc:  'p.price ASC',
      price_desc: 'p.price DESC',
      newest:     'p.created_at DESC',
      popular:    'p.id ASC',
    };
    sql += ` ORDER BY ${sortMap[sort] || 'p.id ASC'}`;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const stmt = db.prepare(sql);
    const rows = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      row.specs = JSON.parse(row.specs || '{}');
      row.images = JSON.parse(row.images || '[]');
      rows.push(row);
    }
    stmt.free();

    res.json({ products: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:slug
router.get('/:slug', async (req, res) => {
  try {
    const db = await getDb();
    const stmt = db.prepare(`
      SELECT p.*, c.name_ru as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.is_active = 1
    `);
    stmt.bind([req.params.slug]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      row.specs = JSON.parse(row.specs || '{}');
      row.images = JSON.parse(row.images || '[]');
      stmt.free();

      // Related products (same category)
      const relStmt = db.prepare(`
        SELECT id, slug, name_ru, model, price, old_price, badge, images
        FROM products
        WHERE category_id = ? AND slug != ? AND is_active = 1
        LIMIT 4
      `);
      relStmt.bind([row.category_id, req.params.slug]);
      const related = [];
      while (relStmt.step()) {
        const r = relStmt.getAsObject();
        r.images = JSON.parse(r.images || '[]');
        related.push(r);
      }
      relStmt.free();

      res.json({ product: row, related });
    } else {
      stmt.free();
      res.status(404).json({ error: 'Товар не найден' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products — create (admin)
router.post('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { slug, category_id, name_ru, model, description_ru, price, old_price, stock, badge, specs } = req.body;
    db.run(
      'INSERT INTO products (slug,category_id,name_ru,model,description_ru,price,old_price,stock,badge,specs) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [slug, category_id, name_ru, model, description_ru, price, old_price || null, stock || 0, badge || '', JSON.stringify(specs || {})]
    );
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id — update (admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { name_ru, model, description_ru, price, old_price, stock, badge, specs, is_active } = req.body;
    db.run(
      `UPDATE products SET name_ru=?,model=?,description_ru=?,price=?,old_price=?,stock=?,badge=?,specs=?,is_active=? WHERE id=?`,
      [name_ru, model, description_ru, price, old_price || null, stock, badge || '', JSON.stringify(specs || {}), is_active ?? 1, req.params.id]
    );
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id (admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const db = await getDb();
    db.run('UPDATE products SET is_active=0 WHERE id=?', [req.params.id]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/:id/image — upload an image for a product (admin)
router.post('/:id/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const db = await getDb();
    const id = req.params.id;

    const stmt = db.prepare('SELECT images FROM products WHERE id=?');
    stmt.bind([id]);
    if (!stmt.step()) { stmt.free(); return res.status(404).json({ error: 'Product not found' }); }
    const row = stmt.getAsObject();
    stmt.free();

    const images = JSON.parse(row.images || '[]');
    const url = `/uploads/products/${req.file.filename}`;
    images.push(url);

    db.run('UPDATE products SET images=? WHERE id=?', [JSON.stringify(images), id]);
    saveDb();

    res.json({ success: true, url, images });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
