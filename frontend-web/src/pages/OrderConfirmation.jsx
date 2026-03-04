import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Divider,
  Grid,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  LocalShipping as ShippingIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { orderService } from '../services/api';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const data = await orderService.getOrderDetail(orderId);
      setOrder(data);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !order) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Order not found'}</Alert>
        <Button onClick={() => navigate('/')} sx={{ mt: 2 }}>
          Back to Home
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Success Header */}
      <Paper sx={{ p: 4, mb: 3, textAlign: 'center', bgcolor: 'success.light' }}>
        <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Order Confirmed!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Thank you for your purchase. Your order has been received.
        </Typography>
      </Paper>

      {/* Order Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Order Details
          </Typography>
          <Chip label={order.status} color="primary" />
        </Box>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Order ID
            </Typography>
            <Typography variant="body1" fontWeight={600} sx={{ wordBreak: 'break-all' }}>
              {order.id}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Order Date
            </Typography>
            <Typography variant="body1">
              {new Date(order.createdAt).toLocaleDateString()}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Payment Status
            </Typography>
            <Typography variant="body1">
              {order.paymentId ? 'Paid' : 'Pending'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Shipment Status
            </Typography>
            <Typography variant="body1">
              {order.shipmentId ? 'Shipped' : 'Processing'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Order Items */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Order Items
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {order.orderItems?.map((item, index) => (
          <Box key={item.id || index} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="body1" fontWeight={600}>
                  Book ID: {item.bookId}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Quantity: {item.quantity} × ${item.priceAtOrder?.toFixed(2)}
                </Typography>
              </Box>
              <Typography variant="body1" fontWeight={600}>
                ${item.subtotal?.toFixed(2)}
              </Typography>
            </Box>
            {index < order.orderItems.length - 1 && <Divider sx={{ mt: 2 }} />}
          </Box>
        ))}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">Subtotal:</Typography>
          <Typography variant="body2">${order.totalAmount?.toFixed(2)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">Shipping:</Typography>
          <Typography variant="body2">$0.00</Typography>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={600}>
            Total:
          </Typography>
          <Typography variant="h6" fontWeight={600} color="primary">
            ${order.totalAmount?.toFixed(2)}
          </Typography>
        </Box>
      </Paper>

      {/* Next Steps */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          What's Next?
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}>
          <ReceiptIcon color="primary" />
          <Box>
            <Typography variant="body1" fontWeight={600}>
              Order Confirmation Email
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You'll receive an email confirmation shortly.
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <ShippingIcon color="primary" />
          <Box>
            <Typography variant="body1" fontWeight={600}>
              Track Your Order
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You can track your order status in "My Orders" section.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button variant="contained" onClick={() => navigate('/orders')}>
          View My Orders
        </Button>
        <Button variant="outlined" onClick={() => navigate('/')}>
          Continue Shopping
        </Button>
      </Box>
    </Container>
  );
};

export default OrderConfirmation;
