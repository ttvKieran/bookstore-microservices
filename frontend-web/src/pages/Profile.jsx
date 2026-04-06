import React, { useState, useEffect } from 'react';
import { Loader2, Save, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { customerService } from '../services/api';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', phone: '', email: '' });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      const updatedData = await customerService.updateProfile(user.id, {
        full_name: formData.full_name,
        phone: formData.phone,
      });
      updateUser(updatedData);
      showSuccess('Profile updated successfully!');
      setEditing(false);
    } catch (err) {
      showError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: user.full_name || '',
      phone: user.phone || '',
      email: user.email || '',
    });
    setEditing(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <UserRound className="h-9 w-9" />
          </div>
          <div>
            <p className="text-xl font-semibold text-slate-900">{user?.full_name || user?.username}</p>
            <p className="text-sm text-slate-500">Customer Account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
            <input className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm" value={user?.username || ''} disabled />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm" value={formData.email} disabled />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2 disabled:bg-slate-100"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              disabled={!editing}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone Number</label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2 disabled:bg-slate-100"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={!editing}
              placeholder="+84123456789"
            />
          </div>

          <div className="sm:col-span-2 text-sm text-slate-500">
            Member since: {new Date(user?.created_at || Date.now()).toLocaleDateString()}
          </div>

          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            {editing ? (
              <>
                <button type="button" onClick={handleCancel} disabled={loading} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-70">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setEditing(true)} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
                Edit Profile
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Account Information</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">User ID</p>
            <p className="text-sm text-slate-900 break-all">{user?.id}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Account Status</p>
            <p className="text-sm font-medium text-emerald-600">Active</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
