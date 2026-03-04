const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');

// Create a new comment for a book
router.post('/books/:bookId/comments', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { customer_id, content } = req.body;
    
    if (!customer_id || !content) {
      return res.status(400).json({
        error: 'customer_id and content are required'
      });
    }
    
    const comment = await Comment.create(bookId, customer_id, content);
    res.status(201).json({
      message: 'Comment created successfully',
      comment: comment
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Get all comments for a book
router.get('/books/:bookId/comments', async (req, res) => {
  try {
    const { bookId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const comments = await Comment.findByBookId(bookId, limit, offset);
    const count = await Comment.countByBookId(bookId);
    
    res.json({
      book_id: bookId,
      total: count,
      limit: limit,
      offset: offset,
      comments: comments
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Get all comments by a customer
router.get('/customers/:customerId/comments', async (req, res) => {
  try {
    const { customerId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const comments = await Comment.findByCustomerId(customerId, limit, offset);
    
    res.json({
      customer_id: customerId,
      total: comments.length,
      limit: limit,
      offset: offset,
      comments: comments
    });
  } catch (error) {
    console.error('Error fetching customer comments:', error);
    res.status(500).json({ error: 'Failed to fetch customer comments' });
  }
});

// Get a single comment
router.get('/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    res.json({ comment: comment });
  } catch (error) {
    console.error('Error fetching comment:', error);
    res.status(500).json({ error: 'Failed to fetch comment' });
  }
});

// Update a comment
router.put('/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }
    
    const comment = await Comment.update(id, content);
    res.json({
      message: 'Comment updated successfully',
      comment: comment
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: error.message || 'Failed to update comment' });
  }
});

// Delete a comment
router.delete('/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Comment.delete(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;
