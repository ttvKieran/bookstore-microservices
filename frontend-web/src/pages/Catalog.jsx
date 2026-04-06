import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Loader2, ShoppingCart, Tag } from 'lucide-react';
import { catalogService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';

const Catalog = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { showSuccess, showError } = useNotification();

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [books, setBooks] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [error, setError] = useState('');
  const [categoryInfo, setCategoryInfo] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await catalogService.getCategories();
        const categoriesData = response.data || [];
        setCategories(categoriesData);
        if (categoriesData.length > 0) setSelectedCategory(categoriesData[0].id);
      } catch (err) {
        setError('Failed to load categories. Please try again later.');
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;

    const fetchBooksInCategory = async () => {
      try {
        setLoadingBooks(true);
        setError('');
        const data = await catalogService.getBooksInCategory(selectedCategory, 1, 20);
        setBooks(data.books || []);
        setCategoryInfo({ name: data.category_name, total: data.total });
      } catch (err) {
        setError('Failed to load books. Please try again later.');
        setBooks([]);
      } finally {
        setLoadingBooks(false);
      }
    };

    fetchBooksInCategory();
  }, [selectedCategory]);

  const handleAddToCart = async (bookId, bookTitle) => {
    if (!isAuthenticated) return navigate('/login');
    const result = await addToCart(bookId, 1);
    if (result.success) showSuccess(`"${bookTitle}" added to cart!`);
    else showError(result.error || 'Failed to add to cart');
  };

  return (
    <div>
      <div className="mb-4">
        <div className="mb-1 flex items-center gap-2"><Layers className="h-8 w-8 text-blue-600" /><h1 className="text-3xl font-bold text-slate-900">Browse by Category</h1></div>
        <p className="text-slate-500">Explore our collection organized by categories</p>
      </div>

      {error && <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        {loadingCategories ? (
          <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button key={category.id} onClick={() => setSelectedCategory(category.id)} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium ${selectedCategory === category.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                <Tag className="h-3 w-3" /> {category.name}
                {category.book_count && <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${selectedCategory === category.id ? 'bg-white/20' : 'bg-blue-100 text-blue-700'}`}>{category.book_count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {categoryInfo && !loadingBooks && (
        <div className="mb-3">
          <h2 className="text-2xl font-semibold text-slate-900">{categoryInfo.name}</h2>
          <p className="text-sm text-slate-500">{categoryInfo.total} book{categoryInfo.total !== 1 ? 's' : ''} available</p>
        </div>
      )}

      {loadingBooks ? (
        <div className="flex min-h-[30vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : books.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <Layers className="mx-auto mb-2 h-16 w-16 text-slate-300" />
          <p className="text-lg font-semibold text-slate-700">No books found in this category</p>
          <p className="text-sm text-slate-500">Try selecting a different category</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {books.map((book) => (
            <div key={book.book_id} className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <img src={book.cover_image_url || `https://via.placeholder.com/200x280/1976d2/ffffff?text=${encodeURIComponent(book.title)}`} alt={book.title} className="h-72 w-full cursor-pointer rounded-t-xl object-cover" onClick={() => navigate(`/books/${book.book_id}`)} />
              <div className="flex flex-1 flex-col p-4">
                <button onClick={() => navigate(`/books/${book.book_id}`)} className="line-clamp-2 text-left text-lg font-semibold text-slate-900 hover:text-blue-600">{book.title}</button>
                <p className="text-sm text-slate-500">{book.author}</p>
                <p className="mt-1 text-lg font-bold text-blue-600">${Number(book.price).toFixed(2)}</p>
                <button onClick={() => handleAddToCart(book.book_id, book.title)} className="mt-3 inline-flex items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"><ShoppingCart className="h-4 w-4" />Add to Cart</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Catalog;
