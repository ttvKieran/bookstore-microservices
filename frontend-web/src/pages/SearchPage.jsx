import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  TextField,
  InputAdornment,
} from '@mui/material';
import { ShoppingCart as ShoppingCartIcon, Search as SearchIcon } from '@mui/icons-material';
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
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, [searchParams]);

  const performSearch = async (query) => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError('');
      const data = await bookService.searchBooks(query);
      setBooks(data.data || []);
      
      if (data.total === 0) {
        setError('No books found. Try different keywords.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search books. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery });
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
      {/* Search Header */}
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Search Books
        </Typography>

        {/* Search Form */}
        <Box component="form" onSubmit={handleSearch} sx={{ mb: 3 }}>
          <TextField
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, author, ISBN..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 600 }}
          />
        </Box>

        {/* Results Count */}
        {!loading && books.length > 0 && (
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Found {books.length} result{books.length !== 1 ? 's' : ''} for "{searchParams.get('q')}"
          </Typography>
        )}
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity={books.length === 0 ? 'info' : 'error'} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Results Grid */}
      <Grid container spacing={3}>
        {loading
          ? Array.from(new Array(8)).map((_, index) => (
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
          : books.map((book) => (
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
                    sx={{ objectFit: 'cover', bgcolor: 'grey.200' }}
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
                      }}
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

export default SearchPage;
