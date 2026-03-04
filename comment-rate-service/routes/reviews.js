const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const ReviewReply = require('../models/ReviewReply');

// Create a new review
router.post('/reviews', async (req, res) => {
  try {
    const { book_id, customer_id, rating, comment, is_verified_purchase } = req.body;
    
    if (!book_id || !customer_id || !rating) {
      return res.status(400).json({
        error: 'book_id, customer_id, and rating are required'
      });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5'
      });
    }
    
    const review = await Review.create(
      book_id, 
      customer_id, 
      parseInt(rating), 
      comment || '', 
      is_verified_purchase || false
    );
    
    res.status(201).json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Get all reviews for a book
router.get('/reviews/book/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || 'recent'; // recent, helpful, rating_high, rating_low
    
    const reviews = await Review.findByBookId(bookId, page, limit, sort);
    const total = await Review.countByBookId(bookId);
    const averageData = await Review.getAverageRating(bookId);
    
    res.json({
      book_id: parseInt(bookId),
      total: total,
      average_rating: averageData.average_rating,
      page: page,
      limit: limit,
      reviews: reviews
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get average rating for a book
router.get('/reviews/book/:bookId/average', async (req, res) => {
  try {
    const { bookId } = req.params;
    const averageData = await Review.getAverageRating(bookId);
    res.json(averageData);
  } catch (error) {
    console.error('Error calculating average rating:', error);
    res.status(500).json({ error: 'Failed to calculate average rating' });
  }
});

// Get a single review by ID
router.get('/reviews/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    // Get replies for this review
    const replies = await ReviewReply.findByReviewId(reviewId);
    review.replies = replies;
    
    res.json(review);
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

// Update a review
router.put('/reviews/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    
    if (!rating || !comment) {
      return res.status(400).json({ error: 'rating and comment are required' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5'
      });
    }
    
    const review = await Review.update(reviewId, parseInt(rating), comment);
    res.json(review);
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: error.message || 'Failed to update review' });
  }
});

// Delete a review
router.delete('/reviews/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const deleted = await Review.delete(reviewId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// Upvote a review
router.post('/reviews/:reviewId/upvote', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.upvote(reviewId);
    
    res.json({
      review_id: review.review_id,
      upvotes: review.upvotes,
      message: 'Review upvoted successfully'
    });
  } catch (error) {
    console.error('Error upvoting review:', error);
    res.status(500).json({ error: error.message || 'Failed to upvote review' });
  }
});

// Downvote a review
router.post('/reviews/:reviewId/downvote', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.downvote(reviewId);
    
    res.json({
      review_id: review.review_id,
      downvotes: review.downvotes,
      message: 'Review downvoted successfully'
    });
  } catch (error) {
    console.error('Error downvoting review:', error);
    res.status(500).json({ error: error.message || 'Failed to downvote review' });
  }
});

// Add a reply to a review
router.post('/reviews/:reviewId/replies', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { customer_id, comment } = req.body;
    
    if (!customer_id || !comment) {
      return res.status(400).json({
        error: 'customer_id and comment are required'
      });
    }
    
    // Verify review exists
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    const reply = await ReviewReply.create(reviewId, customer_id, comment);
    res.status(201).json(reply);
  } catch (error) {
    console.error('Error creating reply:', error);
    res.status(500).json({ error: 'Failed to create reply' });
  }
});

// Get replies for a review
router.get('/reviews/:reviewId/replies', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const replies = await ReviewReply.findByReviewId(reviewId);
    
    res.json({
      review_id: parseInt(reviewId),
      total: replies.length,
      replies: replies
    });
  } catch (error) {
    console.error('Error fetching replies:', error);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// Get all reviews by a customer
router.get('/customers/:customerId/reviews', async (req, res) => {
  try {
    const { customerId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const reviews = await Review.findByCustomerId(customerId, limit, offset);
    
    res.json({
      customer_id: customerId,
      total: reviews.length,
      reviews: reviews
    });
  } catch (error) {
    console.error('Error fetching customer reviews:', error);
    res.status(500).json({ error: 'Failed to fetch customer reviews' });
  }
});

module.exports = router;
