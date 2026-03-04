const { pool } = require('../config/database');

class ReviewReply {
  // Create a reply to a review
  static async create(reviewId, customerId, comment) {
    const [result] = await pool.query(
      'INSERT INTO review_replies (review_id, customer_id, comment) VALUES (?, ?, ?)',
      [reviewId, customerId, comment]
    );
    
    return {
      reply_id: result.insertId,
      review_id: reviewId,
      customer_id: customerId,
      comment: comment,
      created_at: new Date()
    };
  }
  
  // Get all replies for a review
  static async findByReviewId(reviewId) {
    const [rows] = await pool.query(
      `SELECT id as reply_id, review_id, customer_id, comment, created_at
       FROM review_replies 
       WHERE review_id = ? 
       ORDER BY created_at ASC`,
      [reviewId]
    );
    return rows;
  }
  
  // Delete a reply
  static async delete(id) {
    const [result] = await pool.query('DELETE FROM review_replies WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = ReviewReply;
