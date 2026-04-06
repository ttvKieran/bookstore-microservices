import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, ShoppingCart, Star } from 'lucide-react';
import { bookService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';

const Home = () => {
  const slides = [
    {
      image:
        'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1600&q=80',
      title: 'Explore Timeless Classics',
      subtitle: 'Curated collections for every kind of reader',
    },
    {
      image:
        'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1600&q=80',
      title: 'Fresh New Releases Weekly',
      subtitle: 'Stay ahead with the latest books and trends',
    },
    {
      image:
        'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=80',
      title: 'Build Your Dream Library',
      subtitle: 'Find your next favorite story in seconds',
    },
  ];

  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { showSuccess, showError } = useNotification();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const data = await bookService.getBooks(1, 12);
        setBooks(data.data || []);
      } catch (err) {
        setError('Failed to load books. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  const handleAddToCart = async (bookId, bookTitle) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const result = await addToCart(bookId, 1);
    if (result.success) showSuccess(`"${bookTitle}" added to cart!`);
    else showError(result.error || 'Failed to add to cart');
  };

  return (
    <div>
      <div className="group relative mb-6 h-[340px] overflow-hidden rounded-2xl sm:h-[420px]">
        {slides.map((slide, index) => (
          <div
            key={slide.image}
            className={`absolute inset-0 transition-all duration-1000 ease-out ${
              index === activeSlide ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
            }`}
          >
            <img src={slide.image} alt={slide.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-900/45 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 text-white sm:p-10">
              <h1 className="max-w-2xl text-3xl font-bold drop-shadow-lg sm:text-5xl">{slide.title}</h1>
              <p className="mt-2 max-w-xl text-sm text-slate-100 sm:text-lg">{slide.subtitle}</p>
            </div>
          </div>
        ))}

        <button
          onClick={() => setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-2 text-white opacity-0 transition hover:bg-black/55 group-hover:opacity-100"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          onClick={() => setActiveSlide((prev) => (prev + 1) % slides.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-2 text-white opacity-0 transition hover:bg-black/55 group-hover:opacity-100"
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveSlide(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === activeSlide ? 'w-8 bg-white' : 'w-2.5 bg-white/55 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {error && <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <h2 className="mb-3 text-2xl font-semibold text-slate-900">Featured Books</h2>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {books.map((book) => (
            <div key={book.id} className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <img
                src={book.cover_image_url || `https://via.placeholder.com/200x280/1976d2/ffffff?text=${encodeURIComponent(book.title)}`}
                alt={book.title}
                className="h-72 w-full cursor-pointer rounded-t-xl object-cover"
                onClick={() => navigate(`/books/${book.id}`)}
              />
              <div className="flex flex-1 flex-col p-4">
                <button onClick={() => navigate(`/books/${book.id}`)} className="line-clamp-2 text-left text-lg font-semibold text-slate-900 hover:text-blue-600">{book.title}</button>
                <p className="mt-1 text-sm text-slate-500">by {book.author}</p>
                <div className="mt-2 flex items-center gap-1 text-amber-500"><Star className="h-4 w-4 fill-amber-400" /><span className="text-sm text-slate-500">4.5 (45)</span></div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-lg font-bold text-blue-600">${book.price?.toFixed(2)}</p>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${book.stock_quantity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {book.stock_quantity > 0 ? `Stock: ${book.stock_quantity}` : 'Out of Stock'}
                  </span>
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

export default Home;
