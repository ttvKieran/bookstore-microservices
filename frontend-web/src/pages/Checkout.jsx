import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banknote, CreditCard, Landmark, Loader2 } from 'lucide-react';
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
  const [shippingAddress, setShippingAddress] = useState({ address_line: '', city: '', postal_code: '' });
  const [paymentMethod, setPaymentMethod] = useState('credit_card');

  const handlePlaceOrder = async () => {
    try {
      setLoading(true);
      const orderData = await orderService.createOrder(user.id, 'temp-address-id', paymentMethod);
      await clearCart();
      showSuccess('Order placed successfully!');
      navigate(`/order-confirmation/${orderData.id}`);
    } catch (err) {
      showError('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && (!shippingAddress.address_line || !shippingAddress.city || !shippingAddress.postal_code)) {
      showError('Please fill in all shipping address fields');
      return;
    }

    if (activeStep < steps.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      handlePlaceOrder();
    }
  };

  if (!cart || cart.items?.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">Your cart is empty. Please add items before checkout.</div>
        <button onClick={() => navigate('/')} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">Continue Shopping</button>
      </div>
    );
  }

  const shippingFee = cart.total_amount >= 50 ? 0 : 5;
  const totalAmount = cart.total_amount + shippingFee;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="mb-4 text-3xl font-bold text-slate-900">Checkout</h1>

        <div className="mb-4 flex flex-wrap gap-2">
          {steps.map((label, index) => (
            <div key={label} className={`rounded-full px-3 py-1 text-xs font-semibold ${index <= activeStep ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              {index + 1}. {label}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {activeStep === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="sm:col-span-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Street Address" value={shippingAddress.address_line} onChange={(e) => setShippingAddress({ ...shippingAddress, address_line: e.target.value })} />
              <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="City" value={shippingAddress.city} onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })} />
              <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Postal Code" value={shippingAddress.postal_code} onChange={(e) => setShippingAddress({ ...shippingAddress, postal_code: e.target.value })} />
            </div>
          )}

          {activeStep === 1 && (
            <div className="space-y-2">
              {[
                { value: 'credit_card', label: 'Credit Card', icon: CreditCard, detail: 'Pay with Visa, Mastercard, or Amex' },
                { value: 'bank_transfer', label: 'Bank Transfer', icon: Landmark, detail: 'Direct bank transfer' },
                { value: 'cash_on_delivery', label: 'Cash on Delivery', icon: Banknote, detail: 'Pay when you receive' },
              ].map((option) => {
                const Icon = option.icon;
                return (
                  <label key={option.value} className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 ${paymentMethod === option.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                    <input type="radio" name="payment" className="mt-1" checked={paymentMethod === option.value} onChange={() => setPaymentMethod(option.value)} />
                    <Icon className="mt-0.5 h-4 w-4 text-slate-700" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                      <p className="text-xs text-slate-500">{option.detail}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">Shipping Address</p>
                <p className="text-slate-600">{shippingAddress.address_line}</p>
                <p className="text-slate-600">{shippingAddress.city}, {shippingAddress.postal_code}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">Payment Method</p>
                <p className="text-slate-600">{paymentMethod.replaceAll('_', ' ')}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">Order Items ({cart?.total_items})</p>
                <div className="mt-1 space-y-1">
                  {cart?.items?.map((item) => (
                    <div key={item.id} className="flex justify-between text-slate-700">
                      <span>{item.title} x {item.quantity}</span>
                      <span className="font-medium">${item.subtotal?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-between">
          <button disabled={activeStep === 0} onClick={() => setActiveStep((prev) => prev - 1)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50">Back</button>
          <button onClick={handleNext} disabled={loading} className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-70">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : activeStep === steps.length - 1 ? 'Place Order' : 'Next'}
          </button>
        </div>
      </div>

      <div>
        <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>${cart.total_amount?.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Shipping</span><span className={shippingFee === 0 ? 'font-medium text-emerald-600' : ''}>{shippingFee === 0 ? 'FREE' : `$${shippingFee.toFixed(2)}`}</span></div>
          </div>
          <div className="mt-3 border-t border-slate-200 pt-3">
            <div className="flex justify-between text-base font-semibold"><span>Total</span><span>${totalAmount.toFixed(2)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
