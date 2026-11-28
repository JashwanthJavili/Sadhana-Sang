/** Languages the Ekadashi reading pages can be shown in */
export type EkadashiLang = 'en' | 'te' | 'hi';

export const EKADASHI_LANGS: { id: EkadashiLang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'te', label: 'తెలుగు' },
  { id: 'hi', label: 'हिन्दी' },
];

/**
 * A translated Ekadashi entry. It mirrors the reader-facing text fields of
 * EkadashiContent (utils/ekadashi/types.ts). References, teachings and sources
 * stay in English because they point to English editions.
 */
export interface EkadashiTranslation {
  name: string;
  altNames: string[];
  month: string;
  summary: string;
  significance: string;
  specialObservance?: string;
  katha: {
    scripture: string;
    speakers: string;
    paragraphs: string[];
  };
  lessons: string[];
}

/** Fixed labels used on the Ekadashi reading page */
export interface EkadashiUiStrings {
  ekadashi: string;
  alsoKnownAs: string;
  story: string;
  storyTitle: string;
  teachings: string;
  references: string;
  significance: string;
  specialObservance: string;
  lessons: string;
  storyFrom: string;
  translationNote: string;
}
