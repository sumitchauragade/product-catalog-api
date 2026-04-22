const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

// POST — Add a review (protected)
router.post('/', authenticateToken, async (req, res) => {
  const { product_id, rating, comment } = req.body;
  const user_id = req.user.id;

  try {
    // Check product exists
    const product = await pool.query(
      'SELECT * FROM products WHERE id = $1', [product_id]
    );

    if (product.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if user already reviewed this product
    const existing = await pool.query(
      'SELECT * FROM reviews WHERE user_id = $1 AND product_id = $2',
      [user_id, product_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        error: 'You have already reviewed this product' 
      });
    }

    // Insert review
    const result = await pool.query(
      `INSERT INTO reviews (user_id, product_id, rating, comment)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, product_id, rating, comment]
    );

    res.status(201).json({
      message: 'Review added successfully',
      review: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET — All reviews for a product with user details and average rating
router.get('/product/:product_id', async (req, res) => {
  const { product_id } = req.params;

  try {
    // Get all reviews with user name
    const reviews = await pool.query(`
      SELECT
        reviews.id,
        users.name AS reviewer,
        reviews.rating,
        reviews.comment,
        reviews.created_at
      FROM reviews
      INNER JOIN users ON reviews.user_id = users.id
      WHERE reviews.product_id = $1
      ORDER BY reviews.created_at DESC
    `, [product_id]);

    // Get average rating and total review count
    const stats = await pool.query(`
      SELECT
        ROUND(AVG(rating), 1) AS average_rating,
        COUNT(*) AS total_reviews
      FROM reviews
      WHERE product_id = $1
    `, [product_id]);

    res.json({
      product_id: parseInt(product_id),
      average_rating: stats.rows[0].average_rating || 0,
      total_reviews: parseInt(stats.rows[0].total_reviews),
      reviews: reviews.rows
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET — Top rated products
router.get('/top-rated', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        products.id,
        products.name,
        products.category,
        products.price,
        ROUND(AVG(reviews.rating), 1) AS average_rating,
        COUNT(reviews.id) AS total_reviews
      FROM products
      LEFT JOIN reviews ON products.id = reviews.product_id
      GROUP BY products.id
      ORDER BY average_rating DESC NULLS LAST
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT — Edit your own review (protected)
router.put('/:id', authenticateToken, async (req, res) => {
  const { rating, comment } = req.body;
  const user_id = req.user.id;

  try {
    // Check review exists and belongs to this user
    const existing = await pool.query(
      'SELECT * FROM reviews WHERE id = $1', [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (existing.rows[0].user_id !== user_id) {
      return res.status(403).json({ 
        error: 'You can only edit your own reviews' 
      });
    }

    const result = await pool.query(
      `UPDATE reviews SET rating = $1, comment = $2 
       WHERE id = $3 RETURNING *`,
      [rating, comment, req.params.id]
    );

    res.json({
      message: 'Review updated',
      review: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE — Delete your own review (protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  const user_id = req.user.id;

  try {
    const existing = await pool.query(
      'SELECT * FROM reviews WHERE id = $1', [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (existing.rows[0].user_id !== user_id) {
      return res.status(403).json({ 
        error: 'You can only delete your own reviews' 
      });
    }

    await pool.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);

    res.json({ message: 'Review deleted successfully' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;