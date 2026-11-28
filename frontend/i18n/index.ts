import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import hi from './locales/hi';
import te from './locales/te';

/**
 * i18n holds the text of mantras in English, Hindi and Telugu (`known.*`).
 * The app itself stays in English; each mantra picks its own language with
 * `i18n.getFixedT('hi')` and friends.
 */
i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi }, te: { translation: te } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
