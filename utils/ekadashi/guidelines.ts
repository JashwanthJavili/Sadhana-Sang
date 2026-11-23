import type { SourceRef } from './types';

/** General Ekadashi fasting guidance as commonly taught in ISKCON. */
export const FASTING_GUIDELINES: { title: string; points: string[] }[] = [
  {
    title: 'What not to eat',
    points: [
      'From sunrise on the fasting day until you break the fast, do not eat grains — rice, wheat, corn, millet, or anything made from their flour.',
      'Also avoid dals, beans and peas.',
      'Check packets for hidden flour, for example in hing (asafoetida), cornflour or baking powder.',
    ],
  },
  {
    title: 'What you can eat',
    points: [
      'Fruits, nuts, milk, curd, vegetables, and flours like kuttu, singhara or potato flour. Offer it to Krishna first.',
      'A full fast (with or without water) is only if your health allows. Children, elders, the sick and pregnant mothers can eat simple food without grains.',
    ],
  },
  {
    title: 'How to spend the day',
    points: [
      'Remember Krishna more: chant a little extra, read the Bhagavad-gita or Bhagavatam, and join kirtan.',
      'Rest less, keep away from arguments, and hear the story of this Ekadashi.',
    ],
  },
  {
    title: 'Breaking the fast',
    points: [
      'Break the fast the next day, within the time shown for your city, by eating Krishna prasadam.',
      'Do not break it before the start time or after the end time.',
    ],
  },
];

/** General references for the calendar rules */
export const CALENDAR_RULE_SOURCES: SourceRef[] = [
  {
    label: 'Hari-bhakti-vilasa, Vilasas 12–13 (Ekadashi, viddha-ekadashi, Mahadvadashi and parana rules)',
    note: 'Compiled by Srila Sanatana Gosvami and Gopala Bhatta Gosvami.',
  },
  {
    label: 'GCal — Gaurabda Calendar software used for ISKCON Vaishnava calendars',
  },
  {
    label: 'Caitanya-caritamrta Madhya-lila 24.342 (Ekadashi among the topics of Hari-bhakti-vilasa)',
    url: 'https://vedabase.io/en/library/cc/madhya/24/342/',
  },
];
