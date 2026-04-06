import React, { createContext, useEffect, useState, useContext } from 'react';
import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from 'lucide-react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  const showNotification = (message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  const showSuccess = (message) => {
    showNotification(message, 'success');
  };

  const showError = (message) => {
    showNotification(message, 'error');
  };

  const showWarning = (message) => {
    showNotification(message, 'warning');
  };

  const showInfo = (message) => {
    showNotification(message, 'info');
  };

  const handleClose = () => {
    setNotification({ ...notification, open: false });
  };

  useEffect(() => {
    if (!notification.open) return;
    const timer = setTimeout(() => {
      setNotification((prev) => ({ ...prev, open: false }));
    }, 4000);

    return () => clearTimeout(timer);
  }, [notification.open]);

  const value = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  const severityStyles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
  };

  const severityIcon = {
    success: <CheckCircle2 className="h-4 w-4" />,
    error: <CircleAlert className="h-4 w-4" />,
    warning: <TriangleAlert className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notification.open && (
        <div className="pointer-events-none fixed right-4 top-4 z-[100]">
          <div
            className={`pointer-events-auto flex min-w-[260px] items-start gap-2 rounded-md border px-3 py-2 text-sm shadow-md ${
              severityStyles[notification.severity] || severityStyles.info
            }`}
          >
            {severityIcon[notification.severity] || severityIcon.info}
            <p className="flex-1">{notification.message}</p>
            <button
              onClick={handleClose}
              className="rounded p-0.5 opacity-70 hover:opacity-100"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
