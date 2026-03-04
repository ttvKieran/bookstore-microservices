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
  Paper,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  ShoppingCart as ShoppingCartIcon,
  AutoAwesome as AutoAwesomeIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { recommendationService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';

const Recommendations = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { addToCart } = useCart();
  const { showSuccess, showError } = useNotification();

  const [personalizedRecommendations, setPersonalizedRecommendations] = useState([]);
  const [trendingBooks, setTrendingBooks] = useState([]);
  const [loadingPersonalized, setLoadingPersonalized] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrendingBooks();
    if (isAuthenticated && user?.id) {
      fetchPersonalizedRecommendations();
    }
  }, [isAuthenticated, user]);

  const fetchPersonalizedRecommendations = async () => {
    try {
      setLoadingPersonalized(true);
      const data = await recommendationService.getRecommendations(user.id, 8);
      setPersonalizedRecommendations(data.recommendations || []);
    } catch (err) {
      console.error('Error fetching personalized recommendations:', err);
      // Don't show error for personalized - just skip this section
      setPersonalizedRecommendations([]);
    } finally {
      setLoadingPersonalized(false);
    }
  };

  const fetchTrendingBooks = async () => {
    try {
      setLoadingTrending(true);
      setError('');
      const data = await recommendationService.getTrendingBooks(12, 'week');
      setTrendingBooks(data.trending_books || []);
    } catch (err) {
      console.error('Error fetching trending books:', err);
      setError('Failed to load trending books. Please try again later.');
    } finally {
      setLoadingTrending(false);
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
    // Track interaction when viewing details
    if (isAuthenticated && user?.id) {
      recommendationService
        .trackInteraction(user.id, bookId, 'view')
        .catch((err) => console.error('Error tracking interaction:', err));
    }
    navigate(`/books/${bookId}`);
  };

  const renderBookCard = (book, showScore = false, showStats = false) => {
    const bookId = book.book_id || book.id;
    const bookTitle = book.title;
    const bookAuthor = book.author;
    const bookPrice = book.price;
    const coverImage = book.cover_image_url;

    return (
      <Grid item xs={12} sm={6} md={4} lg={3} key={bookId}>
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
              coverImage ||
              `https://via.placeholder.com/200x280/1976d2/ffffff?text=${encodeURIComponent(
                bookTitle
              )}`
            }
            alt={bookTitle}
            sx={{ objectFit: 'cover', bgcolor: 'grey.200', cursor: 'pointer' }}
            onClick={() => handleViewDetails(bookId)}
          />
          <CardContent sx={{ flexGrow: 1 }}>
            {/* Score Badge */}
            {showScore && book.score && (
              <Box sx={{ mb: 1 }}>
                <Chip
                  icon={<StarIcon />}
                  label={`${Math.round(book.score * 100)}% Match`}
                  color="primary"
                  size="small"
                />
              </Box>
            )}

            {/* Trending Stats */}
            {showStats && (book.views || book.purchases) && (
              <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {book.views && (
                  <Chip
                    icon={<VisibilityIcon />}
                    label={`${book.views} views`}
                    size="small"
                    variant="outlined"
                  />
                )}
                {book.purchases && (
                  <Chip
                    icon={<ShoppingCartIcon />}
                    label={`${book.purchases} sold`}
                    size="small"
                    variant="outlined"
                    color="success"
                  />
                )}
              </Box>
            )}

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
              onClick={() => handleViewDetails(bookId)}
            >
              {bookTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {bookAuthor}
            </Typography>

            {/* Recommendation Reason */}
            {book.reason && (
              <Typography
                variant="caption"
                color="primary"
                sx={{
                  display: 'block',
                  fontStyle: 'italic',
                  mb: 1,
                }}
              >
                {book.reason}
              </Typography>
            )}

            <Typography variant="h6" color="primary" fontWeight={700}>
              ${Number(bookPrice).toFixed(2)}
            </Typography>
          </CardContent>
          <CardActions sx={{ p: 2, pt: 0 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<ShoppingCartIcon />}
              onClick={() => handleAddToCart(bookId, bookTitle)}
            >
              Add to Cart
            </Button>
          </CardActions>
        </Card>
      </Grid>
    );
  };

  return (
    <Container maxWidth="xl">
      {/* Page Header */}
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AutoAwesomeIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Typography variant="h3" fontWeight={700}>
            Recommendations for You
          </Typography>
        </Box>
        <Typography variant="h6" color="text.secondary">
          Discover books tailored to your taste, powered by AI
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Personalized Recommendations Section */}
      {isAuthenticated && (
        <>
          <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AutoAwesomeIcon sx={{ color: 'primary.main', mr: 1 }} />
              <Typography variant="h4" fontWeight={600}>
                Personalized Picks
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Based on your reading history and preferences
            </Typography>

            {loadingPersonalized ? (
              <Box sx={{ mb: 2 }}>
                <LinearProgress />
              </Box>
            ) : null}

            <Grid container spacing={3}>
              {loadingPersonalized
                ? Array.from(new Array(4)).map((_, index) => (
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
                : personalizedRecommendations.length === 0
                ? <Grid item xs={12}>
                    <Alert severity="info">
                      No personalized recommendations yet. Browse and purchase books to get personalized suggestions!
                    </Alert>
                  </Grid>
                : personalizedRecommendations.map((book) =>
                    renderBookCard(book, true, false)
                  )}
            </Grid>
          </Paper>

          <Divider sx={{ my: 4 }} />
        </>
      )}

      {/* Login Prompt for Anonymous Users */}
      {!isAuthenticated && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            bgcolor: 'primary.light',
            textAlign: 'center',
            color: 'white',
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Get Personalized Recommendations
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
            Sign in to receive AI-powered book suggestions based on your preferences
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/login')}
            sx={{
              bgcolor: 'white',
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'grey.100',
              },
            }}
          >
            Sign In Now
          </Button>
        </Paper>
      )}

      {/* Trending Books Section */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TrendingUpIcon sx={{ color: 'secondary.main', mr: 1 }} />
          <Typography variant="h4" fontWeight={600}>
            Trending This Week
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Most popular books among our community
        </Typography>

        {loadingTrending ? (
          <Box sx={{ mb: 2 }}>
            <LinearProgress color="secondary" />
          </Box>
        ) : null}

        <Grid container spacing={3}>
          {loadingTrending
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
            : trendingBooks.length === 0
            ? <Grid item xs={12}>
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 6,
                    px: 2,
                  }}
                >
                  <TrendingUpIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h5" color="text.secondary" gutterBottom>
                    No trending data available
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Check back later for trending books
                  </Typography>
                </Box>
              </Grid>
            : trendingBooks.map((book) => renderBookCard(book, false, true))}
        </Grid>
      </Paper>
    </Container>
  );
};

export default Recommendations;
