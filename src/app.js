// Express app configuration
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));

app.use(express.json());

const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/order');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const reviewRoutes = require('./routes/reviews');

app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/reviews', reviewRoutes);

module.exports = app;