import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const STYLES: Record<ToastKind, { box: string; Icon: typeof FiInfo }> = {
  success: { box: 'bg-green-600', Icon: FiCheckCircle },
  error: { box: 'bg-red-600', Icon: FiAlertCircle },
  info: { box: 'bg-gray-900', Icon: FiInfo },
};

const DURATION_MS: Record<ToastKind, number> = { success: 3500, info: 5000, error: 7000 };

/** Non-blocking notifications, replacing window.alert. */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation('common');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), DURATION_MS[kind]);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
      info: (message) => show('info', message),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Above the client area's bottom bar on phones */}
      <div className="fixed z-[60] inset-x-0 bottom-20 sm:bottom-6 flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
        {toasts.map(({ id, kind, message }) => {
          const { box, Icon } = STYLES[kind];
          return (
            <div
              key={id}
              role={kind === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-3 max-w-md w-full text-white rounded-xl shadow-lg px-4 py-3 ${box}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden />
              <p className="flex-1 text-sm whitespace-pre-line break-words">{message}</p>
              <button type="button" onClick={() => dismiss(id)} className="opacity-80 hover:opacity-100" aria-label={t('common.close')}>
                <FiX className="w-4 h-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast needs a <ToastProvider>');
  return api;
}
