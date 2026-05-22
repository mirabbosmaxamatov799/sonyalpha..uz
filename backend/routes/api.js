const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/database');
const auth = require('../middleware/auth');

// ── CATEGORIES ──────────────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM categories ORDER BY sort_order');
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    res.json({ categories: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── ORDERS ──────────────────────────────────────────────
router.post('/orders', async (req, res) => {
  try {
    const db = await getDb();
    const { customer_name, customer_phone, customer_email, delivery_address, delivery_type, items, total, notes } = req.body;

    if (!customer_name || !customer_phone || !items || !total) {
      return res.status(400).json({ error: 'Заполните обязательные поля' });
    }

    const orderNumber = 'SA-' + Date.now().toString().slice(-8);
    db.run(
      `INSERT INTO orders (order_number,customer_name,customer_phone,customer_email,delivery_address,delivery_type,items,total,notes)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [orderNumber, customer_name, customer_phone, customer_email || '', delivery_address || '', delivery_type || 'pickup', JSON.stringify(items), total, notes || '']
    );
    saveDb();
    res.json({ success: true, order_number: orderNumber });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orders — admin only
router.get('/orders', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { status } = req.query;
    let sql = 'SELECT * FROM orders';
    const params = [];
    if (status) { sql += ' WHERE status=?'; params.push(status); }
    sql += ' ORDER BY created_at DESC';
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      row.items = JSON.parse(row.items || '[]');
      rows.push(row);
    }
    stmt.free();
    res.json({ orders: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/orders/:id/status — admin
router.patch('/orders/:id/status', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { status } = req.body;
    const allowed = ['new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Недопустимый статус' });
    db.run('UPDATE orders SET status=? WHERE id=?', [status, req.params.id]);
    saveDb();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── NEWS ─────────────────────────────────────────────────
router.get('/news', async (req, res) => {
  try {
    const db = await getDb();
    const stmt = db.prepare('SELECT id,slug,title_ru,excerpt_ru,image,created_at FROM news WHERE is_published=1 ORDER BY created_at DESC');
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    res.json({ news: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/news/:slug', async (req, res) => {
  try {
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM news WHERE slug=? AND is_published=1');
    stmt.bind([req.params.slug]);
    if (stmt.step()) { res.json({ article: stmt.getAsObject() }); }
    else { res.status(404).json({ error: 'Статья не найдена' }); }
    stmt.free();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/news', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { slug, title_ru, excerpt_ru, body_ru, image } = req.body;
    db.run('INSERT INTO news (slug,title_ru,excerpt_ru,body_ru,image) VALUES (?,?,?,?,?)',
      [slug, title_ru, excerpt_ru, body_ru, image || null]);
    saveDb();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/news/:id', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { title_ru, excerpt_ru, body_ru, image, is_published } = req.body;
    db.run('UPDATE news SET title_ru=?,excerpt_ru=?,body_ru=?,image=?,is_published=? WHERE id=?',
      [title_ru, excerpt_ru, body_ru, image || null, is_published ?? 1, req.params.id]);
    saveDb();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── AUTH ─────────────────────────────────────────────────
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'sonyalpha_secret_2025';

router.post('/auth/login', async (req, res) => {
  try {
    const db = await getDb();
    const { username, password } = req.body;
    const stmt = db.prepare('SELECT * FROM admins WHERE username=?');
    stmt.bind([username]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    const admin = stmt.getAsObject();
    stmt.free();
    const valid = bcrypt.compareSync(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Неверный логин или пароль' });
    const token = jwt.sign({ id: admin.id, username: admin.username }, SECRET, { expiresIn: '24h' });
    res.json({ token, username: admin.username });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── STATS (admin dashboard) ──────────────────────────────
router.get('/stats', auth, async (req, res) => {
  try {
    const db = await getDb();
    const q = (sql) => {
      const s = db.prepare(sql);
      s.step();
      const r = s.getAsObject();
      s.free();
      return r;
    };
    res.json({
      products:  q('SELECT COUNT(*) as count FROM products WHERE is_active=1').count,
      orders:    q('SELECT COUNT(*) as count FROM orders').count,
      new_orders:q('SELECT COUNT(*) as count FROM orders WHERE status="new"').count,
      revenue:   q('SELECT COALESCE(SUM(total),0) as sum FROM orders WHERE status NOT IN ("cancelled")').sum,
      news:      q('SELECT COUNT(*) as count FROM news WHERE is_published=1').count,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
