const { pool } = require('../config/database');

class Review {
  // Create a new review
  static async create(bookId, customerId, rating, comment, isVerifiedPurchase = false) {
    const [result] = await pool.query(
      'INSERT INTO reviews (book_id, customer_id, rating, comment, is_verified_purchase) VALUES (?, ?, ?, ?, ?)',
      [bookId, customerId, rating, comment, isVerifiedPurchase]
    );
    
    return {
      review_id: result.insertId,
      book_id: bookId,
      customer_id: customerId,
      rating: rating,
      comment: comment,
      is_verified_purchase: isVerifiedPurchase,
      upvotes: 0,
      downvotes: 0,
      created_at: new Date()
    };
  }
  
  // Get all reviews for a book
  static async findByBookId(bookId, page = 1, limit = 10, sort = 'recent') {
    const offset = (page - 1) * limit;
    let orderBy = 'created_at DESC';
    
    if (sort === 'helpful') {
      orderBy = '(upvotes - downvotes) DESC, created_at DESC';
    } else if (sort === 'rating_high') {
      orderBy = 'rating DESC, created_at DESC';
    } else if (sort === 'rating_low') {
      orderBy = 'rating ASC, created_at DESC';
    }
    
    const [rows] = await pool.query(
      `SELECT id as review_id, book_id, customer_id, rating, comment, 
              is_verified_purchase, upvotes, downvotes, created_at, updated_at
       FROM reviews 
       WHERE book_id = ? 
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [bookId, limit, offset]
    );
    return rows;
  }
  
  // Get all reviews by a customer
  static async findByCustomerId(customerId, limit = 100, offset = 0) {
    const [rows] = await pool.query(
      `SELECT id as review_id, book_id, customer_id, rating, comment, 
              is_verified_purchase, upvotes, downvotes, created_at, updated_at
       FROM reviews 
       WHERE customer_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [customerId, limit, offset]
    );
    return rows;
  }
  
  // Get a single review by ID
  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT id as review_id, book_id, customer_id, rating, comment, 
              is_verified_purchase, upvotes, downvotes, created_at, updated_at
       FROM reviews WHERE id = ?`,
      [id]
    );
    return rows[0];
  }
  
  // Update a review
  static async update(id, rating, comment) {
    const [result] = await pool.query(
      'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
      [rating, comment, id]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('Review not found');
    }
    
    return this.findById(id);
  }
  
  // Delete a review
  static async delete(id) {
    const [result] = await pool.query('DELETE FROM reviews WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
  
  // Get review count for a book
  static async countByBookId(bookId) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) as count FROM reviews WHERE book_id = ?',
      [bookId]
    );
    return rows[0].count;
  }
  
  // Get average rating for a book
  static async getAverageRating(bookId) {
    const [rows] = await pool.query(
      `SELECT 
        AVG(rating) as average_rating, 
        COUNT(*) as total_reviews,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
       FROM reviews 
       WHERE book_id = ?`,
      [bookId]
    );
    
    const result = rows[0];
    return {
      book_id: parseInt(bookId),
      average_rating: parseFloat(result.average_rating) || 0,
      total_reviews: parseInt(result.total_reviews) || 0,
      rating_distribution: {
        5: parseInt(result.five_star) || 0,
        4: parseInt(result.four_star) || 0,
        3: parseInt(result.three_star) || 0,
        2: parseInt(result.two_star) || 0,
        1: parseInt(result.one_star) || 0
      }
    };
  }
  
  // Upvote a review
  static async upvote(id) {
    const [result] = await pool.query(
      'UPDATE reviews SET upvotes = upvotes + 1 WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('Review not found');
    }
    
    return this.findById(id);
  }
  
  // Downvote a review
  static async downvote(id) {
    const [result] = await pool.query(
      'UPDATE reviews SET downvotes = downvotes + 1 WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('Review not found');
    }
    
    return this.findById(id);
  }
}

module.exports = Review;
