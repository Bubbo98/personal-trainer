import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import '../locales/dashboard';
import '../locales/admin';
import { ToastProvider } from '../components/ui/Toast';
import { ConfirmProvider } from '../components/ui/ConfirmDialog';

interface Options extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  /** Wraps the UI (e.g. in <Routes>) inside the providers. */
  path?: string;
}

/** Renders with the app's providers, a fresh query cache and Italian texts. */
export function renderWithProviders(ui: ReactElement, { route = '/', ...options }: Options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ConfirmProvider>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}

type Handler = (url: URL, init: RequestInit) => unknown;

/**
 * Replaces fetch with a tiny router: keys are "METHOD /path" (path without /api
 * and without query string). A handler returns the `data` of a success answer,
 * or a Response for anything else. Unmatched calls fail the test.
 */
export function mockApi(routes: Record<string, Handler | object | null>) {
  const calls: { method: string; path: string; url: URL; body: unknown }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init.method || 'GET').toUpperCase();
    const path = url.pathname.replace(/^\/api/, '');
    let body: unknown = init.body;
    if (typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        /* keep the raw string */
      }
    }
    calls.push({ method, path, url, body });

    const key = Object.keys(routes).find((k) => {
      const [m, pattern] = k.split(' ');
      if (m !== method) return false;
      const re = new RegExp(`^${pattern.replace(/:\w+/g, '[^/]+')}$`);
      return re.test(path);
    });
    if (!key) throw new Error(`Unexpected request ${method} ${path}`);
    const handler = routes[key];
    const result = typeof handler === 'function' ? await (handler as Handler)(url, init) : handler;
    if (result instanceof Response) return result;
    return new Response(JSON.stringify({ success: true, data: result ?? undefined }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, calls };
}

export const errorResponse = (status: number, error: string, code?: string) =>
  new Response(JSON.stringify({ success: false, error, code }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
