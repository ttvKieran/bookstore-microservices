import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ShoppingBag as OrderIcon,
  Visibility as ViewIcon,
  LocalShipping as ShippingIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/api';

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await orderService.getCustomerOrders(user.id, 1, 20);
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'delivered':
      case 'completed':
        return 'success';
      case 'confirmed':
      case 'pending':
        return 'primary';
      case 'cancelled':
      case 'canceled':
        return 'error';
      case 'processing':
      case 'shipped':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (orders.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <OrderIcon sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            No orders yet
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            You haven't placed any orders yet. Start shopping!
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')}>
            Start Shopping
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          My Orders
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and track your orders
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {orders.map((order) => (
          <Grid item xs={12} key={order.id}>
            <Card>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  {/* Order Info */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Order ID
                    </Typography>
                    <Typography variant="body1" fontWeight={600} noWrap>
                      {order.id?.substring(0, 13)}...
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </Typography>
                  </Grid>

                  {/* Status */}
                  <Grid item xs={12} sm={6} md={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Status
                    </Typography>
                    <Chip
                      label={order.status}
                      color={getStatusColor(order.status)}
                      size="small"
                    />
                  </Grid>

                  {/* Amount */}
                  <Grid item xs={6} md={2}>
                    <Typography variant="body2" color="text.secondary">
                      Total Amount
                    </Typography>
                    <Typography variant="h6" color="primary" fontWeight={600}>
                      ${order.totalAmount?.toFixed(2)}
                    </Typography>
                  </Grid>

                  {/* Items Count */}
                  <Grid item xs={6} md={2}>
                    <Typography variant="body2" color="text.secondary">
                      Items
                    </Typography>
                    <Typography variant="body1">
                      {order.orderItems?.length || 0} item(s)
                    </Typography>
                  </Grid>

                  {/* Actions */}
                  <Grid item xs={12} md={3}>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => navigate(`/order-confirmation/${order.id}`)}
                      >
                        View Details
                      </Button>
                    </Box>
                  </Grid>
                </Grid>

                {/* Order Items Preview */}
                {order.orderItems && order.orderItems.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Order Items:
                      </Typography>
                      {order.orderItems.slice(0, 2).map((item, index) => (
                        <Typography key={index} variant="body2">
                          • Book ID {item.bookId} - Qty: {item.quantity} - ${item.subtotal?.toFixed(2)}
                        </Typography>
                      ))}
                      {order.orderItems.length > 2 && (
                        <Typography variant="body2" color="text.secondary">
                          ... and {order.orderItems.length - 2} more item(s)
                        </Typography>
                      )}
                    </Box>
                  </>
                )}

                {/* Shipping Info */}
                {order.shipmentId && (
                  <Paper sx={{ p: 1.5, mt: 2, bgcolor: 'grey.50' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ShippingIcon fontSize="small" color="primary" />
                      <Typography variant="body2">
                        Shipment ID: <strong>{order.shipmentId}</strong>
                      </Typography>
                    </Box>
                  </Paper>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Orders;
