import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Receipt, Truck } from 'lucide-react';
import { orderService } from '../services/api';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const data = await orderService.getOrderDetail(orderId);
        setOrder(data);
      } catch (err) {
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error || 'Order not found'}</div>
        <button onClick={() => navigate('/')} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">Back to Home</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-16 w-16 text-emerald-600" />
        <h1 className="text-3xl font-bold text-slate-900">Order Confirmed!</h1>
        <p className="mt-1 text-sm text-slate-600">Thank you for your purchase. Your order has been received.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Order Details</h2>
          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{order.status}</span>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div><p className="text-slate-500">Order ID</p><p className="break-all font-medium text-slate-900">{order.id}</p></div>
          <div><p className="text-slate-500">Order Date</p><p className="text-slate-900">{new Date(order.createdAt).toLocaleDateString()}</p></div>
          <div><p className="text-slate-500">Payment Status</p><p className="text-slate-900">{order.paymentId ? 'Paid' : 'Pending'}</p></div>
          <div><p className="text-slate-500">Shipment Status</p><p className="text-slate-900">{order.shipmentId ? 'Shipped' : 'Processing'}</p></div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Order Items</h2>
        <div className="space-y-2 text-sm">
          {order.orderItems?.map((item, index) => (
            <div key={item.id || index} className="flex items-start justify-between border-b border-slate-100 pb-2 last:border-b-0">
              <div>
                <p className="font-medium text-slate-900">Book ID: {item.bookId}</p>
                <p className="text-slate-500">Quantity: {item.quantity} × ${item.priceAtOrder?.toFixed(2)}</p>
              </div>
              <p className="font-semibold text-slate-900">${item.subtotal?.toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-slate-200 pt-3 text-sm">
          <div className="mb-1 flex justify-between"><span className="text-slate-500">Subtotal</span><span>${order.totalAmount?.toFixed(2)}</span></div>
          <div className="mb-1 flex justify-between"><span className="text-slate-500">Shipping</span><span>$0.00</span></div>
          <div className="flex justify-between text-base font-semibold"><span>Total</span><span>${order.totalAmount?.toFixed(2)}</span></div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">What's Next?</h2>
        <div className="space-y-3 text-sm">
          <div className="flex gap-2"><Receipt className="mt-0.5 h-4 w-4 text-blue-600" /><p className="text-slate-700">You'll receive an email confirmation shortly.</p></div>
          <div className="flex gap-2"><Truck className="mt-0.5 h-4 w-4 text-blue-600" /><p className="text-slate-700">Track your order status in My Orders.</p></div>
        </div>
      </div>

      <div className="flex justify-center gap-2">
        <button onClick={() => navigate('/orders')} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">View My Orders</button>
        <button onClick={() => navigate('/')} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Continue Shopping</button>
      </div>
    </div>
  );
};

export default OrderConfirmation;
