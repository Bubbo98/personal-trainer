import { SITE_URL } from '../../../lib/usePageMeta';
import type { LegalDoc } from '../types';
import { ENGLISH_NOTICE } from './notice';
import { OWNER } from './owner';

const cookies: LegalDoc = {
  title: 'Cookie Policy',
  subtitle: 'How this website uses cookies and similar technologies',
  updated: '2026-10-12',
  notice: ENGLISH_NOTICE,
  sections: [
    {
      title: '1. What Cookies Are',
      blocks: [
        {
          p: 'Cookies are small text files stored on your device when you visit a website. They let the site recognise your device and remember some information about your preferences or actions.',
        },
        {
          box: [
            {
              list: [
                '**Storage:** when you visit the site, cookies are saved in your browser',
                '**Reading:** on later visits, the site can read the saved cookies',
                '**Expiry:** each cookie has an expiry date after which it is deleted automatically',
                '**Control:** you can always view, change or delete cookies in your browser settings',
              ],
            },
          ],
          title: '🍪 How Cookies Work',
          tone: 'blue',
        },
      ],
    },
    {
      title: '2. Data Controller',
      blocks: [
        {
          box: [
            { p: `**Name:** ${OWNER.name}` },
            { p: `**Tax code:** ${OWNER.taxCode}` },
            { p: `**VAT number:** ${OWNER.vat}` },
            { p: `**Address:** ${OWNER.address}` },
            { p: `**Email:** ${OWNER.email}` },
            { p: `**Website:** ${SITE_URL}` },
          ],
        },
      ],
    },
    {
      title: '3. Types of Cookies Used',
      blocks: [
        { p: 'The site sets no cookies of its own. To work, it keeps some information in your browser’s storage (local storage and session storage); the third-party services listed below may set their own cookies.' },
        { h3: '🔧 Technical Storage (Necessary)' },
        { p: 'Essential for the site to work: under current rules it needs no consent.' },
        {
          table: {
            head: ['Name', 'Purpose', 'Duration'],
            rows: [
              ['i18nextLng', 'Chosen language (Italian or English)', 'Until deleted from the browser'],
              ['cookie-consent', 'Your cookie choices and when you made them', 'Until you change or delete them'],
              ['dashboard_auth_token', 'Client area login (clients only)', 'Until you log out'],
              ['dashboard_link', 'Your personal client area link, to get back in without opening it again (clients only)', 'Until you log out'],
              ['admin_auth_token', 'Admin area login (the trainer only)', 'Until logout'],
              ['attribution', 'Parameters of the ad you came from (utm_source, utm_campaign…), passed on to the booking', 'Until the tab is closed'],
              ['chunk-reload', 'One reload of the page after a site update', 'Until the tab is closed'],
            ],
          },
        },
        { h3: '🔗 Third-Party Cookies' },
        { p: 'These cookies are set by third-party services built into our site.' },
        { h4: 'Cal.com (Booking System)' },
        { p: 'The calendar on the "Book" page is provided by Cal.com, which may set technical cookies needed for the calendar and the booking (e.g. time zone, session).' },
        { p: 'Cal.com Privacy Policy: [https://cal.com/privacy](https://cal.com/privacy)', muted: true },
        { h4: 'Vercel Analytics (Traffic Analysis)' },
        {
          table: {
            head: ['Cookie/Technology', 'Purpose', 'Duration'],
            rows: [
              ['Vercel Analytics', 'Anonymous analysis of web traffic, pages visited, devices (no cookies)', '-'],
            ],
          },
        },
        { p: 'Vercel Privacy Policy: [https://vercel.com/legal/privacy-policy](https://vercel.com/legal/privacy-policy)', muted: true },
        {
          box: [{ p: '**Note:** Vercel Analytics collects anonymous, aggregated data on site traffic. It uses no persistent cookies and respects user privacy with no personal tracking.' }],
          tone: 'green',
        },
        { h3: '📊 Statistics Cookies (only with consent)' },
        { p: 'Turned on only if you choose "Statistics" or "Accept all" in the banner. They tell us, in aggregate, how many people visit the site and which pages they view.' },
        { h4: 'Google Analytics 4' },
        {
          table: {
            head: ['Cookie', 'Purpose', 'Duration'],
            rows: [
              ['_ga', 'Tells visitors apart (random identifier)', '2 years'],
              ['_ga_<ID>', 'Keeps the session state', '2 years'],
            ],
          },
        },
        { p: 'Google Privacy Policy: [https://policies.google.com/privacy](https://policies.google.com/privacy)', muted: true },
        { h3: '📣 Marketing Cookies (only with consent)' },
        { p: 'Turned on only if you choose "Marketing" or "Accept all" in the banner. They measure how many consultations come from our ads on Google, Instagram and Facebook and show our ads to people who already visited the site.' },
        {
          table: {
            head: ['Service', 'Cookie', 'Purpose', 'Duration'],
            rows: [
              ['Google Ads', '_gcl_au, _gcl_aw', 'Measures conversions (booked consultations) from Google ads', '90 days'],
              ['Meta Pixel (Facebook, Instagram)', '_fbp, _fbc', 'Measures conversions and audiences of Meta ads', '90 days'],
            ],
          },
        },
        { p: 'Meta Privacy Policy: [https://www.facebook.com/privacy/policy](https://www.facebook.com/privacy/policy)', muted: true },
        { h4: 'Google Maps (Interactive Maps)' },
        {
          table: {
            head: ['Cookie', 'Purpose', 'Duration'],
            rows: [
              ['NID', 'Stores preferences and user information', '6 months'],
              ['CONSENT', 'Google cookie consent status', '20 years'],
              ['1P_JAR', 'Collects statistics and tracks conversions', '1 month'],
            ],
          },
        },
        { p: 'Google Privacy Policy: [https://policies.google.com/privacy](https://policies.google.com/privacy)', muted: true },
        { p: '**Where it is used:** the map on the Contact page. The map (and its cookies) loads only if you press "Show the map".', muted: true },
      ],
    },
    {
      title: '4. Legal Basis for Using Cookies',
      blocks: [
        {
          grid: [
            {
              title: 'Technical Cookies',
              tone: 'green',
              blocks: [{ p: '**Legal basis:** Legitimate interest (Art. 6(1)(f) GDPR)' }, { p: '**Reason:** essential for the site to work' }, { p: '**Consent:** not required' }],
            },
            {
              title: 'Statistics and Marketing Cookies',
              tone: 'blue',
              blocks: [
                { p: '**Legal basis:** Consent (Art. 6(1)(a) GDPR)' },
                { p: '**Reason:** visit statistics and ad measurement' },
                { p: '**Consent:** requested through the banner, per category; off until you allow them' },
              ],
            },
          ],
        },
        {
          box: [
            {
              list: [
                '**GDPR:** EU Regulation 2016/679',
                '**ePrivacy Directive:** Directive 2002/58/EC',
                '**Italian Privacy Code:** Legislative Decree 196/2003 (as amended)',
                '**Guidelines:** Italian Data Protection Authority decision of 8 May 2014',
              ],
            },
          ],
          title: '🏛️ Legal References',
        },
      ],
    },
    {
      title: '5. How We Manage Consent',
      blocks: [
        { h3: '🍪 Cookie Banner' },
        { p: 'On your first visit, a notice banner lets you:' },
        { list: ['Accept all cookies', 'Reject non-essential cookies', 'Customise your preferences', 'Read this full Cookie Policy'] },
        { h3: '⚙️ Preference Centre' },
        { p: 'You can change your cookie preferences at any time through:' },
        { list: ['The "Cookie settings" link at the bottom of every page', 'Your web browser settings'] },
        {
          box: [{ p: 'Your consent is valid when it is **freely given, specific, informed and unambiguous**. You can withdraw it at any time as easily as you gave it.' }],
          title: '✅ Valid Consent',
          tone: 'green',
        },
      ],
    },
    {
      title: '6. How to Disable Cookies',
      blocks: [
        { p: 'You can control and manage cookies in several ways. Removing or blocking cookies may affect your experience and some site features may not work properly.' },
        { h3: '🌐 Browser Settings' },
        {
          grid: [
            { title: 'Google Chrome', blocks: [{ list: ['Menu → Settings', 'Privacy and security', 'Cookies and other site data', 'Manage cookies'], ordered: true }] },
            { title: 'Mozilla Firefox', blocks: [{ list: ['Menu → Settings', 'Privacy & Security', 'Cookies and Site Data', 'Manage Data'], ordered: true }] },
            { title: 'Safari', blocks: [{ list: ['Settings → Privacy', 'Manage Website Data', 'Remove All / individual sites'], ordered: true }] },
            { title: 'Microsoft Edge', blocks: [{ list: ['Menu → Settings', 'Privacy, search, and services', 'Cookies and site permissions', 'Manage cookies'], ordered: true }] },
          ],
        },
        { h3: '🕵️ Private/Incognito Browsing' },
        { p: 'Private browsing does not save cookies, history or temporary data:' },
        {
          list: [
            '**Chrome:** Ctrl+Shift+N (Windows) / Cmd+Shift+N (Mac)',
            '**Firefox:** Ctrl+Shift+P (Windows) / Cmd+Shift+P (Mac)',
            '**Safari:** Cmd+Shift+N',
            '**Edge:** Ctrl+Shift+N',
          ],
        },
        { h3: '📱 Mobile Devices' },
        {
          grid: [
            { title: 'iOS (iPhone/iPad)', blocks: [{ list: ['Settings → Safari', 'Privacy & Security', 'Block All Cookies', 'Clear History and Website Data'], ordered: true }] },
            { title: 'Android', blocks: [{ list: ['Chrome → Menu → Settings', 'Site settings', 'Cookies', 'On/Off'], ordered: true }] },
          ],
        },
        {
          box: [{ p: 'If you disable all cookies, some features may not work properly, such as access to the client area, saved preferences and booking.' }],
          title: '⚠️ Warning',
          tone: 'amber',
        },
      ],
    },
    {
      title: '7. Managing Third-Party Cookies',
      blocks: [
        { p: 'Some services built into our site use their own cookies. You can manage them directly in those services’ settings:' },
        {
          grid: [
            {
              title: 'Cal.com (Bookings)',
              blocks: [
                { p: 'Consultation booking system on the "Book" page.', muted: true },
                { list: ['Cookies for the calendar', 'Time-zone preferences', 'Temporary booking data'] },
                { p: '[Privacy Policy →](https://cal.com/privacy) · Opt-out available' },
              ],
            },
            {
              title: 'Google Maps (Maps)',
              blocks: [
                { p: 'Map on the Contact page, loaded only if you press "Show the map".', muted: true },
                { list: ['Cookies for the map', 'Display preferences', 'Usage statistics'] },
                { p: '[Privacy Policy →](https://policies.google.com/privacy) · Manageable in the browser' },
              ],
            },
            {
              title: 'Vercel Analytics (Statistics)',
              blocks: [
                { p: 'Anonymous web traffic analysis to improve the user experience.', muted: true },
                { list: ['Anonymous, aggregated data', 'No personal tracking', 'Privacy by design'] },
                { p: '[Privacy Policy →](https://vercel.com/legal/privacy-policy) · Privacy-friendly' },
              ],
            },
          ],
        },
        {
          box: [
            {
              list: [
                '**Your Online Choices:** [www.youronlinechoices.com](https://www.youronlinechoices.com/)',
                '**Network Advertising Initiative:** [optout.networkadvertising.org](https://optout.networkadvertising.org/)',
                '**Digital Advertising Alliance:** [optout.aboutads.info](https://optout.aboutads.info/)',
              ],
            },
          ],
          title: '🔗 Useful Opt-out Links',
        },
      ],
    },
    {
      title: '8. Local Storage and Similar Technologies',
      blocks: [
        { p: 'Besides cookies, we use other local storage technologies to improve the site’s functionality:' },
        { h3: '💾 Local Storage' },
        { p: '**What it stores:**' },
        { list: ['Chosen language', 'Cookie choices', 'Client area login (clients only)'] },
        { p: '**How to delete it:** Browser settings → Clear browsing data → Local storage' },
        { h3: '🔄 Session Storage' },
        { p: 'Temporary data deleted automatically when the browser closes. Used for the React application and navigation between pages.' },
      ],
    },
    {
      title: '9. International Data Transfers',
      blocks: [
        { p: 'Some third-party cookies may involve data transfers to non-EU countries:' },
        {
          box: [
            { p: '**United States:**' },
            { list: ['Cal.com - Booking system', 'Google (Maps, Analytics, Ads) - Maps, statistics and advertising', 'Meta (Facebook, Instagram) - Advertising', 'Vercel - Hosting and analytics'] },
            { p: '**Safeguards:** EU-US Data Privacy Framework, EU Standard Contractual Clauses' },
            { p: '**Rights:** you can always withdraw consent and ask for your data to be deleted' },
          ],
          title: '🌍 Countries Involved',
          tone: 'blue',
        },
      ],
    },
    {
      title: '10. Changes to this Cookie Policy',
      blocks: [
        { p: 'This Cookie Policy is updated from time to time to reflect changes in the cookies used or in the rules.' },
        { h3: '📬 How We Inform You' },
        { list: ['Updating the date at the top of this document', 'A banner on the site for material changes', 'Email to registered users (where applicable)'] },
        { h3: '📅 Check Regularly' },
        { p: 'We recommend checking this page from time to time to stay informed about our cookie practices and your options.' },
      ],
    },
    {
      title: 'Cookie Contacts',
      blocks: [
        { p: 'For specific questions about the cookies used on this site or to exercise your rights:' },
        {
          box: [
            { p: `**${OWNER.name}**` },
            { p: OWNER.address },
            { p: `Email: [${OWNER.email}](mailto:${OWNER.email})` },
            { p: `Phone: ${OWNER.phone}` },
          ],
        },
        { p: '**Technical support:** for technical issues with cookies or browser settings, our support team is available Monday-Friday, 9:00-17:00.', muted: true },
        { p: 'Version 1.0 - First publication', muted: true },
      ],
    },
  ],
};

export default cookies;
