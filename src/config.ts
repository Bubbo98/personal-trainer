// Same-origin by default: Vercel rewrites /api to the backend, the Vite dev server proxies it
export const API_BASE_URL: string = (import.meta.env.REACT_APP_API_URL || '/api').replace(/\/$/, '');

export const CONTACT = {
  phone: '+393282062823',
  phoneDisplay: '328 206 2823',
  email: 'josh17111991@gmail.com',
  gymAddress: "Via Cortina d'Ampezzo 14, Milano",
} as const;

export const SOCIAL = {
  instagram: 'https://www.instagram.com/mauriziojoshuapt',
  instagramHandle: '@mauriziojoshuapt',
  tiktok: 'https://www.tiktok.com/@joshua.maurizio',
  tiktokHandle: '@joshua.maurizio',
  deniseInstagram: 'https://www.instagram.com/la_mandye',
  deniseInstagramHandle: '@la_mandye',
} as const;

/**
 * Ad and statistics tags (public ids, see lib/tracking): an empty id keeps that tag off.
 * They load only after the visitor accepts the matching cookies in the banner.
 */
export const TRACKING = {
  /** Google Analytics 4, "G-XXXXXXX". */
  ga4Id: 'G-W1MY4HWDYF',
  /** Google Ads, "AW-XXXXXXX". */
  googleAdsId: '',
  /** Label of the Google Ads "consultation booked" conversion (the part after "AW-…/"). */
  googleAdsLeadLabel: '',
  /** Meta (Facebook / Instagram) Pixel id. */
  metaPixelId: '',
} as const;
