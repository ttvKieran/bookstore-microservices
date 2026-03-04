import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  IconButton,
  Divider,
  Card,
  CardContent,
  CardMedia,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ShoppingCartOutlined,
} from '@mui/icons-material';
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
    if (!result.success) {
      showError(result.error || 'Failed to update quantity');
    }
  };

  const handleRemoveItem = async (itemId, bookTitle) => {
    const result = await removeItem(itemId);
    if (result.success) {
      showSuccess(`"${bookTitle}" removed from cart`);
    } else {
      showError(result.error || 'Failed to remove item');
    }
  };

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      const result = await clearCart();
      if (result.success) {
        showSuccess('Cart cleared');
      } else {
        showError(result.error || 'Failed to clear cart');
      }
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!cart || cart.items?.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <ShoppingCartOutlined sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Your cart is empty
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Start shopping to add items to your cart
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')}>
            Continue Shopping
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Shopping Cart ({cart.total_items} items)
        </Typography>
        <Button color="error" onClick={handleClearCart}>
          Clear Cart
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Cart Items */}
        <Grid item xs={12} md={8}>
          {cart.items.map((item) => (
            <Card key={item.id} sx={{ mb: 2 }}>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  {/* Book Image */}
                  <Grid item xs={3} sm={2}>
                    <CardMedia
                      component="img"
                      image={
                        item.cover_image_url ||
                        `https://via.placeholder.com/100x150/1976d2/ffffff?text=${encodeURIComponent(
                          item.title?.substring(0, 1) || 'B'
                        )}`
                      }
                      alt={item.title}
                      sx={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 1,
                      }}
                    />
                  </Grid>

                  {/* Book Info */}
                  <Grid item xs={9} sm={4}>
                    <Typography
                      variant="h6"
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/books/${item.book_id}`)}
                    >
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.author || 'Unknown Author'}
                    </Typography>
                    <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                      ${item.price?.toFixed(2)}
                    </Typography>
                  </Grid>

                  {/* Quantity Controls */}
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                        disabled={item.quantity <= 1}
                      >
                        <RemoveIcon />
                      </IconButton>
                      <TextField
                        value={item.quantity}
                        size="small"
                        sx={{ width: 60 }}
                        inputProps={{ style: { textAlign: 'center' } }}
                        disabled
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                      >
                        <AddIcon />
                      </IconButton>
                    </Box>
                  </Grid>

                  {/* Subtotal & Remove */}
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" fontWeight={600}>
                        ${item.subtotal?.toFixed(2)}
                      </Typography>
                      <IconButton
                        color="error"
                        onClick={() => handleRemoveItem(item.id, item.title)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Grid>

        {/* Order Summary */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 80 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Order Summary
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Subtotal:</Typography>
              <Typography variant="body1">${cart.total_amount?.toFixed(2)}</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Shipping:</Typography>
              <Typography variant="body1" color="success.main">
                {cart.total_amount >= 50 ? 'FREE' : '$5.00'}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>
                Total:
              </Typography>
              <Typography variant="h6" fontWeight={600} color="primary">
                $
                {(
                  cart.total_amount + (cart.total_amount >= 50 ? 0 : 5)
                ).toFixed(2)}
              </Typography>
            </Box>

            {cart.total_amount < 50 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Add ${(50 - cart.total_amount).toFixed(2)} more for free shipping!
              </Alert>
            )}

            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleCheckout}
            >
              Proceed to Checkout
            </Button>

            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={() => navigate('/')}
              sx={{ mt: 2 }}
            >
              Continue Shopping
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Cart;
