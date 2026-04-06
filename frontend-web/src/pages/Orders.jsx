import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Package, Truck, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/api';

const statusClasses = {
  delivered: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-emerald-100 text-emerald-700',
  confirmed: 'bg-blue-100 text-blue-700',
  pending: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-rose-100 text-rose-700',
  canceled: 'bg-rose-100 text-rose-700',
  processing: 'bg-amber-100 text-amber-700',
  shipped: 'bg-amber-100 text-amber-700',
};

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const data = await orderService.getCustomerOrders(user.id, 1, 20);
        setOrders(data.orders || []);
      } catch (err) {
        setError('Failed to load orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (error) {
    return <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <Package className="mx-auto mb-3 h-16 w-16 text-slate-400" />
        <h1 className="text-2xl font-bold text-slate-900">No orders yet</h1>
        <p className="mt-1 text-slate-500">You haven't placed any orders yet. Start shopping!</p>
        <button onClick={() => navigate('/')} className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">Start Shopping</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold text-slate-900">My Orders</h1>
      <p className="mb-4 text-slate-500">View and track your orders</p>

      <div className="space-y-3">
        {orders.map((order) => {
          const statusKey = order.status?.toLowerCase();
          return (
            <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 md:grid-cols-5 md:items-center">
                <div>
                  <p className="text-xs text-slate-500">Order ID</p>
                  <p className="truncate text-sm font-semibold text-slate-900">{order.id?.substring(0, 13)}...</p>
                  <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClasses[statusKey] || 'bg-slate-100 text-slate-700'}`}>
                    {order.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Amount</p>
                  <p className="text-lg font-semibold text-blue-600">${order.totalAmount?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Items</p>
                  <p className="text-sm text-slate-900">{order.orderItems?.length || 0} item(s)</p>
                </div>
                <div className="text-right">
                  <button onClick={() => navigate(`/order-confirmation/${order.id}`)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Eye className="h-4 w-4" /> View Details
                  </button>
                </div>
              </div>

              {order.orderItems && order.orderItems.length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
                  <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Order Items</p>
                  {order.orderItems.slice(0, 2).map((item, index) => (
                    <p key={index}>• Book ID {item.bookId} - Qty: {item.quantity} - ${item.subtotal?.toFixed(2)}</p>
                  ))}
                  {order.orderItems.length > 2 && <p>... and {order.orderItems.length - 2} more item(s)</p>}
                </div>
              )}

              {order.shipmentId && (
                <div className="mt-3 flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <Truck className="h-4 w-4 text-blue-600" /> Shipment ID: <strong>{order.shipmentId}</strong>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Orders;
