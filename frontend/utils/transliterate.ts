import Sanscript from '@indic-transliteration/sanscript';

/**
 * Turns a mantra written in English letters into Devanagari (Hindi) or Telugu script.
 *
 * - Text with diacritics (kṛṣṇa, śrī) is converted exactly.
 * - Plain spelling (krishna, shri) is first normalised to proper Sanskrit spelling
 *   using a word list of common devotional names plus Sanskrit spelling rules.
 */

/* ---------------------------------------------------------------- word list --- */

const WORDS: Record<string, string> = {
  om: 'oṃ', aum: 'oṃ',
  hare: 'hare', hari: 'hari', haribol: 'haribola', bol: 'bola',
  krishna: 'kṛṣṇa', krsna: 'kṛṣṇa', krishnaya: 'kṛṣṇāya', krsnaya: 'kṛṣṇāya',
  rama: 'rāma', ram: 'rāma', raghava: 'rāghava', raghupati: 'raghupati', sita: 'sītā', sitaram: 'sītārāma',
  radha: 'rādhā', radhe: 'rādhe', radhika: 'rādhikā', shyam: 'śyāma', shyama: 'śyāma', syama: 'śyāma',
  govinda: 'govinda', govindaya: 'govindāya', gopala: 'gopāla', gopal: 'gopāla', gopinatha: 'gopīnātha', gopijana: 'gopījana', vallabha: 'vallabha', gopi: 'gopī',
  madhava: 'mādhava', madhusudana: 'madhusūdana', keshava: 'keśava', kesava: 'keśava', mukunda: 'mukunda', murari: 'murāri', vanamali: 'vanamālī', damodara: 'dāmodara',
  narayana: 'nārāyaṇa', vasudeva: 'vāsudeva', vasudevaya: 'vāsudevāya', bhagavate: 'bhagavate', bhagavan: 'bhagavān', bhagavad: 'bhagavad', gita: 'gītā',
  giridhari: 'giridhārī', giridhara: 'giridhara', jagannatha: 'jagannātha', jagannath: 'jagannātha',
  namo: 'namo', namah: 'namaḥ', namaha: 'namaḥ', namas: 'namas', namaskar: 'namaskāra', pranama: 'praṇāma', pranam: 'praṇāma',
  jaya: 'jaya', jai: 'jaya', sri: 'śrī', shri: 'śrī', srila: 'śrīla', shrila: 'śrīla', srimad: 'śrīmad', shrimad: 'śrīmad', bhagavatam: 'bhāgavatam',
  prabhu: 'prabhu', prabhupada: 'prabhupāda', prabhupad: 'prabhupāda',
  gaura: 'gaura', gauranga: 'gaurāṅga', gaurahari: 'gaurahari', nitai: 'nitāi', nityananda: 'nityānanda', chaitanya: 'caitanya', caitanya: 'caitanya', mahaprabhu: 'mahāprabhu',
  advaita: 'advaita', gadadhara: 'gadādhara', srivasa: 'śrīvāsa', shrivasa: 'śrīvāsa', adi: 'ādi', bhakta: 'bhakta', vrinda: 'vṛnda', vrindavana: 'vṛndāvana', vrindavan: 'vṛndāvana',
  gaurabhaktavrinda: 'gaurabhaktavṛnda', bhaktavrinda: 'bhaktavṛnda', vraja: 'vraja', mathura: 'mathurā', dvaraka: 'dvārakā', dwaraka: 'dvārakā',
  vishnu: 'viṣṇu', shiva: 'śiva', siva: 'śiva', hanuman: 'hanumān', ganesha: 'gaṇeśa', ganesh: 'gaṇeśa', brahma: 'brahmā', gayatri: 'gāyatrī', lakshmi: 'lakṣmī', lakshmana: 'lakṣmaṇa',
  brahmanya: 'brahmaṇya', brahmana: 'brāhmaṇa', devaya: 'devāya', deva: 'deva', go: 'go', hitaya: 'hitāya', hita: 'hita',
  cha: 'ca', ca: 'ca', jagad: 'jagad', jagat: 'jagat', jagaddhitaya: 'jagaddhitāya', dhitaya: 'dhitāya',
  guru: 'guru', gurave: 'gurave', gurur: 'gurur', brahmaa: 'brahmā', maha: 'mahā', mantra: 'mantra', tulasi: 'tulasī', devi: 'devī',
  mam: 'mām', ekam: 'ekaṃ', sharanam: 'śaraṇaṃ', saranam: 'śaraṇaṃ', aham: 'ahaṃ', tvam: 'tvāṃ', sarva: 'sarva', papebhyo: 'pāpebhyo', moksayisyami: 'mokṣayiṣyāmi', ma: 'mā', suchah: 'śucaḥ', sucah: 'śucaḥ',
  bhur: 'bhūr', bhuvah: 'bhuvaḥ', svah: 'svaḥ', tat: 'tat', savitur: 'savitur', varenyam: 'vareṇyaṃ', bhargo: 'bhargo', devasya: 'devasya', dhimahi: 'dhīmahi', dhiyo: 'dhiyo', yo: 'yo', nah: 'naḥ', prachodayat: 'pracodayāt', pracodayat: 'pracodayāt',
  srivasadi: 'śrīvāsādi', bihari: 'bihārī', kunja: 'kuñja', kunjabihari: 'kuñjabihārī', dhari: 'dhārī', giri: 'giri', vara: 'vara', jana: 'jana', gaurabhakta: 'gaurabhakta',
  rasa: 'rasa', lila: 'līlā', nama: 'nāma', sankirtana: 'saṅkīrtana', kirtana: 'kīrtana', kirtan: 'kīrtana', bhajan: 'bhajana', arati: 'ārati', arotik: 'ārātrika',
};

