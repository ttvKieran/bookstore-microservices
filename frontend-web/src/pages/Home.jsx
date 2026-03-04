import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Box,
  Chip,
  Rating,
  Skeleton,
  Alert,
} from '@mui/material';
import { ShoppingCart as ShoppingCartIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { bookService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { showSuccess, showError } = useNotification();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const data = await bookService.getBooks(1, 12);
      setBooks(data.data || []);
    } catch (err) {
      console.error('Error fetching books:', err);
      setError('Failed to load books. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (bookId, bookTitle) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const result = await addToCart(bookId, 1);
    if (result.success) {
      showSuccess(`"${bookTitle}" added to cart!`);
    } else {
      showError(result.error || 'Failed to add to cart');
    }
  };

  const handleViewDetails = (bookId) => {
    navigate(`/books/${bookId}`);
  };

  return (
    <Container maxWidth="xl">
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          borderRadius: 2,
          p: 6,
          mb: 4,
          textAlign: 'center',
        }}
      >
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Welcome to BookStore
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9 }}>
          Discover your next great read from our collection
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Books Section */}
      <Typography variant="h4" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
        Featured Books
      </Typography>

      <Grid container spacing={3}>
        {loading
          ? // Skeleton loading
            Array.from(new Array(12)).map((_, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Card>
                  <Skeleton variant="rectangular" height={280} />
                  <CardContent>
                    <Skeleton variant="text" height={32} />
                    <Skeleton variant="text" />
                    <Skeleton variant="text" width="60%" />
                  </CardContent>
                </Card>
              </Grid>
            ))
          : // Actual book cards
            books.map((book) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6,
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    height="280"
                    image={
                      book.cover_image_url ||
                      `https://via.placeholder.com/200x280/1976d2/ffffff?text=${encodeURIComponent(
                        book.title
                      )}`
                    }
                    alt={book.title}
                    sx={{ objectFit: 'cover', bgcolor: 'grey.200', cursor: 'pointer' }}
                    onClick={() => handleViewDetails(book.id)}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="h6"
                      component="h3"
                      gutterBottom
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        minHeight: '3.5em',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleViewDetails(book.id)}
                    >
                      {book.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      by {book.author}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Rating value={4.5} precision={0.5} size="small" readOnly />
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        (45)
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" color="primary" fontWeight={700}>
                        ${book.price?.toFixed(2)}
                      </Typography>
                      {book.stock_quantity > 0 ? (
                        <Chip label="In Stock" color="success" size="small" />
                      ) : (
                        <Chip label="Out of Stock" color="error" size="small" />
                      )}
                    </Box>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => handleViewDetails(book.id)}
                    >
                      View Details
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<ShoppingCartIcon />}
                      onClick={() => handleAddToCart(book.id, book.title)}
                      disabled={book.stock_quantity === 0}
                    >
                      Add
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
      </Grid>
    </Container>
  );
};

export default Home;
