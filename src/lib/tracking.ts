import { TRACKING } from '../config';
import { getConsent, onConsentChange, type Consent } from './consent';

/**
 * Advertising and statistics tags, loaded only after the visitor's consent:
 * Google (GA4 + Google Ads through one gtag.js, with Consent Mode v2) and the Meta Pixel.
 * An empty id in config.TRACKING leaves that tag off.
 */

type Gtag = (...args: unknown[]) => void;
type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[]; loaded: boolean; version: string; push: unknown };

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const hasGoogle = () => Boolean(TRACKING.ga4Id || TRACKING.googleAdsId);
let googleLoaded = false;
let metaLoaded = false;

function addScript(src: string) {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function gtag(...args: unknown[]) {
  window.dataLayer = window.dataLayer || [];
  // gtag.js reads the arguments object itself, not an array
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
  void args;
}

const googleConsent = (c: Consent | null) => ({
  analytics_storage: c?.analytics ? 'granted' : 'denied',
  ad_storage: c?.marketing ? 'granted' : 'denied',
  ad_user_data: c?.marketing ? 'granted' : 'denied',
  ad_personalization: c?.marketing ? 'granted' : 'denied',
});

function loadGoogle(consent: Consent) {
  if (!hasGoogle()) return;
  if (googleLoaded) {
    gtag('consent', 'update', googleConsent(consent));
    return;
  }
  googleLoaded = true;
  window.gtag = gtag;
  gtag('consent', 'default', googleConsent(null));
  gtag('consent', 'update', googleConsent(consent));
  gtag('js', new Date());
  if (TRACKING.ga4Id) gtag('config', TRACKING.ga4Id);
  if (TRACKING.googleAdsId) gtag('config', TRACKING.googleAdsId);
  addScript(`https://www.googletagmanager.com/gtag/js?id=${TRACKING.ga4Id || TRACKING.googleAdsId}`);
}

function loadMeta() {
  if (!TRACKING.metaPixelId || metaLoaded) return;
  metaLoaded = true;
  // Meta's standard snippet: queues calls until fbevents.js arrives
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  addScript('https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', TRACKING.metaPixelId);
  fbq('track', 'PageView');
}

function apply(consent: Consent | null) {
  if (!consent) return;
  if (consent.analytics || consent.marketing) loadGoogle(consent);
  else if (googleLoaded) gtag('consent', 'update', googleConsent(consent));
  if (consent.marketing) loadMeta();
  else window.fbq?.('consent', 'revoke');
}

const ATTRIBUTION_KEY = 'attribution';
const ATTRIBUTION_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'] as const;

/** Keeps the ad's parameters (utm_*, gclid, fbclid) of the landing page for the whole visit. */
function captureAttribution() {
  const params = new URLSearchParams(window.location.search);
  const found = Object.fromEntries(ATTRIBUTION_PARAMS.filter((p) => params.get(p)).map((p) => [p, params.get(p)!]));
  if (Object.keys(found).length === 0) return;
  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(found));
  } catch {
    /* storage blocked: the booking just won't carry the source */
  }
}

/** The ad's utm_* parameters, passed on to Cal.com so each booking records where it came from. */
export function getUtmParams(): Record<string, string> {
  try {
    const saved = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || '{}') as Record<string, string>;
    return Object.fromEntries(Object.entries(saved).filter(([key]) => key.startsWith('utm_')));
  } catch {
    return {};
  }
}

/** Called once in the browser: remembers the ad parameters and loads the consented tags. */
export function initTracking() {
  captureAttribution();
  apply(getConsent());
  onConsentChange(() => apply(getConsent()));
}

/** Single-page navigation: GA4 and the Pixel only see the first page by themselves. */
export function trackPageView(path: string) {
  const consent = getConsent();
  if (googleLoaded && consent?.analytics && TRACKING.ga4Id) gtag('event', 'page_view', { page_path: path, page_location: window.location.href });
  if (metaLoaded && consent?.marketing) window.fbq?.('track', 'PageView');
}

/** A booked consultation: the conversion the ads optimise for. `id` dedupes repeated callbacks. */
export function trackLead(id?: string) {
  const consent = getConsent();
  if (!consent) return;
  const eventId = id || `lead-${Date.now()}`;
  if (googleLoaded) {
    if (consent.analytics && TRACKING.ga4Id) gtag('event', 'generate_lead', { method: 'cal.com' });
    if (consent.marketing && TRACKING.googleAdsId && TRACKING.googleAdsLeadLabel) {
      gtag('event', 'conversion', { send_to: `${TRACKING.googleAdsId}/${TRACKING.googleAdsLeadLabel}`, transaction_id: eventId });
    }
  }
  if (metaLoaded && consent.marketing) window.fbq?.('track', 'Lead', {}, { eventID: eventId });
}
