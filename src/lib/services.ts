/** The services shown on the home page and on /services (texts in public.json → services.<key>). */
export const SERVICES = [
  { id: '1to1', key: 'personal', image: '/Servizi/1to1.webp' },
  { id: 'calisthenics', key: 'calisthenics', image: '/Servizi/CalEFun.webp' },
  { id: 'bodybuilding', key: 'bodybuilding', image: '/Servizi/BodyEPer.webp' },
  { id: 'groups', key: 'groupClasses', image: '/Servizi/CorsiGruppo.webp' },
  { id: 'online', key: 'onlineCoaching', image: '/Servizi/CoachingOnline.webp' },
] as const;

export type Service = (typeof SERVICES)[number];

/** Where every "book" button leads: the free consultation calendar. */
export const BOOKING_PATH = '/booking#booking-calendar';
