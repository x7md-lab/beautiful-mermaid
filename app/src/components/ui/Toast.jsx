import { createContext } from 'preact';
import { useCallback, useContext, useRef, useState } from 'preact/hooks';

// A tiny Preact-native toast. (Base UI's Toast store loops infinitely under
// preact/compat — RangeError: Maximum call stack size exceeded — so we roll our
// own; the rest of Base UI is fine.) Same API as before: <ToastProvider> + useToast().
const ToastContext = createContext(() => {});
let nextId = 0;

const TYPE_STYLES = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-gray-200 bg-white text-gray-800',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((x) => x.id !== id));
    const handle = timers.current.get(id);
    if (handle) clearTimeout(handle);
    timers.current.delete(id);
  }, []);

  const notify = useCallback(
    (message, kind = 'info') => {
      const id = ++nextId;
      setToasts((list) => [...list, { id, message, kind }]);
      timers.current.set(id, setTimeout(() => remove(id), kind === 'error' ? 6000 : 3000));
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div class="pointer-events-none fixed bottom-4 start-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            class={`toast-enter pointer-events-auto flex items-center gap-3 rounded-xl border px-3.5 py-2.5 shadow-lg ${
              TYPE_STYLES[toast.kind] || TYPE_STYLES.info
            }`}
          >
            <span class="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              type="button"
              aria-label="إغلاق"
              onClick={() => remove(toast.id)}
              class="text-current/50 transition hover:text-current"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Returns `notify(message, kind)` — must be used within <ToastProvider>. */
export function useToast() {
  return useContext(ToastContext);
}
