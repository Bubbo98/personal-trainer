import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './index.css';
import i18n from './i18n';
import App from './App';
import { initTracking } from './lib/tracking';

initTracking();

const container = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Public pages arrive prerendered in Italian (scripts/prerender-pages.mjs): hydrate them,
// render from scratch everywhere else (client area, admin, English visitors)
if (container.hasChildNodes() && i18n.resolvedLanguage === 'it') hydrateRoot(container, app);
else createRoot(container).render(app);
