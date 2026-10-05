import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '../i18n';

interface State {
  error: Error | null;
}

/**
 * Last line of defence: a crash shows a way out instead of a blank page.
 * A failed lazy chunk (new deploy while the tab was open) reloads the page once.
 */
class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
    const chunkFailed = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(error.message);
    try {
      if (chunkFailed && !sessionStorage.getItem('chunk-reload')) {
        sessionStorage.setItem('chunk-reload', '1');
        window.location.reload();
      }
    } catch {
      /* storage blocked: the user can still reload by hand */
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const t = i18n.getFixedT(null, 'common');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center" role="alert">
        <h1 className="text-2xl font-bold text-gray-900">{t('errors.crashTitle')}</h1>
        <p className="text-gray-600 max-w-md">
          {t('errors.crashMessage')}
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={() => window.location.reload()} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800">
            {t('common.retry')}
          </button>
          <a href="/" className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-white">
            {t('notFound.backHome')}
          </a>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
