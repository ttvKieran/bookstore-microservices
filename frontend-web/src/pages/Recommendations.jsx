import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Loader2, ShoppingCart, Sparkles, Star, TrendingUp } from 'lucide-react';
import { recommendationService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';

const Recommendations = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { addToCart } = useCart();
  const { showSuccess, showError } = useNotification();

  const [personalizedRecommendations, setPersonalizedRecommendations] = useState([]);
  const [trendingBooks, setTrendingBooks] = useState([]);
  const [loadingPersonalized, setLoadingPersonalized] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTrendingBooks = async () => {
      try {
        setLoadingTrending(true);
        setError('');
        const data = await recommendationService.getTrendingBooks(12, 'week');
        setTrendingBooks(data.trending_books || []);
      } catch (err) {
        setError('Failed to load trending books. Please try again later.');
      } finally {
        setLoadingTrending(false);
      }
    };

    fetchTrendingBooks();
  }, []);

  useEffect(() => {
    const fetchPersonalizedRecommendations = async () => {
      if (!isAuthenticated || !user?.id) return;
      try {
        setLoadingPersonalized(true);
        const data = await recommendationService.getRecommendations(user.id, 8);
        setPersonalizedRecommendations(data.recommendations || []);
      } catch {
        setPersonalizedRecommendations([]);
      } finally {
        setLoadingPersonalized(false);
      }
    };

    fetchPersonalizedRecommendations();
  }, [isAuthenticated, user]);

  const handleAddToCart = async (bookId, bookTitle) => {
    if (!isAuthenticated) return navigate('/login');
    const result = await addToCart(bookId, 1);
    if (result.success) showSuccess(`"${bookTitle}" added to cart!`);
    else showError(result.error || 'Failed to add to cart');
  };

  const handleViewDetails = (bookId) => {
    if (isAuthenticated && user?.id) {
      recommendationService.trackInteraction(user.id, bookId, 'view').catch(() => {});
    }
    navigate(`/books/${bookId}`);
  };

  const renderBookCard = (book, showScore = false, showStats = false) => {
    const bookId = book.book_id || book.id;
    return (
      <div key={bookId} className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
        <img src={book.cover_image_url || `https://via.placeholder.com/200x280/1976d2/ffffff?text=${encodeURIComponent(book.title)}`} alt={book.title} className="h-72 w-full cursor-pointer rounded-t-xl object-cover" onClick={() => handleViewDetails(bookId)} />
        <div className="flex flex-1 flex-col p-4">
          {showScore && book.score && <span className="mb-1 inline-flex w-fit items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700"><Star className="h-3 w-3 fill-blue-500" />{Math.round(book.score * 100)}% Match</span>}
          {showStats && (book.views || book.purchases) && (
            <div className="mb-1 flex flex-wrap gap-1">
              {book.views && <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2 py-1 text-xs text-slate-600"><Eye className="h-3 w-3" />{book.views} views</span>}
              {book.purchases && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 px-2 py-1 text-xs text-emerald-700"><ShoppingCart className="h-3 w-3" />{book.purchases} sold</span>}
            </div>
          )}
          <button onClick={() => handleViewDetails(bookId)} className="line-clamp-2 text-left text-lg font-semibold text-slate-900 hover:text-blue-600">{book.title}</button>
          <p className="text-sm text-slate-500">{book.author}</p>
          {book.reason && <p className="mt-1 text-xs italic text-blue-600">{book.reason}</p>}
          <p className="mt-1 text-lg font-bold text-blue-600">${Number(book.price).toFixed(2)}</p>
          <button onClick={() => handleAddToCart(bookId, book.title)} className="mt-3 inline-flex items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"><ShoppingCart className="h-4 w-4" />Add to Cart</button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1 flex items-center gap-2"><Sparkles className="h-8 w-8 text-blue-600" /><h1 className="text-3xl font-bold text-slate-900">Recommendations for You</h1></div>
        <p className="text-slate-500">Discover books tailored to your taste, powered by AI</p>
      </div>

      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      {isAuthenticated ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-2xl font-semibold text-slate-900">Personalized Picks</h2>
          <p className="mb-3 text-sm text-slate-500">Based on your reading history and preferences</p>
          {loadingPersonalized ? <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {personalizedRecommendations.length === 0 ? <div className="col-span-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">No personalized recommendations yet. Browse and purchase books to get personalized suggestions!</div> : personalizedRecommendations.map((book) => renderBookCard(book, true, false))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-blue-600 p-6 text-center text-white">
          <Sparkles className="mx-auto mb-2 h-12 w-12" />
          <h2 className="text-2xl font-semibold">Get Personalized Recommendations</h2>
          <p className="mt-1 text-blue-100">Sign in to receive AI-powered book suggestions based on your preferences</p>
          <button onClick={() => navigate('/login')} className="mt-3 rounded-md bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Sign In Now</button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-1 flex items-center gap-2"><TrendingUp className="h-6 w-6 text-rose-600" /><h2 className="text-2xl font-semibold text-slate-900">Trending This Week</h2></div>
        <p className="mb-3 text-sm text-slate-500">Most popular books among our community</p>
        {loadingTrending ? <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {trendingBooks.length === 0 ? <div className="col-span-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">No trending data available. Check back later for trending books.</div> : trendingBooks.map((book) => renderBookCard(book, false, true))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;
