import axiosInstance from '../utils/axios';

// ==================== AUTH SERVICES ====================
export const authService = {
  // Login
  login: async (username, password) => {
    const response = await axiosInstance.post('/api/auth/login', {
      username,
      password,
    });
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await axiosInstance.post('/api/auth/logout');
    return response.data;
  },
};

// ==================== CUSTOMER SERVICES ====================
export const customerService = {
  // Register
  register: async (userData) => {
    const response = await axiosInstance.post('/api/customers/register', userData);
    return response.data;
  },

  // Get profile
  getProfile: async (customerId) => {
    const response = await axiosInstance.get(`/api/customers/${customerId}`);
    return response.data;
  },

  // Update profile
  updateProfile: async (customerId, userData) => {
    const response = await axiosInstance.put(`/api/customers/${customerId}`, userData);
    return response.data;
  },

  // Add address
  addAddress: async (customerId, addressData) => {
    const response = await axiosInstance.post(
      `/api/customers/${customerId}/addresses`,
      addressData
    );
    return response.data;
  },
};

// ==================== BOOK SERVICES ====================
export const bookService = {
  // List books with pagination
  getBooks: async (page = 1, limit = 20, sort = 'title') => {
    const response = await axiosInstance.get('/api/books', {
      params: { page, limit, sort },
    });
    return response.data;
  },

  // Get book details
  getBookDetail: async (bookId) => {
    const response = await axiosInstance.get(`/api/books/${bookId}`);
    return response.data;
  },

  // Search books
  searchBooks: async (query, author = '') => {
    const response = await axiosInstance.get('/api/books/search', {
      params: { q: query, author },
    });
    return response.data;
  },
};

// ==================== CART SERVICES ====================
export const cartService = {
  // Get cart
  getCart: async (customerId) => {
    const response = await axiosInstance.get(`/api/carts/${customerId}`);
    return response.data;
  },

  // Add item to cart
  addToCart: async (customerId, bookId, quantity = 1) => {
    const response = await axiosInstance.post(`/api/carts/${customerId}/items`, {
      book_id: bookId,
      quantity,
    });
    return response.data;
  },

  // Update cart item quantity
  updateCartItem: async (customerId, itemId, quantity) => {
    const response = await axiosInstance.put(
      `/api/carts/${customerId}/items/${itemId}`,
      { quantity }
    );
    return response.data;
  },

  // Remove item from cart
  removeCartItem: async (customerId, itemId) => {
    const response = await axiosInstance.delete(
      `/api/carts/${customerId}/items/${itemId}`
    );
    return response.data;
  },

  // Clear cart
  clearCart: async (customerId) => {
    const response = await axiosInstance.delete(`/api/carts/${customerId}`);
    return response.data;
  },
};

// ==================== CATALOG SERVICES ====================
export const catalogService = {
  // Get categories
  getCategories: async () => {
    const response = await axiosInstance.get('/api/catalog/categories');
    return response.data;
  },

  // Get books in category
  getBooksInCategory: async (categoryId, page = 1, limit = 20) => {
    const response = await axiosInstance.get(
      `/api/catalog/categories/${categoryId}/books`,
      { params: { page, limit } }
    );
    return response.data;
  },
};

// ==================== ORDER SERVICES ====================
export const orderService = {
  // Create order
  createOrder: async (customerId, shippingAddressId, paymentMethod) => {
    const response = await axiosInstance.post('/api/orders', {
      customer_id: customerId,
      shipping_address_id: shippingAddressId,
      payment_method: paymentMethod,
    });
    return response.data;
  },

  // Get order details
  getOrderDetail: async (orderId) => {
    const response = await axiosInstance.get(`/api/orders/${orderId}`);
    return response.data;
  },

  // Get customer orders
  getCustomerOrders: async (customerId, page = 1, limit = 10) => {
    const response = await axiosInstance.get(
      `/api/orders/customer/${customerId}`,
      { params: { page, limit } }
    );
    return response.data;
  },
};

// ==================== REVIEW SERVICES ====================
export const reviewService = {
  // Get reviews for a book
  getBookReviews: async (bookId, page = 1, limit = 10, sort = 'helpful') => {
    const response = await axiosInstance.get(`/api/reviews/book/${bookId}`, {
      params: { page, limit, sort },
    });
    return response.data;
  },

  // Create review
  createReview: async (bookId, customerId, rating, comment, isVerifiedPurchase) => {
    const response = await axiosInstance.post('/api/reviews', {
      book_id: bookId,
      customer_id: customerId,
      rating,
      comment,
      is_verified_purchase: isVerifiedPurchase,
    });
    return response.data;
  },

  // Get average rating
  getAverageRating: async (bookId) => {
    const response = await axiosInstance.get(`/api/reviews/book/${bookId}/average`);
    return response.data;
  },

  // Upvote review
  upvoteReview: async (reviewId) => {
    const response = await axiosInstance.post(`/api/reviews/${reviewId}/upvote`);
    return response.data;
  },
};

// ==================== RECOMMENDATION SERVICES ====================
export const recommendationService = {
  // Get personalized recommendations
  getRecommendations: async (customerId, limit = 10) => {
    const response = await axiosInstance.get(
      `/api/recommendations/${customerId}`,
      { params: { limit } }
    );
    return response.data;
  },

  // Get similar books
  getSimilarBooks: async (bookId, limit = 5) => {
    const response = await axiosInstance.get(
      `/api/recommendations/similar/${bookId}`,
      { params: { limit } }
    );
    return response.data;
  },

  // Get trending books
  getTrendingBooks: async (limit = 10, period = 'week') => {
    const response = await axiosInstance.get('/api/recommendations/trending', {
      params: { limit, period },
    });
    return response.data;
  },

  // Track interaction
  trackInteraction: async (customerId, bookId, interactionType) => {
    const response = await axiosInstance.post('/api/recommendations/track', {
      customer_id: customerId,
      book_id: bookId,
      interaction_type: interactionType,
    });
    return response.data;
  },
};
