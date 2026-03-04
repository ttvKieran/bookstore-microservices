import React, { createContext, useState, useContext, useEffect } from 'react';
import { cartService } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [itemCount, setItemCount] = useState(0);

  // Fetch cart when user logs in
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchCart();
    } else {
      setCart(null);
      setItemCount(0);
    }
  }, [isAuthenticated, user]);

  // Update item count whenever cart changes
  useEffect(() => {
    if (cart?.items) {
      const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      setItemCount(count);
    } else {
      setItemCount(0);
    }
  }, [cart]);

  const fetchCart = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await cartService.getCart(user.id);
      setCart(data);
    } catch (error) {
      console.error('Error fetching cart:', error);
      // If cart doesn't exist, create empty cart structure
      setCart({ items: [], total_items: 0, total_amount: 0 });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (bookId, quantity = 1) => {
    if (!user?.id) {
      throw new Error('Please login to add items to cart');
    }

    try {
      await cartService.addToCart(user.id, bookId, quantity);
      await fetchCart(); // Refresh cart
      return { success: true };
    } catch (error) {
      console.error('Error adding to cart:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to add item to cart',
      };
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    if (!user?.id) return;

    try {
      await cartService.updateCartItem(user.id, itemId, quantity);
      await fetchCart();
      return { success: true };
    } catch (error) {
      console.error('Error updating quantity:', error);
      return { success: false, error: 'Failed to update quantity' };
    }
  };

  const removeItem = async (itemId) => {
    if (!user?.id) return;

    try {
      await cartService.removeCartItem(user.id, itemId);
      await fetchCart();
      return { success: true };
    } catch (error) {
      console.error('Error removing item:', error);
      return { success: false, error: 'Failed to remove item' };
    }
  };

  const clearCart = async () => {
    if (!user?.id) return;

    try {
      await cartService.clearCart(user.id);
      setCart({ items: [], total_items: 0, total_amount: 0 });
      return { success: true };
    } catch (error) {
      console.error('Error clearing cart:', error);
      return { success: false, error: 'Failed to clear cart' };
    }
  };

  const value = {
    cart,
    loading,
    itemCount,
    fetchCart,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
