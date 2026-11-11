import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const addToast = useCallback(
    (message, type = 'info') => {
      const id = ++toastIdCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      timers.current[id] = setTimeout(() => dismiss(id), 4000);
      return id;
    },
    [dismiss]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const TYPE_STYLES = {
  info: 'bg-gray-800 border-gray-600 text-gray-100',
  success: 'bg-green-900 border-green-600 text-green-100',
  error: 'bg-red-900 border-red-600 text-red-100',
  warning: 'bg-yellow-900 border-yellow-600 text-yellow-100',
};

const TYPE_ICONS = {
  info: 'ℹ️',
  success: '✅',
  error: '❌',
  warning: '⚠️',
};

function ToastContainer({ toasts, dismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg animate-fade-in ${
            TYPE_STYLES[toast.type] || TYPE_STYLES.info
          }`}
        >
          <span className="text-lg flex-shrink-0">{TYPE_ICONS[toast.type] || TYPE_ICONS.info}</span>
          <p className="flex-1 text-sm leading-snug">{toast.message}</p>
          <button
            onClick={() => dismiss(toast.id)}
            className="text-gray-400 hover:text-gray-200 flex-shrink-0 leading-none text-lg"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
