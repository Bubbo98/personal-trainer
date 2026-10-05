import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from './api';

/**
 * Turns an error into a message for the user: known cases are translated,
 * other API errors keep the server's explanation, anything else is generic.
 */
export function useErrorMessage() {
  const { t } = useTranslation('common');
  return useCallback(
    (error: unknown, fallback?: string): string => {
      if (error instanceof ApiError) {
        if (error.code === 'NETWORK') return t('errors.network');
        if (error.code === 'PLAN_EXPIRED') return t('errors.planExpired');
        if (error.status === 401) return t('errors.sessionExpired');
        if (error.status < 500 && error.message) return error.message;
      }
      return fallback ?? t('errors.generic');
    },
    [t],
  );
}
