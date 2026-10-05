import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import itCommon from './locales/it/common.json';
import enCommon from './locales/en/common.json';
import itPublic from './locales/it/public.json';
import enPublic from './locales/en/public.json';

export const LANGUAGES = ['it', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/**
 * common + public ship with the first page; dashboard, admin and legal texts
 * are registered by their (lazily loaded) pages through registerTranslations.
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      it: { common: itCommon, public: itPublic },
      en: { common: enCommon, public: enPublic },
    },
    ns: ['common', 'public'],
    defaultNS: 'common',
    fallbackLng: 'it',
    supportedLngs: LANGUAGES,
    load: 'languageOnly',
    partialBundledLanguages: true,
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
    interpolation: { escapeValue: false }, // React already escapes
  });

const syncHtmlLang = (lng: string) => document.documentElement.setAttribute('lang', lng.slice(0, 2));
syncHtmlLang(i18n.resolvedLanguage || 'it');
i18n.on('languageChanged', syncHtmlLang);

/** Adds a namespace bundled with a lazily loaded page. */
export function registerTranslations(ns: string, bundles: Record<Language, object>) {
  for (const lng of LANGUAGES) {
    if (!i18n.hasResourceBundle(lng, ns)) i18n.addResourceBundle(lng, ns, bundles[lng]);
  }
}

/** The active language, narrowed to the supported ones. */
export const currentLanguage = (): Language => (i18n.resolvedLanguage === 'en' ? 'en' : 'it');

export default i18n;
