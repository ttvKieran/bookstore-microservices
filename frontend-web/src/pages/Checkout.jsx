import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  AccountBalance as BankIcon,
  Money as CashIcon,
} from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { orderService } from '../services/api';

const steps = ['Shipping Address', 'Payment Method', 'Review Order'];

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [shippingAddress, setShippingAddress] = useState({
    address_line: '',
    city: '',
    postal_code: '',
  });

  const [paymentMethod, setPaymentMethod] = useState('credit_card');

  const handleNext = () => {
    // Validate current step
    if (activeStep === 0) {
      if (
        !shippingAddress.address_line ||
        !shippingAddress.city ||
        !shippingAddress.postal_code
      ) {
        showError('Please fill in all shipping address fields');
        return;
      }
    }

    if (activeStep < steps.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      handlePlaceOrder();
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handlePlaceOrder = async () => {
    try {
      setLoading(true);

      // Create order
      const orderData = await orderService.createOrder(
        user.id,
        'temp-address-id', // In real app, save address first
        paymentMethod
      );

      // Clear cart
      await clearCart();

      showSuccess('Order placed successfully!');
      navigate(`/order-confirmation/${orderData.id}`);
    } catch (err) {
      console.error('Order error:', err);
      showError('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Shipping Address
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  value={shippingAddress.address_line}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, address_line: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  value={shippingAddress.city}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, city: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Postal Code"
                  value={shippingAddress.postal_code}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, postal_code: e.target.value })
                  }
                  required
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Payment Method
            </Typography>
            <FormControl component="fieldset">
              <RadioGroup
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <Paper sx={{ p: 2, mb: 2 }}>
                  <FormControlLabel
                    value="credit_card"
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CreditCardIcon />
                        <Box>
                          <Typography variant="body1">Credit Card</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Pay with Visa, Mastercard, or Amex
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </Paper>

                <Paper sx={{ p: 2, mb: 2 }}>
                  <FormControlLabel
                    value="bank_transfer"
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BankIcon />
                        <Box>
                          <Typography variant="body1">Bank Transfer</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Direct bank transfer
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </Paper>

                <Paper sx={{ p: 2 }}>
                  <FormControlLabel
                    value="cash_on_delivery"
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CashIcon />
                        <Box>
                          <Typography variant="body1">Cash on Delivery</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Pay when you receive
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </Paper>
              </RadioGroup>
            </FormControl>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Your Order
            </Typography>

            {/* Shipping Address Review */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Shipping Address
              </Typography>
              <Typography variant="body2">{shippingAddress.address_line}</Typography>
              <Typography variant="body2">
                {shippingAddress.city}, {shippingAddress.postal_code}
              </Typography>
            </Paper>

            {/* Payment Method Review */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Payment Method
              </Typography>
              <Typography variant="body2">
                {paymentMethod === 'credit_card' && 'Credit Card'}
                {paymentMethod === 'bank_transfer' && 'Bank Transfer'}
                {paymentMethod === 'cash_on_delivery' && 'Cash on Delivery'}
              </Typography>
            </Paper>

            {/* Cart Items Review */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Order Items ({cart?.total_items})
              </Typography>
              {cart?.items?.map((item) => (
                <Box
                  key={item.id}
                  sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
                >
                  <Typography variant="body2">
                    {item.title} x {item.quantity}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ${item.subtotal?.toFixed(2)}
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  if (!cart || cart.items?.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Your cart is empty. Please add items before checkout.
        </Alert>
        <Button onClick={() => navigate('/')} sx={{ mt: 2 }}>
          Continue Shopping
        </Button>
      </Container>
    );
  }

  const shippingFee = cart.total_amount >= 50 ? 0 : 5;
  const totalAmount = cart.total_amount + shippingFee;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Checkout
      </Typography>

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>{getStepContent(activeStep)}</Paper>

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button disabled={activeStep === 0} onClick={handleBack}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} />
              ) : activeStep === steps.length - 1 ? (
                'Place Order'
              ) : (
                'Next'
              )}
            </Button>
          </Box>
        </Grid>

        {/* Order Summary */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 80 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Order Summary
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Subtotal:</Typography>
              <Typography variant="body2">${cart.total_amount?.toFixed(2)}</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Shipping:</Typography>
              <Typography variant="body2" color={shippingFee === 0 ? 'success.main' : 'inherit'}>
                {shippingFee === 0 ? 'FREE' : `$${shippingFee.toFixed(2)}`}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6" fontWeight={600}>
                Total:
              </Typography>
              <Typography variant="h6" fontWeight={600} color="primary">
                ${totalAmount.toFixed(2)}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Checkout;
