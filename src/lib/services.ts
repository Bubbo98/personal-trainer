/**
 * The services shown on the home page and on /services (texts in public.json → services.<key>);
 * online coaching comes first. `page` is a service's own landing page, where the home card leads.
 */
export const SERVICES = [
  { id: 'online', key: 'onlineCoaching', image: '/Servizi/CoachingOnline.webp', page: '/coaching-online' },
  { id: '1to1', key: 'personal', image: '/Servizi/1to1.webp' },
  { id: 'calisthenics', key: 'calisthenics', image: '/Servizi/CalEFun.webp' },
  { id: 'bodybuilding', key: 'bodybuilding', image: '/Servizi/BodyEPer.webp' },
  { id: 'groups', key: 'groupClasses', image: '/Servizi/CorsiGruppo.webp' },
] as const;

export type Service = (typeof SERVICES)[number];

/** Where a service's card leads: its own page, or its section of /services. */
export const servicePath = (service: Service) => ('page' in service ? service.page : `/services#${service.id}`);

/** Id of the free consultation calendar, where every "book" button leads. */
export const CALENDAR_ID = 'booking-calendar';
export const BOOKING_PATH = `/booking#${CALENDAR_ID}`;
