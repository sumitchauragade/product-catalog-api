const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST — Place an order
router.post('/', async (req, res) => {
  const { user_id, product_id, quantity } = req.body;
  const client = await pool.connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    // Step 1: Check if product exists and has enough stock
    const productResult = await client.query(
      'SELECT * FROM products WHERE id = $1',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productResult.rows[0];

    if (product.stock < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Insufficient stock',
        available_stock: product.stock 
      });
    }

    // Step 2: Calculate total price
    const total_price = product.price * quantity;

    // Step 3: Create the order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, product_id, quantity, total_price)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, product_id, quantity, total_price]
    );

    // Step 4: Reduce stock
    await client.query(
      'UPDATE products SET stock = stock - $1 WHERE id = $2',
      [quantity, product_id]
    );

    // All steps passed — save everything
    await client.query('COMMIT');

    res.status(201).json({
      message: 'Order placed successfully',
      order: orderResult.rows[0],
      product: product.name,
      total_price
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET — All orders with user and product details
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        orders.id AS order_id,
        users.name AS customer_name,
        users.email,
        products.name AS product_name,
        products.category,
        orders.quantity,
        orders.total_price,
        orders.status,
        orders.created_at
      FROM orders
      INNER JOIN users ON orders.user_id = users.id
      INNER JOIN products ON orders.product_id = products.id
      ORDER BY orders.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET — Single order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        orders.id AS order_id,
        users.name AS customer_name,
        users.email,
        products.name AS product_name,
        orders.quantity,
        orders.total_price,
        orders.status,
        orders.created_at
      FROM orders
      INNER JOIN users ON orders.user_id = users.id
      INNER JOIN products ON orders.product_id = products.id
      WHERE orders.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET — All orders by a specific user
router.get('/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await pool.query(`
      SELECT 
        orders.id AS order_id,
        products.name AS product_name,
        products.category,
        orders.quantity,
        orders.total_price,
        orders.status,
        orders.created_at
      FROM orders
      INNER JOIN products ON orders.product_id = products.id
      WHERE orders.user_id = $1
      ORDER BY orders.created_at DESC
    `, [user_id]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH — Cancel an order and restore stock
router.patch('/:id/cancel', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check order exists and is not already cancelled
    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1', [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order is already cancelled' });
    }

    // Update order status
    await client.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      ['cancelled', order.id]
    );

    // Restore stock
    await client.query(
      'UPDATE products SET stock = stock + $1 WHERE id = $2',
      [order.quantity, order.product_id]
    );

    await client.query('COMMIT');

    res.json({ message: 'Order cancelled and stock restored' });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;