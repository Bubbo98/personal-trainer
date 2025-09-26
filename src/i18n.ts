import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'it',
    debug: false,

    interpolation: {
      escapeValue: false,
    },

    resources: {
      it: {
        translation: require('./locales/it/translation.json')
      },
      en: {
        translation: require('./locales/en/translation.json')
      }
    }
  });

export default i18n;