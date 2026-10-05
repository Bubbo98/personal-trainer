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
  tiktok: 'https://www.tiktok.com/@jd.push.pull',
  tiktokHandle: '@jd.push.pull',
  deniseInstagram: 'https://www.instagram.com/lamendye',
} as const;
