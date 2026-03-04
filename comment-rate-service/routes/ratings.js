const express = require('express');
const router = express.Router();
const Rating = require('../models/Rating');

// Create or update a rating for a book
router.post('/books/:bookId/ratings', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { customer_id, rating } = req.body;
    
    if (!customer_id || rating === undefined) {
      return res.status(400).json({
        error: 'customer_id and rating are required'
      });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5'
      });
    }
    
    const ratingData = await Rating.createOrUpdate(bookId, customer_id, parseInt(rating));
    res.status(201).json({
      message: 'Rating saved successfully',
      rating: ratingData
    });
  } catch (error) {
    console.error('Error creating rating:', error);
    res.status(500).json({ error: error.message || 'Failed to create rating' });
  }
});

// Get all ratings for a book
router.get('/books/:bookId/ratings', async (req, res) => {
  try {
    const { bookId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const ratings = await Rating.findByBookId(bookId, limit, offset);
    
    res.json({
      book_id: bookId,
      total: ratings.length,
      limit: limit,
      offset: offset,
      ratings: ratings
    });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

// Get average rating for a book
router.get('/books/:bookId/ratings/average', async (req, res) => {
  try {
    const { bookId } = req.params;
    const averageData = await Rating.getAverageRating(bookId);
    res.json(averageData);
  } catch (error) {
    console.error('Error calculating average rating:', error);
    res.status(500).json({ error: 'Failed to calculate average rating' });
  }
});

// Get all ratings by a customer
router.get('/customers/:customerId/ratings', async (req, res) => {
  try {
    const { customerId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const ratings = await Rating.findByCustomerId(customerId, limit, offset);
    
    res.json({
      customer_id: customerId,
      total: ratings.length,
      limit: limit,
      offset: offset,
      ratings: ratings
    });
  } catch (error) {
    console.error('Error fetching customer ratings:', error);
    res.status(500).json({ error: 'Failed to fetch customer ratings' });
  }
});

// Get a specific rating by book and customer
router.get('/books/:bookId/customers/:customerId/rating', async (req, res) => {
  try {
    const { bookId, customerId } = req.params;
    const rating = await Rating.findByBookAndCustomer(bookId, customerId);
    
    if (!rating) {
      return res.status(404).json({ error: 'Rating not found' });
    }
    
    res.json({ rating: rating });
  } catch (error) {
    console.error('Error fetching rating:', error);
    res.status(500).json({ error: 'Failed to fetch rating' });
  }
});

// Delete a rating
router.delete('/books/:bookId/customers/:customerId/rating', async (req, res) => {
  try {
    const { bookId, customerId } = req.params;
    const deleted = await Rating.delete(bookId, customerId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Rating not found' });
    }
    
    res.json({ message: 'Rating deleted successfully' });
  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({ error: 'Failed to delete rating' });
  }
});

module.exports = router;
