import { useCallback, useState } from 'react';
import type { EkadashiContent } from '../types';
import type { EkadashiLang, EkadashiTranslation, EkadashiUiStrings } from './types';
import { TE_1 } from './te-1';
import { TE_2 } from './te-2';
import { HI_1 } from './hi-1';
import { HI_2 } from './hi-2';

export { EKADASHI_LANGS } from './types';
export type { EkadashiLang } from './types';

const TRANSLATIONS: Record<Exclude<EkadashiLang, 'en'>, Record<string, EkadashiTranslation>> = {
  te: { ...TE_1, ...TE_2 },
  hi: { ...HI_1, ...HI_2 },
};

export const EKADASHI_UI: Record<EkadashiLang, EkadashiUiStrings> = {
  en: {
    ekadashi: 'Ekadashi',
    alsoKnownAs: 'Also known as',
    story: 'Story',
    storyTitle: 'Vrata Katha — the story',
    teachings: 'Prabhupada’s teachings',
    references: 'References',
    significance: 'Significance',
    specialObservance: 'Special observance',
    lessons: 'Spiritual lessons',
    storyFrom: 'From the',
    translationNote: '',
  },
  te: {
    ekadashi: 'ఏకాదశి',
    alsoKnownAs: 'ఇతర పేర్లు',
    story: 'కథ',
    storyTitle: 'వ్రత కథ',
    teachings: 'శ్రీల ప్రభుపాదుల ఉపదేశాలు',
    references: 'ఆధారాలు',
    significance: 'ప్రాముఖ్యత',
    specialObservance: 'ప్రత్యేక ఆచరణ',
    lessons: 'ఆధ్యాత్మిక పాఠాలు',
    storyFrom: 'మూలం:',
    translationNote: 'ఇది ఆంగ్ల సారాంశానికి తెలుగు అనువాదం. శ్రీల ప్రభుపాదుల ఉపదేశాలు మరియు ఆధారాలు ఆంగ్లంలోనే ఉన్నాయి.',
  },
  hi: {
    ekadashi: 'एकादशी',
    alsoKnownAs: 'अन्य नाम',
    story: 'कथा',
    storyTitle: 'व्रत कथा',
    teachings: 'श्रील प्रभुपाद के उपदेश',
    references: 'संदर्भ',
    significance: 'महत्व',
    specialObservance: 'विशेष पालन',
    lessons: 'आध्यात्मिक शिक्षाएँ',
    storyFrom: 'स्रोत:',
    translationNote: 'यह अंग्रेज़ी सारांश का हिन्दी अनुवाद है। श्रील प्रभुपाद के उपदेश और संदर्भ अंग्रेज़ी में ही हैं।',
  },
};

/** Is a translation available for this Ekadashi in this language? */
export const hasTranslation = (slug: string, lang: EkadashiLang) => lang === 'en' || !!TRANSLATIONS[lang][slug];

/**
 * The reader-facing text of an Ekadashi in the chosen language.
 * Falls back to English for anything that has not been translated.
 */
export const localizeEkadashi = (c: EkadashiContent, lang: EkadashiLang): EkadashiContent => {
  if (lang === 'en') return c;
  const t = TRANSLATIONS[lang][c.slug];
  if (!t) return c;
  return {
    ...c,
    name: t.name,
    altNames: t.altNames,
    month: t.month,
    summary: t.summary,
    significance: t.significance,
    specialObservance: c.specialObservance ? t.specialObservance || c.specialObservance : undefined,
    katha: t.katha,
    lessons: t.lessons,
  };
};

const STORAGE_KEY = 'ss_ekadashi_lang';

/** The reading language, remembered on this device */
export const useEkadashiLang = (): [EkadashiLang, (l: EkadashiLang) => void] => {
  const [lang, setLangState] = useState<EkadashiLang>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === 'te' || v === 'hi' ? v : 'en';
    } catch {
      return 'en';
    }
  });
  const setLang = useCallback((l: EkadashiLang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage unavailable */
    }
  }, []);
  return [lang, setLang];
};
