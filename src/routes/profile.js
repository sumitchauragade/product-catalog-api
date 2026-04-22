const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

// GET — Protected profile route
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET — Protected orders history
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        orders.id AS order_id,
        products.name AS product_name,
        orders.quantity,
        orders.total_price,
        orders.status,
        orders.created_at
      FROM orders
      INNER JOIN products ON orders.product_id = products.id
      WHERE orders.user_id = $1
      ORDER BY orders.created_at DESC
    `, [req.user.id]);

    res.json({ orders: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;