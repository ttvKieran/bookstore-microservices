import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Search, ShoppingCart, Star } from 'lucide-react';
import { bookService } from '../services/api';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { showSuccess, showError } = useNotification();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    const query = searchParams.get('q');
    if (!query) return;
    setSearchQuery(query);

    const performSearch = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await bookService.searchBooks(query);
        setBooks(data.data || []);
        if (data.total === 0) setError('No books found. Try different keywords.');
      } catch (err) {
        setError('Failed to search books. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [searchParams]);

  const handleSearch = (event) => {
    event.preventDefault();
    if (searchQuery.trim()) setSearchParams({ q: searchQuery });
  };

  const handleAddToCart = async (bookId, bookTitle) => {
    if (!isAuthenticated) return navigate('/login');
    const result = await addToCart(bookId, 1);
    if (result.success) showSuccess(`"${bookTitle}" added to cart!`);
    else showError(result.error || 'Failed to add to cart');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">Search Books</h1>
      <form onSubmit={handleSearch} className="relative mt-3 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by title, author, ISBN..." className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none ring-blue-500 focus:ring-2" />
      </form>
      {!loading && books.length > 0 && <p className="mt-2 text-sm text-slate-500">Found {books.length} result{books.length !== 1 ? 's' : ''} for "{searchParams.get('q')}"</p>}
      {error && <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{error}</div>}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {books.map((book) => (
            <div key={book.id} className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <img src={book.cover_image_url || `https://via.placeholder.com/200x280/1976d2/ffffff?text=${encodeURIComponent(book.title)}`} alt={book.title} className="h-72 w-full rounded-t-xl object-cover" />
              <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-2 text-lg font-semibold text-slate-900">{book.title}</h3>
                <p className="text-sm text-slate-500">by {book.author}</p>
                <div className="mt-1 flex items-center gap-1 text-amber-500"><Star className="h-4 w-4 fill-amber-400" /><span className="text-sm text-slate-500">4.5 (45)</span></div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-lg font-bold text-blue-600">${book.price?.toFixed(2)}</p>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${book.stock_quantity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{book.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => navigate(`/books/${book.id}`)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">View Details</button>
                  <button onClick={() => handleAddToCart(book.id, book.title)} disabled={book.stock_quantity === 0} className="inline-flex items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"><ShoppingCart className="h-4 w-4" />Add</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
