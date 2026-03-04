import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
  Rating,
  Chip,
  Paper,
  Avatar,
  TextField,
  CircularProgress,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  ShoppingCart as ShoppingCartIcon,
  LocalShipping as ShippingIcon,
  Verified as VerifiedIcon,
  ThumbUp as ThumbUpIcon,
} from '@mui/icons-material';
import { bookService, reviewService, recommendationService } from '../services/api';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

const BookDetail = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { showSuccess, showError } = useNotification();

  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [similarBooks, setSimilarBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchBookData();
  }, [bookId]);

  const fetchBookData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch book details
      const bookData = await bookService.getBookDetail(bookId);
      setBook(bookData);

      // Fetch reviews
      const reviewsData = await reviewService.getBookReviews(bookId, 1, 5);
      setReviews(reviewsData.reviews || []);
      setAvgRating(reviewsData);

      // Fetch similar books
      try {
        const similarData = await recommendationService.getSimilarBooks(bookId, 4);
        setSimilarBooks(similarData.similar_books || []);
      } catch (err) {
        console.log('Similar books not available');
      }
    } catch (err) {
      console.error('Error fetching book:', err);
      setError('Failed to load book details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const result = await addToCart(book.id, 1);
    if (result.success) {
      showSuccess(`"${book.title}" added to cart!`);
    } else {
      showError(result.error || 'Failed to add to cart');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!newReview.comment.trim()) {
      showError('Please write a comment');
      return;
    }

    try {
      setSubmittingReview(true);
      await reviewService.createReview(
        bookId,
        user.id,
        newReview.rating,
        newReview.comment,
        false
      );
      showSuccess('Review submitted successfully!');
      setNewReview({ rating: 5, comment: '' });
      fetchBookData(); // Refresh reviews
    } catch (err) {
      showError('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleUpvoteReview = async (reviewId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      await reviewService.upvoteReview(reviewId);
      showSuccess('Review upvoted!');
      fetchBookData();
    } catch (err) {
      showError('Failed to upvote review');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={500} />
          </Grid>
          <Grid item xs={12} md={8}>
            <Skeleton variant="text" height={60} />
            <Skeleton variant="text" height={40} />
            <Skeleton variant="text" />
            <Skeleton variant="text" />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error || !book) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Book not found'}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Book Details */}
      <Grid container spacing={4}>
        {/* Book Cover */}
        <Grid item xs={12} md={4}>
          <Card>
            <Box
              component="img"
              src={
                book.cover_image_url ||
                `https://via.placeholder.com/400x600/1976d2/ffffff?text=${encodeURIComponent(
                  book.title
                )}`
              }
              alt={book.title}
              sx={{
                width: '100%',
                height: 'auto',
                maxHeight: 600,
                objectFit: 'cover',
              }}
            />
          </Card>
        </Grid>

        {/* Book Info */}
        <Grid item xs={12} md={8}>
          <Typography variant="h3" fontWeight={700} gutterBottom>
            {book.title}
          </Typography>
          
          <Typography variant="h6" color="text.secondary" gutterBottom>
            by {book.author}
          </Typography>

          {/* Rating */}
          {avgRating && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Rating value={avgRating.average_rating || 0} precision={0.1} readOnly />
              <Typography variant="body1" sx={{ ml: 1 }}>
                {avgRating.average_rating?.toFixed(1)} ({avgRating.total_reviews} reviews)
              </Typography>
            </Box>
          )}

          {/* Price & Stock */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Typography variant="h4" color="primary" fontWeight={700}>
              ${book.price?.toFixed(2)}
            </Typography>
            {book.stock_quantity > 0 ? (
              <Chip label={`${book.stock_quantity} in stock`} color="success" />
            ) : (
              <Chip label="Out of Stock" color="error" />
            )}
          </Box>

          {/* Add to Cart Button */}
          <Button
            variant="contained"
            size="large"
            startIcon={<ShoppingCartIcon />}
            onClick={handleAddToCart}
            disabled={book.stock_quantity === 0}
            sx={{ mb: 3 }}
          >
            Add to Cart
          </Button>

          <Divider sx={{ my: 3 }} />

          {/* Book Details */}
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Book Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                ISBN
              </Typography>
              <Typography variant="body1">{book.isbn}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Publisher
              </Typography>
              <Typography variant="body1">{book.publisher}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Publication Year
              </Typography>
              <Typography variant="body1">{book.publication_year}</Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Description */}
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Description
          </Typography>
          <Typography variant="body1" paragraph>
            {book.description || 'No description available.'}
          </Typography>

          {/* Shipping Info */}
          <Paper sx={{ p: 2, bgcolor: 'grey.50', mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShippingIcon color="primary" />
              <Typography variant="body2">
                Free shipping on orders over $50
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Reviews Section */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Customer Reviews
        </Typography>

        {/* Submit Review Form */}
        {isAuthenticated && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Write a Review
            </Typography>
            <Box component="form" onSubmit={handleSubmitReview}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Rating
                </Typography>
                <Rating
                  value={newReview.rating}
                  onChange={(e, value) => setNewReview({ ...newReview, rating: value })}
                  size="large"
                />
              </Box>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Your Review"
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                placeholder="Share your thoughts about this book..."
                sx={{ mb: 2 }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={submittingReview}
              >
                {submittingReview ? <CircularProgress size={24} /> : 'Submit Review'}
              </Button>
            </Box>
          </Paper>
        )}

        {/* Reviews List */}
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <Paper key={review.review_id} sx={{ p: 3, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <Avatar sx={{ mr: 2 }}>{review.customer_name?.[0] || 'U'}</Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {review.customer_name || 'Anonymous'}
                    </Typography>
                    {review.is_verified_purchase && (
                      <Chip
                        icon={<VerifiedIcon />}
                        label="Verified Purchase"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  <Rating value={review.rating} readOnly size="small" />
                </Box>
              </Box>
              <Typography variant="body1" paragraph>
                {review.comment}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  size="small"
                  startIcon={<ThumbUpIcon />}
                  onClick={() => handleUpvoteReview(review.review_id)}
                >
                  Helpful ({review.upvotes || 0})
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {new Date(review.created_at).toLocaleDateString()}
                </Typography>
              </Box>
            </Paper>
          ))
        ) : (
          <Typography variant="body1" color="text.secondary">
            No reviews yet. Be the first to review this book!
          </Typography>
        )}
      </Box>

      {/* Similar Books */}
      {similarBooks.length > 0 && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Similar Books
          </Typography>
          <Grid container spacing={3}>
            {similarBooks.map((similarBook) => (
              <Grid item xs={6} sm={4} md={3} key={similarBook.book_id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 6 },
                  }}
                  onClick={() => navigate(`/books/${similarBook.book_id}`)}
                >
                  <Box
                    component="img"
                    src={`https://via.placeholder.com/200x280/1976d2/ffffff?text=${encodeURIComponent(
                      similarBook.title
                    )}`}
                    alt={similarBook.title}
                    sx={{ width: '100%', height: 200, objectFit: 'cover' }}
                  />
                  <CardContent>
                    <Typography variant="subtitle2" noWrap>
                      {similarBook.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {similarBook.author}
                    </Typography>
                    <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                      ${similarBook.price?.toFixed(2)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Container>
  );
};

export default BookDetail;
