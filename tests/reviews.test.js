const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

let token;
let userId;

beforeAll(async () => {
  const register = await request(app)
    .post('/auth/register')
    .send({
      name: 'Review Test User',
      email: 'test_reviews@example.com',
      password: 'password123'
    });

  userId = register.body.user.id;

  const login = await request(app)
    .post('/auth/login')
    .send({ email: 'test_reviews@example.com', password: 'password123' });

  token = login.body.token;
});

afterAll(async () => {
  await pool.query('DELETE FROM reviews WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM users WHERE email = $1', ['test_reviews@example.com']);
  await pool.end();
});

describe('Reviews API', () => {

  describe('POST /reviews', () => {
    it('should add a review', async () => {
      const res = await request(app)
        .post('/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: 1, rating: 5, comment: 'Excellent product' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('review');
      expect(res.body.review.rating).toBe(5);
    });

    it('should reject duplicate review on same product', async () => {
      const res = await request(app)
        .post('/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: 1, rating: 3, comment: 'Changed my mind' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('You have already reviewed this product');
    });

    it('should reject review without token', async () => {
      const res = await request(app)
        .post('/reviews')
        .send({ product_id: 2, rating: 4, comment: 'Good' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /reviews/product/:id', () => {
    it('should return reviews with average rating', async () => {
      const res = await request(app).get('/reviews/product/1');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('average_rating');
      expect(res.body).toHaveProperty('total_reviews');
      expect(Array.isArray(res.body.reviews)).toBe(true);
    });
  });

  describe('GET /reviews/top-rated', () => {
    it('should return products ordered by rating', async () => {
      const res = await request(app).get('/reviews/top-rated');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('average_rating');
    });
  });
});