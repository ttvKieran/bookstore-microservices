require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { pool, initializeDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
const reviewRoutes = require('./routes/reviews');

app.use('/', reviewRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'comment-rate-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const [reviewCount] = await pool.query('SELECT COUNT(*) as count FROM reviews');
    const [avgRating] = await pool.query('SELECT AVG(rating) as avg FROM reviews');
    const [totalUpvotes] = await pool.query('SELECT SUM(upvotes) as total FROM reviews');
    const [replyCount] = await pool.query('SELECT COUNT(*) as count FROM review_replies');
    
    res.json({
      timestamp: new Date().toISOString(),
      total_reviews: reviewCount[0].count,
      total_replies: replyCount[0].count,
      average_rating_across_all_books: parseFloat(avgRating[0].avg) || 0,
      total_upvotes: parseInt(totalUpvotes[0].total) || 0,
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Comment and Rating Service',
    version: '1.0.0',
    endpoints: {
      reviews: {
        create: 'POST /reviews',
        getByBook: 'GET /reviews/book/:bookId',
        getAverage: 'GET /reviews/book/:bookId/average',
        getById: 'GET /reviews/:reviewId',
        update: 'PUT /reviews/:reviewId',
        delete: 'DELETE /reviews/:reviewId',
        upvote: 'POST /reviews/:reviewId/upvote',
        downvote: 'POST /reviews/:reviewId/downvote',
        getByCustomer: 'GET /customers/:customerId/reviews'
      },
      replies: {
        create: 'POST /reviews/:reviewId/replies',
        getByReview: 'GET /reviews/:reviewId/replies'
      },
      system: {
        health: 'GET /health',
        metrics: 'GET /metrics'
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('🔄 Initializing database connection...');
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`✅ Comment-Rate Service is running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server...');
  await pool.end();
  process.exit(0);
});

startServer();
