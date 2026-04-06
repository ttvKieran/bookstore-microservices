import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCheck, Loader2, ShoppingCart, Star, ThumbsUp, Truck } from 'lucide-react';
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

  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchBookData = async () => {
    try {
      setLoading(true);
      setError('');
      const bookData = await bookService.getBookDetail(bookId);
      setBook(bookData);

      const reviewsData = await reviewService.getBookReviews(bookId, 1, 5);
      setReviews(reviewsData.reviews || []);
      setAvgRating(reviewsData);

      try {
        const similarData = await recommendationService.getSimilarBooks(bookId, 4);
        setSimilarBooks(similarData.similar_books || []);
      } catch {
        setSimilarBooks([]);
      }
    } catch (err) {
      setError('Failed to load book details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookData();
  }, [bookId]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) return navigate('/login');
    const result = await addToCart(book.id, 1);
    if (result.success) showSuccess(`"${book.title}" added to cart!`);
    else showError(result.error || 'Failed to add to cart');
  };

  const handleSubmitReview = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) return navigate('/login');
    if (!newReview.comment.trim()) return showError('Please write a comment');

    try {
      setSubmittingReview(true);
      await reviewService.createReview(bookId, user.id, newReview.rating, newReview.comment, false);
      showSuccess('Review submitted successfully!');
      setNewReview({ rating: 5, comment: '' });
      fetchBookData();
    } catch {
      showError('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleUpvoteReview = async (reviewId) => {
    if (!isAuthenticated) return navigate('/login');
    try {
      await reviewService.upvoteReview(reviewId);
      showSuccess('Review upvoted!');
      fetchBookData();
    } catch {
      showError('Failed to upvote review');
    }
  };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (error || !book) return <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error || 'Book not found'}</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <img src={book.cover_image_url || `https://via.placeholder.com/400x600/1976d2/ffffff?text=${encodeURIComponent(book.title)}`} alt={book.title} className="w-full rounded-xl border border-slate-200 object-cover shadow-sm" />
        </div>
        <div className="space-y-3 lg:col-span-8">
          <h1 className="text-4xl font-bold text-slate-900">{book.title}</h1>
          <p className="text-lg text-slate-600">by {book.author}</p>

          {avgRating && <p className="inline-flex items-center gap-1 text-sm text-slate-700"><Star className="h-4 w-4 fill-amber-400 text-amber-500" /> {avgRating.average_rating?.toFixed(1) || 0} ({avgRating.total_reviews} reviews)</p>}

          <div className="flex flex-wrap items-center gap-2">
            <p className="text-3xl font-bold text-blue-600">${book.price?.toFixed(2)}</p>
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${book.stock_quantity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {book.stock_quantity > 0 ? `${book.stock_quantity} in stock` : 'Out of Stock'}
            </span>
          </div>

          <button onClick={handleAddToCart} disabled={book.stock_quantity === 0} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
            <ShoppingCart className="h-4 w-4" /> Add to Cart
          </button>

          <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
            <div><p className="text-slate-500">ISBN</p><p className="font-medium text-slate-900">{book.isbn}</p></div>
            <div><p className="text-slate-500">Publisher</p><p className="font-medium text-slate-900">{book.publisher}</p></div>
            <div><p className="text-slate-500">Publication Year</p><p className="font-medium text-slate-900">{book.publication_year}</p></div>
          </div>

          <div>
            <h2 className="mb-1 text-xl font-semibold text-slate-900">Description</h2>
            <p className="text-slate-700">{book.description || 'No description available.'}</p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"><Truck className="h-4 w-4 text-blue-600" /> Free shipping on orders over $50</div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">Customer Reviews</h2>
        {isAuthenticated && (
          <form onSubmit={handleSubmitReview} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-semibold text-slate-800">Write a Review</p>
            <div className="mb-2 flex items-center gap-2 text-sm">
              <label>Rating:</label>
              <input type="number" min="1" max="5" value={newReview.rating} onChange={(e) => setNewReview({ ...newReview, rating: Number(e.target.value) })} className="w-20 rounded-md border border-slate-300 px-2 py-1" />
            </div>
            <textarea value={newReview.comment} onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })} placeholder="Share your thoughts about this book..." className="h-24 w-full rounded-md border border-slate-300 p-2 text-sm" />
            <button type="submit" disabled={submittingReview} className="mt-2 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-70">
              {submittingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Review'}
            </button>
          </form>
        )}

        {reviews.length > 0 ? reviews.map((review) => (
          <div key={review.review_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{review.customer_name || 'Anonymous'}</p>
                <p className="text-sm text-slate-500">Rating: {review.rating}/5</p>
                {review.is_verified_purchase && <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"><CheckCheck className="h-3 w-3" />Verified Purchase</span>}
              </div>
              <p className="text-xs text-slate-500">{new Date(review.created_at).toLocaleDateString()}</p>
            </div>
            <p className="text-sm text-slate-700">{review.comment}</p>
            <button onClick={() => handleUpvoteReview(review.review_id)} className="mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"><ThumbsUp className="h-4 w-4" /> Helpful ({review.upvotes || 0})</button>
          </div>
        )) : <p className="text-sm text-slate-500">No reviews yet. Be the first to review this book!</p>}
      </div>

      {similarBooks.length > 0 && (
        <div>
          <h2 className="mb-3 text-2xl font-semibold text-slate-900">Similar Books</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {similarBooks.map((similarBook) => (
              <button key={similarBook.book_id} onClick={() => navigate(`/books/${similarBook.book_id}`)} className="rounded-xl border border-slate-200 bg-white p-2 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <img src={`https://via.placeholder.com/200x280/1976d2/ffffff?text=${encodeURIComponent(similarBook.title)}`} alt={similarBook.title} className="h-48 w-full rounded object-cover" />
                <p className="mt-2 truncate font-semibold text-slate-900">{similarBook.title}</p>
                <p className="truncate text-sm text-slate-500">{similarBook.author}</p>
                <p className="mt-1 font-bold text-blue-600">${similarBook.price?.toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookDetail;