/* ---------------------------------------------------------------- rules --- */

const VOWELS = 'aāiīuūṛṝḷeo';
const NATVA_TRIGGERS = 'rṛṣ';
// letters that may sit between the trigger and the n (Panini 8.4.2)
const NATVA_PASS = new Set([...'aāiīuūeoṛṝ', ...'kgpbmyvhṃ']);

const iastWord = (word: string): string => {
  const known = WORDS[word];
  if (known) return known;

  let w = word;
  w = w.replace(/aa/g, 'ā').replace(/ee/g, 'ī').replace(/oo/g, 'ū').replace(/ii/g, 'ī').replace(/uu/g, 'ū');
  w = w.replace(/gy/g, 'jñ').replace(/jn/g, 'jñ');
  w = w.replace(/chh/g, 'ch').replace(/ch/g, 'c');
  w = w.replace(/sh(?=[nt]h?|k|p|m)/g, 'ṣ').replace(/sh/g, 'ś');
  w = w.replace(/w/g, 'v');
  w = w.replace(/n(?=[kg])/g, 'ṅ').replace(/n(?=c|j)/g, 'ñ');
  // n becomes ṇ after r / ṛ / ṣ (with only certain letters between)
  const chars = [...w];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] !== 'n') continue;
    const next = chars[i + 1];
    if (next !== undefined && !(VOWELS.includes(next) || 'nmyv'.includes(next))) continue;
    for (let j = i - 1; j >= 0; j--) {
      const c = chars[j];
      if (NATVA_TRIGGERS.includes(c)) {
        chars[i] = 'ṇ';
        break;
      }
      if (!NATVA_PASS.has(c)) break;
    }
  }
  return chars.join('');
};

const HAS_DIACRITICS = /[āīūṛṝḷṅñṭḍṇśṣṃḥ]/i;
const HAS_DEVANAGARI = /[ऀ-ॿ]/;
const HAS_TELUGU = /[ఀ-౿]/;

/** Plain English-letter spelling → IAST (proper Sanskrit spelling) */
export const toIast = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\S\n]+/g, ' ')
    .split(/([^a-zāīūṛṝḷṅñṭḍṇśṣṃḥ']+)/i)
    .map((part) => (/^[a-zāīūṛṝḷṅñṭḍṇśṣṃḥ']+$/i.test(part) ? iastWord(part.replace(/'/g, '')) : part))
    .join('');

const fixDandas = (s: string) => s.replace(/\|\||।।/g, '॥').replace(/\|/g, '।');

/** Returns the mantra in the chosen script. */
export const transliterate = (text: string, to: 'hi' | 'te'): string => {
  const target = to === 'hi' ? 'devanagari' : 'telugu';
  const trimmed = text.trim();
  if (!trimmed) return '';
  // already in the script
  if (to === 'hi' && HAS_DEVANAGARI.test(trimmed)) return trimmed;
  if (to === 'te' && HAS_TELUGU.test(trimmed)) return trimmed;
  // Devanagari → Telugu
  if (to === 'te' && HAS_DEVANAGARI.test(trimmed)) return Sanscript.t(trimmed, 'devanagari', 'telugu');
  const iast = HAS_DIACRITICS.test(trimmed) ? trimmed.toLowerCase() : toIast(trimmed);
  return fixDandas(Sanscript.t(iast, 'iast', target));
};
