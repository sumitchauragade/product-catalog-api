// Test setup file
const pool = require('../src/db');

// Clean up database before each test suite
beforeAll(async () => {
  await pool.query('DELETE FROM reviews');
  await pool.query('DELETE FROM orders');
  await pool.query('DELETE FROM users WHERE email LIKE $1', ['test_%']);
});

// Close database connection after all tests
afterAll(async () => {
  await pool.end();
});