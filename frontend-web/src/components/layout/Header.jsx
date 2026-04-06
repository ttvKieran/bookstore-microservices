import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Search,
  ShoppingCart,
  UserCircle,
  Layers,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';

const Header = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearch = (event) => {
    if (event.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleCartClick = () => {
    navigate(isAuthenticated ? '/cart' : '/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 rounded-md px-1 py-1 text-slate-900 hover:bg-slate-100"
        >
          <BookOpen className="h-7 w-7 text-blue-600" />
          <span className="hidden text-lg font-extrabold tracking-wide sm:inline">BOOKSTORE</span>
        </button>

        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={() => navigate('/catalog')}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <Layers className="h-4 w-4" />
            Catalog
          </button>
          <button
            onClick={() => navigate('/recommendations')}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <Sparkles className="h-4 w-4" />
            Recommendations
          </button>
        </div>

        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search books, authors..."
            className="w-full rounded-md border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none ring-blue-500 placeholder:text-slate-400 focus:ring-2"
          />
        </div>

        <button
          onClick={handleCartClick}
          className="relative inline-flex items-center justify-center rounded-md p-2 text-slate-700 hover:bg-slate-100"
          aria-label="Open cart"
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 rounded-full bg-rose-600 px-1.5 text-xs font-semibold text-white">
            {itemCount}
          </span>
        </button>

        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/profile')}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <UserCircle className="h-4 w-4" />
              <span className="hidden sm:inline">{user?.username || 'Profile'}</span>
            </button>
            <button
              onClick={() => navigate('/orders')}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              My Orders
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/register')}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
