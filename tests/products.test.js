const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

afterAll(async () => {
  await pool.end();
});

describe('Products API', () => {

  describe('GET /products', () => {
    it('should return all products', async () => {
      const res = await request(app).get('/products');
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should return products with correct fields', async () => {
      const res = await request(app).get('/products');
      const product = res.body[0];

      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('category');
      expect(product).toHaveProperty('price');
      expect(product).toHaveProperty('stock');
    });
  });

  describe('GET /products/:id', () => {
    it('should return a single product', async () => {
      const res = await request(app).get('/products/1');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 1);
      expect(res.body).toHaveProperty('name');
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app).get('/products/99999');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Product not found');
    });
  });

  describe('POST /products', () => {
    it('should create a new product', async () => {
      const newProduct = {
        name: 'Test Running Shoe',
        category: 'Footwear',
        price: 89.99,
        stock: 50
      };

      const res = await request(app)
        .post('/products')
        .send(newProduct);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe(newProduct.name);
      expect(parseFloat(res.body.price)).toBe(newProduct.price);

      // Cleanup
      await pool.query('DELETE FROM products WHERE name = $1', ['Test Running Shoe']);
    });
  });

  describe('PUT /products/:id', () => {
    it('should update an existing product', async () => {
      const updated = {
        name: 'Updated Shoe',
        category: 'Footwear',
        price: 99.99,
        stock: 100
      };

      const res = await request(app)
        .put('/products/1')
        .send(updated);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Shoe');
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .put('/products/99999')
        .send({ name: 'X', category: 'X', price: 1, stock: 1 });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete a product', async () => {
      // Create a product to delete
      const created = await request(app)
        .post('/products')
        .send({ name: 'To Delete', category: 'Accessories', price: 9.99, stock: 5 });

      const res = await request(app)
        .delete(`/products/${created.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Product deleted');
    });

    it('should return 404 when deleting non-existent product', async () => {
      const res = await request(app).delete('/products/99999');
      expect(res.status).toBe(404);
    });
  });
});