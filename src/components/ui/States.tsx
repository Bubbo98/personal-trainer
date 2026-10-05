import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FiAlertCircle } from 'react-icons/fi';
import Button from './Button';
import Spinner from './Spinner';

/** Nothing to show yet: icon, title, explanation and an optional action. */
export const EmptyState = ({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: ReactNode;
  action?: ReactNode;
}) => (
  <div className="bg-gray-50 border border-gray-200 rounded-xl px-6 py-10 text-center">
    {icon && <div className="flex justify-center mb-3 text-gray-400">{icon}</div>}
    <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
    {message && <p className="text-gray-500 text-sm max-w-md mx-auto">{message}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/** A failed load, with a retry button. */
export const ErrorState = ({ message, onRetry }: { message?: string; onRetry?: () => void }) => {
  const { t } = useTranslation('common');
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-8 text-center" role="alert">
      <FiAlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" aria-hidden />
      <p className="text-red-700 mb-4">{message || t('errors.loadFailed')}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
};

export const LoadingState = ({ label }: { label?: string }) => {
  const { t } = useTranslation('common');
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500" role="status">
      <Spinner size="lg" />
      <span className="text-sm">{label ?? t('common.loading')}</span>
    </div>
  );
};

const ALERT_STYLES = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-300 text-green-800',
  warning: 'bg-orange-50 border-orange-300 text-orange-800',
  error: 'bg-red-50 border-red-200 text-red-700',
} as const;

/** Inline message box. */
export const Alert = ({
  kind = 'info',
  icon,
  title,
  children,
  className = '',
}: {
  kind?: keyof typeof ALERT_STYLES;
  icon?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) => (
  <div
    className={`flex items-start gap-3 border rounded-xl px-4 py-3 ${ALERT_STYLES[kind]} ${className}`}
    role={kind === 'error' ? 'alert' : undefined}
  >
    {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
    <div className="min-w-0">
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className="text-sm">{children}</div>}
    </div>
  </div>
);

/** Grey placeholder block while content loads. */
export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-200 rounded-lg animate-pulse ${className}`} aria-hidden />
);
