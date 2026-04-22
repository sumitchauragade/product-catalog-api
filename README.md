# Product Catalog API

A RESTful API built with Node.js, Express, and PostgreSQL covering core e-commerce backend functionality.

## Tech Stack
- Node.js + Express
- PostgreSQL
- JWT Authentication
- bcrypt Password Hashing

## Features
- Product CRUD operations
- Order management with transaction-safe stock updates
- JWT-based authentication and protected routes
- Product reviews with average rating aggregation

## API Endpoints

### Auth
- POST /auth/register — Register a new user
- POST /auth/login — Login and receive JWT token

### Products
- GET /products — Get all products
- GET /products/:id — Get single product
- POST /products — Add a product
- PUT /products/:id — Update a product
- DELETE /products/:id — Delete a product

### Orders
- POST /orders — Place an order (auto-reduces stock)
- GET /orders — Get all orders with user and product details
- GET /orders/:id — Get single order
- GET /orders/user/:user_id — Get all orders by a user
- PATCH /orders/:id/cancel — Cancel order and restore stock

### Reviews
- POST /reviews — Add a review (protected)
- GET /reviews/product/:product_id — Get all reviews for a product
- GET /reviews/top-rated — Get top rated products
- PUT /reviews/:id — Edit your review (protected)
- DELETE /reviews/:id — Delete your review (protected)

### Profile
- GET /profile — Get your profile (protected)
- GET /profile/orders — Get your order history (protected)

## Key Concepts Implemented
- Database transactions for order + stock consistency
- JWT middleware for route protection
- Aggregations for average ratings
- Multi-table JOINs for enriched responses
- Parameterized queries to prevent SQL injection
- Connection pooling for performance