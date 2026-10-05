import 'i18next';
import type common from './locales/it/common.json';
import type publicNs from './locales/it/public.json';
import type dashboard from './locales/it/dashboard.json';
import type admin from './locales/it/admin.json';

// Typed keys: tsc rejects a t('…') key missing from the Italian files
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      public: typeof publicNs;
      dashboard: typeof dashboard;
      admin: typeof admin;
    };
  }
}
