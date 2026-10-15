vi.mock('../config', () => ({
  TRACKING: { ga4Id: 'G-TEST', googleAdsId: 'AW-1', googleAdsLeadLabel: 'lead', metaPixelId: '123' },
}));

const scripts = () => [...document.head.querySelectorAll('script')].map((s) => s.src);

// tracking keeps module state (tags loaded once per visit): fresh copies per test, consent included
async function load(search = '') {
  vi.resetModules();
  window.history.replaceState(null, '', `/${search}`);
  return { ...(await import('./tracking')), ...(await import('./consent')) };
}

// Each fresh copy adds its own click listener on document: removed after the test
const listeners: [string, EventListenerOrEventListenerObject][] = [];
const addListener = document.addEventListener.bind(document);
beforeEach(() => {
  vi.spyOn(document, 'addEventListener').mockImplementation((type: string, fn: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions) => {
    listeners.push([type, fn]);
    addListener(type, fn, opts);
  });
});
afterEach(() => {
  listeners.splice(0).forEach(([type, fn]) => document.removeEventListener(type, fn));
  vi.restoreAllMocks();
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.head.querySelectorAll('script').forEach((s) => s.remove());
  delete window.dataLayer;
  delete window.gtag;
  delete window.fbq;
});

describe('tracking', () => {
  it('loads nothing before the visitor chooses', async () => {
    const { initTracking, trackLead } = await load();
    initTracking();
    trackLead('x');
    expect(scripts()).toEqual([]);
    expect(window.dataLayer).toBeUndefined();
  });

  it('statistics only: Google loads with ads denied, no Meta Pixel', async () => {
    const { initTracking, saveConsent } = await load();
    initTracking();
    saveConsent({ analytics: true, marketing: false });

    expect(scripts()).toEqual(['https://www.googletagmanager.com/gtag/js?id=G-TEST']);
    const consentUpdate = window.dataLayer!.map((args) => [...(args as unknown[])]).find((a) => a[0] === 'consent' && a[1] === 'update');
    expect(consentUpdate![2]).toMatchObject({ analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied' });
    expect(window.fbq).toBeUndefined();
  });

  it('a booking with full consent is a lead for GA4, Google Ads and Meta', async () => {
    const { initTracking, trackLead, saveConsent } = await load();
    initTracking();
    saveConsent({ analytics: true, marketing: true });
    const fbq = vi.fn();
    window.fbq!.callMethod = fbq;

    trackLead('booking-uid');

    const events = window.dataLayer!.map((args) => [...(args as unknown[])]).filter((a) => a[0] === 'event');
    expect(events).toContainEqual(['event', 'generate_lead', { method: 'cal.com' }]);
    expect(events).toContainEqual(['event', 'conversion', { send_to: 'AW-1/lead', transaction_id: 'booking-uid' }]);
    expect(fbq).toHaveBeenCalledWith('track', 'Lead', {}, { eventID: 'booking-uid' });
    expect(scripts()).toContain('https://connect.facebook.net/en_US/fbevents.js');
  });

  it('a tap on a phone link is a contact for GA4 and Meta, not an Ads conversion', async () => {
    const { initTracking, saveConsent } = await load();
    initTracking();
    saveConsent({ analytics: true, marketing: true });
    const fbq = vi.fn();
    window.fbq!.callMethod = fbq;
    const link = document.createElement('a');
    link.href = 'tel:+390000000000';
    link.innerHTML = '<span>328</span>';
    link.addEventListener('click', (e) => e.preventDefault());
    document.body.appendChild(link);

    link.querySelector('span')!.click();
    link.remove();

    const events = window.dataLayer!.map((args) => [...(args as unknown[])]).filter((a) => a[0] === 'event');
    expect(events).toContainEqual(['event', 'contact', { method: 'phone' }]);
    expect(events.some((a) => a[1] === 'conversion')).toBe(false);
    expect(fbq).toHaveBeenCalledWith('track', 'Contact');
  });

  it('a phone tap before consent sends nothing', async () => {
    const { initTracking } = await load();
    initTracking();
    const link = document.createElement('a');
    link.href = 'tel:+390000000000';
    link.addEventListener('click', (e) => e.preventDefault());
    document.body.appendChild(link);
    link.click();
    link.remove();
    expect(window.dataLayer).toBeUndefined();
  });

  it('keeps the ad utm_* of the landing page for the booking', async () => {
    const { initTracking, getUtmParams } = await load('?utm_source=instagram&utm_campaign=ottobre&fbclid=abc&other=1');
    initTracking();
    expect(getUtmParams()).toEqual({ utm_source: 'instagram', utm_campaign: 'ottobre' });

    // Later pages of the visit have no parameters: the first ones stay
    const again = await load();
    again.initTracking();
    expect(again.getUtmParams()).toEqual({ utm_source: 'instagram', utm_campaign: 'ottobre' });
  });
});
