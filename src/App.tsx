import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import Home from './pages/Home';
import PageLoader from './components/ui/PageLoader';
import ErrorBoundary from './components/ErrorBoundary';
import CookieBanner from './components/CookieBanner';
import { trackPageView } from './lib/tracking';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { queryClient } from './lib/queryClient';

// Everything but the home page loads on demand: visitors never download the admin or the client area
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Services = lazy(() => import('./pages/Services'));
const Booking = lazy(() => import('./pages/Booking'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminCMS = lazy(() => import('./pages/AdminCMS'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));
const NotFound = lazy(() => import('./pages/NotFound'));

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    window.scrollTo(0, 0);
    // The tags count the landing page themselves: report the later in-app navigations
    if (first.current) first.current = false;
    else trackPageView(pathname);
  }, [pathname]);
  return null;
};

/** Providers and routes; the router comes from outside (BrowserRouter here, StaticRouter when prerendering). */
export const AppShell = ({ router: Router }: { router: (props: { children: ReactNode }) => ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <Router>
            <ScrollToTop />
            <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/services" element={<Services />} />
                <Route path="/booking" element={<Booking />} />
                <Route path="/dashboard/:token?" element={<Dashboard />} />
                <Route path="/admin/*" element={<AdminCMS />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/cookie-policy" element={<CookiePolicy />} />
                <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
                <Route path="/terms" element={<Navigate to="/terms-of-service" replace />} />
                <Route path="/cookies" element={<Navigate to="/cookie-policy" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </ErrorBoundary>
            <CookieBanner />
          </Router>
          <Analytics />
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
);

const App = () => <AppShell router={BrowserRouter} />;

export default App;
