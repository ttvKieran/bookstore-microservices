import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Trash2, Loader2 } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';

const Cart = () => {
  const navigate = useNavigate();
  const { cart, loading, fetchCart, updateQuantity, removeItem, clearCart } = useCart();
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchCart();
  }, []);

  const handleUpdateQuantity = async (itemId, currentQuantity, change) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity < 1) return;
    const result = await updateQuantity(itemId, newQuantity);
    if (!result.success) showError(result.error || 'Failed to update quantity');
  };

  const handleRemoveItem = async (itemId, bookTitle) => {
    const result = await removeItem(itemId);
    if (result.success) showSuccess(`"${bookTitle}" removed from cart`);
    else showError(result.error || 'Failed to remove item');
  };

  const handleClearCart = async () => {
    if (!window.confirm('Are you sure you want to clear your cart?')) return;
    const result = await clearCart();
    if (result.success) showSuccess('Cart cleared');
    else showError(result.error || 'Failed to clear cart');
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!cart || cart.items?.length === 0) {
    return (
      <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <ShoppingCart className="mx-auto mb-3 h-16 w-16 text-slate-400" />
        <h1 className="text-2xl font-bold text-slate-900">Your cart is empty</h1>
        <p className="mt-1 text-slate-500">Start shopping to add items to your cart</p>
        <button onClick={() => navigate('/')} className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">Continue Shopping</button>
      </div>
    );
  }

  const shippingFee = cart.total_amount >= 50 ? 0 : 5;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Shopping Cart ({cart.total_items} items)</h1>
          <button onClick={handleClearCart} className="rounded-md px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">Clear Cart</button>
        </div>

        <div className="space-y-3">
          {cart.items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-12 sm:items-center">
                <img
                  src={item.cover_image_url || `https://via.placeholder.com/100x150/1976d2/ffffff?text=${encodeURIComponent(item.title?.substring(0, 1) || 'B')}`}
                  alt={item.title}
                  className="h-28 w-20 rounded object-cover sm:col-span-2"
                />
                <div className="sm:col-span-4">
                  <button className="text-left text-lg font-semibold text-slate-900 hover:text-blue-600" onClick={() => navigate(`/books/${item.book_id}`)}>{item.title}</button>
                  <p className="text-sm text-slate-500">{item.author || 'Unknown Author'}</p>
                  <p className="mt-1 font-semibold text-blue-600">${item.price?.toFixed(2)}</p>
                </div>
                <div className="sm:col-span-3 flex items-center gap-2">
                  <button onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)} disabled={item.quantity <= 1} className="rounded-md border border-slate-300 p-1 disabled:opacity-40"><Minus className="h-4 w-4" /></button>
                  <input value={item.quantity} disabled className="w-14 rounded-md border border-slate-300 py-1 text-center text-sm" />
                  <button onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)} className="rounded-md border border-slate-300 p-1"><Plus className="h-4 w-4" /></button>
                </div>
                <div className="sm:col-span-3 text-right">
                  <p className="text-lg font-semibold text-slate-900">${item.subtotal?.toFixed(2)}</p>
                  <button onClick={() => handleRemoveItem(item.id, item.title)} className="mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>${cart.total_amount?.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Shipping</span><span className="font-medium text-emerald-600">{shippingFee === 0 ? 'FREE' : `$${shippingFee.toFixed(2)}`}</span></div>
          </div>
          <div className="mt-3 border-t border-slate-200 pt-3">
            <div className="flex justify-between text-base font-semibold"><span>Total</span><span>${(cart.total_amount + shippingFee).toFixed(2)}</span></div>
          </div>

          {cart.total_amount < 50 && (
            <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              Add ${(50 - cart.total_amount).toFixed(2)} more for free shipping!
            </div>
          )}

          <button onClick={() => navigate('/checkout')} className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">Proceed to Checkout</button>
          <button onClick={() => navigate('/')} className="mt-2 w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Continue Shopping</button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
