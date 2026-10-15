import { useEffect, useMemo } from 'react';
import { preconnect } from 'react-dom';
import { useTranslation } from 'react-i18next';
import Cal, { getCalApi } from '@calcom/embed-react';
import { getUtmParams, trackLead } from '../lib/tracking';
import { CALENDAR_ID } from '../lib/services';

const CAL_LINK = 'joshua-maurizio-cproiv/consulenza';

// One listener for the whole visit, however many times a calendar mounts
let leadListener = false;
function listenForBookings() {
  if (leadListener) return;
  leadListener = true;
  void getCalApi().then((cal) =>
    cal('on', {
      action: 'bookingSuccessfulV2',
      callback: (e: { detail: { data: { uid?: string } } }) => trackLead(e.detail.data.uid),
    }),
  );
}

/** The free consultation calendar (Cal.com): a booking is the ads' conversion, the ad's utm_* go along. */
const BookingCalendar = () => {
  const { t } = useTranslation('public');
  preconnect('https://app.cal.com');
  // A new object would make the embed reload: built once, with the ad's utm_* so Cal.com records the source
  const calConfig = useMemo(() => ({ layout: 'month_view' as const, theme: 'light' as const, ...getUtmParams() }), []);

  useEffect(listenForBookings, []);

  return (
    <section id={CALENDAR_ID} aria-label={t('booking.calendarLabel')} className="bg-white rounded-3xl p-2 sm:p-8 lg:p-12 shadow-lg scroll-mt-28">
      <Cal calLink={CAL_LINK} style={{ width: '100%', minHeight: '600px' }} config={calConfig} />
    </section>
  );
};

export default BookingCalendar;
