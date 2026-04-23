const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

let token;
let userId;
let testProductId;

beforeAll(async () => {
  // Register and login test user
  const register = await request(app)
    .post('/auth/register')
    .send({
      name: 'Order Test User',
      email: 'test_orders@example.com',
      password: 'password123'
    });

  userId = register.body.user.id;

  const login = await request(app)
    .post('/auth/login')
    .send({ email: 'test_orders@example.com', password: 'password123' });

  token = login.body.token;

  // Create a test product
  const product = await request(app)
    .post('/products')
    .send({ name: 'Test Order Product', category: 'Accessories', price: 25.00, stock: 10 });

  testProductId = product.body.id;
});

afterAll(async () => {
  await pool.query('DELETE FROM orders WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM products WHERE id = $1', [testProductId]);
  await pool.query('DELETE FROM users WHERE email = $1', ['test_orders@example.com']);
  await pool.end();
});

describe('Orders API', () => {

  describe('POST /orders', () => {
    it('should place an order and reduce stock', async () => {
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_id: userId, product_id: testProductId, quantity: 2 });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('order');
      expect(res.body.order.quantity).toBe(2);
      expect(parseFloat(res.body.total_price)).toBe(50.00);

      // Verify stock reduced
      const product = await request(app).get(`/products/${testProductId}`);
      expect(product.body.stock).toBe(8);
    });

    it('should reject order with insufficient stock', async () => {
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_id: userId, product_id: testProductId, quantity: 99999 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Insufficient stock');
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_id: userId, product_id: 99999, quantity: 1 });

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /orders/:id/cancel', () => {
    it('should cancel order and restore stock', async () => {
      // Place an order first
      const order = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_id: userId, product_id: testProductId, quantity: 1 });

      const stockBefore = (await request(app).get(`/products/${testProductId}`)).body.stock;

      const res = await request(app)
        .patch(`/orders/${order.body.order.id}/cancel`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Order cancelled and stock restored');

      // Verify stock restored
      const stockAfter = (await request(app).get(`/products/${testProductId}`)).body.stock;
      expect(stockAfter).toBe(stockBefore + 1);
    });

    it('should reject cancelling already cancelled order', async () => {
      const order = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_id: userId, product_id: testProductId, quantity: 1 });

      await request(app).patch(`/orders/${order.body.order.id}/cancel`);

      const res = await request(app)
        .patch(`/orders/${order.body.order.id}/cancel`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Order is already cancelled');
    });
  });
});