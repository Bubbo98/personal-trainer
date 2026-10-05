// Same-origin by default: Vercel rewrites /api to the backend, the Vite dev server proxies it
export const API_BASE_URL: string = (import.meta.env.REACT_APP_API_URL || '/api').replace(/\/$/, '');
