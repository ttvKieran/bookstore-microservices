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
  Skeleton,
  Alert,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import {
  ShoppingCart as ShoppingCartIcon,
  Category as CategoryIcon,
  LocalOffer as LocalOfferIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { catalogService, bookService } from '../services/api';
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
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchBooksInCategory(selectedCategory);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await catalogService.getCategories();
      const categoriesData = response.data || [];
      setCategories(categoriesData);
      
      // Auto-select first category
      if (categoriesData.length > 0) {
        setSelectedCategory(categoriesData[0].id);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories. Please try again later.');
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchBooksInCategory = async (categoryId) => {
    try {
      setLoadingBooks(true);
      setError('');
      const data = await catalogService.getBooksInCategory(categoryId, 1, 20);
      setBooks(data.books || []);
      setCategoryInfo({
        name: data.category_name,
        total: data.total,
      });
    } catch (err) {
      console.error('Error fetching books in category:', err);
      setError('Failed to load books. Please try again later.');
      setBooks([]);
    } finally {
      setLoadingBooks(false);
    }
  };

  const handleCategoryChange = (event, newValue) => {
    setSelectedCategory(newValue);
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
      {/* Page Header */}
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CategoryIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Typography variant="h3" fontWeight={700}>
            Browse by Category
          </Typography>
        </Box>
        <Typography variant="h6" color="text.secondary">
          Explore our collection organized by categories
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Categories Tabs */}
      <Paper elevation={0} sx={{ mb: 4, bgcolor: 'background.paper' }}>
        {loadingCategories ? (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rectangular" height={48} />
          </Box>
        ) : (
          <Tabs
            value={selectedCategory}
            onChange={handleCategoryChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
              },
            }}
          >
            {categories.map((category) => (
              <Tab
                key={category.id}
                value={category.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalOfferIcon fontSize="small" />
                    <span>{category.name}</span>
                    {category.book_count && (
                      <Chip
                        label={category.book_count}
                        size="small"
                        color="primary"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>
        )}
      </Paper>

      {/* Category Info */}
      {categoryInfo && !loadingBooks && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            {categoryInfo.name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {categoryInfo.total} book{categoryInfo.total !== 1 ? 's' : ''} available
          </Typography>
        </Box>
      )}

      {/* Books Grid */}
      <Grid container spacing={3}>
        {loadingBooks
          ? // Skeleton loading
            Array.from(new Array(8)).map((_, index) => (
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
          : books.length === 0
          ? // Empty state
            <Grid item xs={12}>
              <Box
                sx={{
                  textAlign: 'center',
                  py: 8,
                  px: 2,
                }}
              >
                <CategoryIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h5" color="text.secondary" gutterBottom>
                  No books found in this category
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Try selecting a different category
                </Typography>
              </Box>
            </Grid>
          : // Actual book cards
            books.map((book) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={book.book_id}>
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
                    onClick={() => handleViewDetails(book.book_id)}
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
                        minHeight: '3.6em',
                        cursor: 'pointer',
                        '&:hover': {
                          color: 'primary.main',
                        },
                      }}
                      onClick={() => handleViewDetails(book.book_id)}
                    >
                      {book.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {book.author}
                    </Typography>
                    <Typography variant="h6" color="primary" fontWeight={700}>
                      ${Number(book.price).toFixed(2)}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<ShoppingCartIcon />}
                      onClick={() => handleAddToCart(book.book_id, book.title)}
                    >
                      Add to Cart
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
      </Grid>
    </Container>
  );
};

export default Catalog;
