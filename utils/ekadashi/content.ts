import type { EkadashiContent, PrabhupadaTeaching, SourceRef } from './types';

/**
 * Reading content for the 26 Ekadashis observed in ISKCON.
 *
 * • Story texts are faithful summaries IN OUR OWN WORDS of the traditional
 *   Ekadasi-mahatmyas as published by ISKCON Desire Tree (links in `sources`).
 *   They are not verbatim translations.
 * • Srila Prabhupada's teachings are PARAPHRASES with exact Vedabase
 *   references. No quotation is shown as verbatim unless an admin pastes it
 *   from Vedabase and marks it verified.
 * • Every entry starts as `needs_review`; an admin verifies it in the Admin
 *   Panel → Ekadashi → Content.
 */

/* ---------------------------------------------------- Shared references --- */

const VB = 'https://vedabase.io/en/library';

const T_AMBARISA: PrabhupadaTeaching = {
  summary:
    'Maharaja Ambarisa and his queen kept the vow of Ekadashi and Dvadashi for a full year to worship Krishna. In the purport Srila Prabhupada explains that observing Ekadashi regularly is essential for anyone serious about Krishna consciousness, because it pleases the Lord.',
  reference: 'Srimad-Bhagavatam 9.4.29 (verse and purport)',
  url: `${VB}/sb/9/4/29/`,
};
const T_PARANA: PrabhupadaTeaching = {
  summary:
    'When only a short time of Dvadashi remained and his guest Durvasa had not returned, Ambarisa Maharaja broke his fast by sipping water — which counts as both eating and not eating — so as to honour the Dvadashi parana without offending the brahmana. The pastime shows how seriously devotees regard breaking the fast on time.',
  reference: 'Srimad-Bhagavatam 9.4.38–40',
  url: `${VB}/sb/9/4/39-40/`,
};
const T_CAITANYA: PrabhupadaTeaching = {
  summary:
    'Even as a child, Sri Caitanya Mahaprabhu asked His mother, Sacimata, not to eat grains on Ekadashi, and she accepted this from then on. In the purport Srila Prabhupada explains that grains are not to be eaten on Ekadashi — even maha-prasadam grains are kept for the next day — and that Mahaprabhu established the observance for everyone.',
  reference: 'Caitanya-caritamrta Adi-lila 15.9–10 (purports)',
  url: `${VB}/cc/adi/15/9/`,
};
const T_NOD: PrabhupadaTeaching = {
  summary:
    'Observing the Ekadashi fast is listed among the first principles of regulated devotional service. Fasting reduces the demands of the body so that the time can be used for the Lord’s service, and the best way to pass the day is in remembering Govinda’s pastimes and hearing His holy name.',
  reference: 'The Nectar of Devotion, chapters 6 and 7',
  url: `${VB}/nod/7/`,
};
const T_TLC: PrabhupadaTeaching = {
  summary:
    'For beginners, Srila Prabhupada advises that on Ekadashi one should give up grains, cereals and beans, take simple foods such as vegetables and milk moderately, and increase chanting and the reading of scripture.',
  reference: 'Teachings of Lord Caitanya, chapter 12',
  url: `${VB}/tlc/12/`,
};
const T_LETTER: PrabhupadaTeaching = {
  summary:
    'Srila Prabhupada wrote that real Ekadashi means fasting together with chanting: fasting makes chanting easier, so on this day one should chant as many rounds as possible and set aside other business unless it is urgent.',
  reference: 'Letter to Jadurani, Los Angeles, 9 July 1971',
  url: 'https://prabhupadabooks.com/letters/los_angeles/july/09/1971/jadurani',
};
const T_BG1154: PrabhupadaTeaching = {
  summary:
    'In explaining how the Lord is understood only by pure devotional service, Srila Prabhupada mentions fasting on Janmastami and on the two monthly Ekadashis as recommended austerities for devotees.',
  reference: 'Bhagavad-gita 11.54 (purport)',
  url: `${VB}/bg/11/54/`,
};
const T_SB82725: PrabhupadaTeaching = {
  summary: 'Fasting on the two Ekadashis of every month is listed among the regulated practices that help the devotee become detached and fixed in devotional service.',
  reference: 'Srimad-Bhagavatam 3.27.22 (purport)',
  url: `${VB}/sb/3/27/22/`,
};
const T_SB81625: PrabhupadaTeaching = {
  summary: 'Devotees avoid grains on Ekadashi; in connection with the payo-vrata, taking only milk on Dvadashi is mentioned as recommended.',
  reference: 'Srimad-Bhagavatam 8.16.25 (purport)',
  url: `${VB}/sb/8/16/25/`,
};
const T_SB428: PrabhupadaTeaching = {
  summary: 'Vaishnava fasts such as Ekadashi help a devotee avoid excess eating, oversleeping and laziness, keeping the body fit for service.',
  reference: 'Srimad-Bhagavatam 4.28.35–36 (purport)',
  url: `${VB}/sb/4/28/35-36/`,
};

const S_HBV: SourceRef = {
  label: 'Hari-bhakti-vilasa, Vilasas 12–13 — rules of Ekadashi, viddha, Mahadvadashi and parana',
  note: 'Compiled by Srila Sanatana Gosvami and Gopala Bhatta Gosvami; summarised in Caitanya-caritamrta Madhya-lila 24.342.',
  url: `${VB}/cc/madhya/24/342/`,
};
const S_INDEX: SourceRef = { label: 'ISKCON Desire Tree — Ekadasi index (26 Ekadasis by month)', url: 'https://iskcondesiretree.com/page/ekadashi-1' };
const desireTree = (slug: string, title: string): SourceRef => ({
  label: `ISKCON Desire Tree — ${title} (mahatmya)`,
  url: `https://iskcondesiretree.com/page/${slug}`,
});

/** Teachings shared by every Ekadashi, plus any specific ones */
const teachings = (...extra: PrabhupadaTeaching[]): PrabhupadaTeaching[] => [...extra, T_AMBARISA, T_CAITANYA, T_NOD, T_LETTER];

/* --------------------------------------------------------------- Content --- */

export const EKADASHI_CONTENT: EkadashiContent[] = [
  {
    slug: 'utpanna',
    name: 'Utpanna Ekadashi',
    altNames: ['Utpatti Ekadasi'],
    month: 'Margashirsha (Keshava)',
    paksha: 'krishna',
    summary: 'The “birth” of Ekadashi — the goddess who appeared from Lord Vishnu’s body and defeated the demon Mura.',
    significance:
      'This Ekadashi celebrates the appearance of Ekadashi herself. Lord Krishna explains to Arjuna how the personified Ekadashi emerged from Lord Vishnu and received His blessing that whoever fasts on her day will be freed from sin and attain His abode. Traditionally it is the first Ekadashi from which the vow is begun.',
    specialObservance:
      'The mahatmya describes eating once before sunset on Dashami, worshipping Govinda on Ekadashi without daytime sleep, keeping a night vigil, and breaking the fast on Dvadashi after offering food to the Lord.',
    katha: {
      scripture: 'Bhavishya-uttara Purana',
      speakers: 'Related by Suta Gosvami; within it, Lord Krishna explains the origin of Ekadashi to Arjuna.',
      paragraphs: [
        'In Satya-yuga a powerful demon named Mura, son of Nadijangha, ruled from the city of Candravati. He conquered the demigods and drove them out of the heavenly planets. Indra and the demigods first approached Lord Shiva, who directed them to take shelter of Lord Vishnu.',
        'Lord Vishnu fought Mura and his forces for a thousand celestial years. Afterwards the Lord retired to rest in a cave. Seeing Him asleep, Mura followed, intending to kill Him.',
        'At that moment a radiant maiden manifested from the Lord’s own body and killed Mura. When Lord Vishnu awoke and saw what had happened, He was very pleased. Because she had appeared on the eleventh day of the moon, He named her Ekadashi and offered her a benediction.',
        'She asked that whoever fasts on her day be freed from sinful reactions and attain the Lord’s abode, and the Lord granted it. The mahatmya concludes that a complete fast on Ekadashi surpasses pilgrimage, charity and even the horse sacrifice in merit.',
      ],
    },
    lessons: [
      'Ekadashi is not a mere rule but a personal energy of the Lord who protects His devotees.',
      'The Lord’s shelter is available even when we feel powerless against inner “demons” such as lust and anger.',
      'Fasting is meant to free time and attention for remembering Krishna, not just to abstain from food.',
    ],
    scripture: [
      { label: 'Bhavishya-uttara Purana — Utpanna Ekadasi mahatmya (Krishna–Arjuna dialogue)' },
      S_HBV,
    ],
    teachings: teachings(T_TLC),
    sources: [desireTree('utpanna-ekadasi', 'Utpanna Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'mokshada',
    name: 'Mokshada Ekadashi',
    altNames: ['Gita Jayanti'],
    month: 'Margashirsha (Keshava)',
    paksha: 'shukla',
    summary: 'The liberating Ekadashi — King Vaikhanasa freed his father from hell; also the day the Bhagavad-gita was spoken.',
    significance:
      'As its name says, this Ekadashi grants moksha (liberation) to those who observe it strictly, and its merit can even uplift one’s ancestors. It is also celebrated as Gita Jayanti, the day Lord Krishna spoke the Bhagavad-gita to Arjuna at Kurukshetra.',
    specialObservance:
      'Worship Lord Damodara with incense, a ghee lamp, flowers and tulasi manjaris. As Gita Jayanti, devotees recite the Bhagavad-gita and distribute it.',
    katha: {
      scripture: 'Brahmanda Purana',
      speakers: 'Lord Krishna to Maharaja Yudhishthira.',
      paragraphs: [
        'King Vaikhanasa ruled the city of Campaka-nagara and cared for his subjects like a father. One night he dreamed that his late father was suffering in a hellish condition, and he awoke deeply disturbed.',
        'The king sought counsel from the sage Parvata Muni. By his mystic insight the sage explained that the father was suffering because, in his lifetime, he had forced himself upon his wife during her menstrual period.',
        'Parvata Muni advised the king to observe Mokshada Ekadashi with a complete fast and to offer the merit of it to his father. The king did so together with his family.',
        'By the power of that Ekadashi, his father was released from his suffering and, blessing his son, rose to the heavenly realm.',
      ],
    },
    lessons: [
      'Devotional merit can be offered for the welfare of others, including departed relatives.',
      'Guidance from saintly persons shows the way out of seemingly hopeless situations.',
      'The Bhagavad-gita, spoken on this day, is the Lord’s own instruction for liberation.',
    ],
    scripture: [{ label: 'Brahmanda Purana — Mokshada Ekadasi mahatmya' }, { label: 'Bhagavad-gita As It Is', url: `${VB}/bg/` }, S_HBV],
    teachings: teachings(T_BG1154),
    sources: [desireTree('mokshada-ekadasi', 'Mokshada Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'saphala',
    name: 'Saphala Ekadashi',
    altNames: [],
    month: 'Pausha (Narayana)',
    paksha: 'krishna',
    summary: 'The Ekadashi that makes life successful — the banished prince Lumpaka was redeemed by a fast he kept without knowing it.',
    significance:
      '“Saphala” means fruitful or successful. Lord Krishna describes its merit as equal to thousands of years of austerity, and shows through Lumpaka’s story how even an unknowing observance is accepted by the Lord.',
    specialObservance: 'Worship Lord Narayana with seasonal fruits, incense and ghee lamps, and keep a night vigil.',
    katha: {
      scripture: 'Bhavishya-uttara Purana',
      speakers: 'Lord Krishna to Maharaja Yudhishthira.',
      paragraphs: [
        'King Mahishmata of Campavati had a sinful eldest son named Lumpaka, who was banished to the forest for his misconduct. There he lived by stealing from the city at night and eating fruits by day.',
        'On the day before this Ekadashi he spent a bitterly cold night without proper shelter. On Ekadashi he was too weak to hunt, so he gathered fallen fruits. Unable to eat them, he placed them at the root of a banyan tree, offering them to the Lord, and stayed awake through the night — fasting without knowing it.',
        'The Lord accepted this fast. A voice from the sky blessed him and a divine horse appeared to carry him home. Lumpaka returned to his father, regained his kingdom and became a devoted servant of the Lord.',
        'After ruling righteously, he passed the kingdom to his son and attained the Lord’s abode.',
      ],
    },
    lessons: [
      'Krishna accepts even a small, unknowing offering made with humility.',
      'No one is beyond redemption — the Lord’s mercy can transform a life completely.',
      'Wakefulness and remembrance on Ekadashi night are themselves devotional acts.',
    ],
    scripture: [{ label: 'Bhavishya-uttara Purana — Saphala Ekadasi mahatmya' }, S_HBV],
    teachings: teachings(T_SB428),
    sources: [desireTree('saphala-ekadasi', 'Saphala Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'putrada-pausha',
    name: 'Putrada Ekadashi (Pausha)',
    altNames: ['Pausha Putrada Ekadasi'],
    month: 'Pausha (Narayana)',
    paksha: 'shukla',
    summary: 'King Suketuman, grieving for want of a son, was blessed with a worthy heir by observing this Ekadashi.',
    significance: 'This Ekadashi is famed for granting a worthy son, and also destroys sin and brings knowledge and liberation.',
    specialObservance: 'A complete fast with worship of Lord Narayana.',
    katha: {
      scripture: 'Bhavishya Purana',
      speakers: 'Lord Krishna to Maharaja Yudhishthira.',
      paragraphs: [
        'King Suketuman of Bhadravati and his queen Saibya had no son. The king was so anguished, thinking of his ancestors without anyone to make offerings to them, that he even considered taking his own life — but he rejected that sinful idea.',
        'Wandering into a forest, he came upon a gathering of sages, who revealed themselves to be the Vishvadevas. They told him that it was the day of Putrada Ekadashi and advised him to observe it.',
        'The king fasted and broke his fast on Dvadashi as instructed. Soon afterwards the queen conceived, and in due course a son was born who grew into a heroic prince and later succeeded his father.',
      ],
    },
    lessons: [
      'Despair is answered by taking shelter of saintly persons and the Lord’s vows.',
      'Sincere observance brings both material well-being and spiritual progress.',
    ],
    scripture: [{ label: 'Bhavishya Purana — Putrada Ekadasi mahatmya' }, S_HBV],
    teachings: teachings(T_SB82725),
    sources: [desireTree('putrada-ekadasi', 'Putrada Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'shat-tila',
    name: 'Shat-tila Ekadashi',
    altNames: ['Sat-tila Ekadasi'],
    month: 'Magha (Madhava)',
    paksha: 'krishna',
    summary: 'The Ekadashi of sesame — a charitable but miserly woman learned the value of offering food to others.',
    significance:
      'Shat-tila Ekadashi relieves poverty and misfortune and removes past sins. Its story teaches that austerity without generosity remains incomplete.',
    specialObservance:
      'The mahatmya prescribes six uses of sesame (tila): bathing in sesame water, applying sesame paste, offering sesame in the sacrificial fire, eating sesame, giving sesame in charity, and accepting sesame in charity. Follow your local temple’s guidance on what is taken while fasting.',
    katha: {
      scripture: 'Bhavishya-uttara Purana',
      speakers: 'Pulastya Muni answering Dalbhya Rishi; within it, Lord Krishna answering Narada Muni.',
      paragraphs: [
        'An elderly brahmana lady was very strict in fasting and gave charity of many kinds, yet she never gave food to brahmanas or to the demigods. To bless her, the Lord came to her disguised as a mendicant and begged for alms. Annoyed, she put a lump of mud into His bowl.',
        'By the power of her austerities she reached the heavenly realm, and the lump of mud became a beautiful house for her there — but it was completely empty, without grain or provisions.',
        'When she asked the Lord why, He explained her fault and told her to hear the glories of Shat-tila Ekadashi from the wives of the demigods who would visit her. She opened her door to them, heard of this Ekadashi and observed it.',
        'Thereafter her house was filled with grain and all necessities, and her body became effulgent and spiritual.',
      ],
    },
    lessons: [
      'Austerity should go together with generosity, especially the giving of food.',
      'Whatever we offer to the Lord — even carelessly — returns to us.',
      'Hearing the glories of Ekadashi from devotees is itself transformative.',
    ],
    scripture: [{ label: 'Bhavishya-uttara Purana — Shat-tila Ekadasi mahatmya' }, S_HBV],
    teachings: teachings(T_SB81625),
    sources: [desireTree('sattila-ekadasi', 'Sat-tila Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'bhaimi',
    name: 'Bhaimi Ekadashi',
    altNames: ['Jaya Ekadasi'],
    month: 'Magha (Madhava)',
    paksha: 'shukla',
    summary: 'Two celestial artists cursed to become hobgoblins regained their forms by an unknowing Ekadashi fast. Varaha Dvadashi follows.',
    significance:
      'Jaya Ekadashi frees one even from the gravest sins and from ghostly existence. In ISKCON it is called Bhaimi Ekadashi; the following day is Varaha Dvadashi, the appearance of Lord Varahadeva.',
    specialObservance: 'The next day, Varaha Dvadashi, devotees fast until noon in honour of Lord Varahadeva’s appearance, followed by a feast.',
    katha: {
      scripture: 'Bhavishya-uttara Purana (the account also refers to the Padma Purana)',
      speakers: 'Lord Krishna to Maharaja Yudhishthira.',
      paragraphs: [
        'In the court of Indra, the Gandharva Malyavan, son of Citrasena, and the Apsara Pushpavati became so infatuated with each other that they sang and danced poorly in the assembly.',
        'Displeased, Indra cursed them to fall from heaven and live as pishacas (hobgoblins) in the Himalayas. There they suffered terribly from cold and hunger.',
        'One day — it happened to be Jaya Ekadashi — they were too miserable to eat anything, and they stayed awake all night under a pipal tree. Without knowing it, they had observed the Ekadashi fast and vigil.',
        'At dawn on Dvadashi they regained their celestial forms and returned to Amaravati. When Indra asked how they had been freed, Malyavan explained that it was by the mercy of Lord Krishna and the power of Ekadashi.',
      ],
    },
    lessons: [
      'Infatuation distracts us from our service and brings degradation.',
      'Ekadashi’s power works even when the observance is unintended — how much more when it is done with devotion.',
      'Gratitude: Malyavan attributed his release to the Lord, not to himself.',
    ],
    scripture: [
      { label: 'Bhavishya-uttara Purana — Jaya (Bhaimi) Ekadasi mahatmya', note: 'Some tellings also attribute it to the Padma Purana.' },
      { label: 'Srimad-Bhagavatam 3.13 — appearance of Lord Varaha', url: `${VB}/sb/3/13/` },
      S_HBV,
    ],
    teachings: teachings(),
    sources: [desireTree('bhaimi-ekadasi', 'Bhaimi Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'vijaya',
    name: 'Vijaya Ekadashi',
    altNames: [],
    month: 'Phalguna (Govinda)',
    paksha: 'krishna',
    summary: 'Lord Ramacandra observed this Ekadashi on the sage Bakadalbhya’s advice before crossing the ocean to Lanka.',
    significance: '“Vijaya” means victory. This Ekadashi grants success in this life and the next and removes sinful reactions.',
    specialObservance:
      'The mahatmya describes a kumbha (water-pot) worship: on Dashami a decorated pot of water is set on a mound of grains with a deity of Lord Narayana, worshipped through Ekadashi with vigils, and given to a qualified brahmana on Dvadashi.',
    katha: {
      scripture: 'Skanda Purana',
      speakers: 'Lord Krishna to Maharaja Yudhishthira, relating Lord Brahma’s account to Narada; within it, Bakadalbhya Muni instructs Lord Ramacandra.',
      paragraphs: [
        'After Ravana kidnapped Sita, Lord Ramacandra made an alliance with Sugriva, and Hanuman found Sita in Lanka. The great ocean, however, stood between the Lord’s army and Lanka.',
        'Lord Rama approached the sage Bakadalbhya Muni and asked how the ocean could be crossed. The sage advised Him to observe Vijaya Ekadashi according to the prescribed rules.',
        'Lord Rama did so, setting an example for the world, and by the power of this Ekadashi He crossed to Lanka and defeated Ravana’s forces.',
      ],
    },
    lessons: [
      'The Lord Himself followed Ekadashi to teach by example.',
      'Before any great undertaking, take shelter of devotional vows and saintly advice.',
    ],
    scripture: [
      { label: 'Skanda Purana — Vijaya Ekadasi mahatmya' },
      { label: 'Srimad-Bhagavatam 9.10 — the pastimes of Lord Ramacandra', url: `${VB}/sb/9/10/` },
      S_HBV,
    ],
    teachings: teachings(T_BG1154),
    sources: [desireTree('vaikuntha-ekadasi', 'Vijaya Ekadasi'), S_INDEX],
    status: 'needs_review',
    reviewNote: 'The ISKCON Desire Tree index labels this page "Vaikuntha Ekadasi (Vijaya Ekadasi)"; ISKCON/GCal calls it Vijaya.',
  },
  {
    slug: 'amalaki',
    name: 'Amalaki Ekadashi',
    altNames: ['Amalaki-vrata Ekadasi'],
    month: 'Phalguna (Govinda)',
    paksha: 'shukla',
    summary: 'A hunter who heard the Lord’s glories under an amalaki tree was reborn as a protected devotee-king.',
    significance: 'This Ekadashi frees one from all sins and grants liberation. The amalaki (Indian gooseberry) tree, dear to Lord Vishnu, is worshipped.',
    specialObservance:
      'Worship the amalaki tree, worship Lord Parashurama, circumambulate the tree and keep a night vigil. If no amalaki tree is available, Tulasi may be worshipped instead.',
    katha: {
      scripture: 'Brahmanda Purana',
      speakers: 'Vasishtha Muni to King Mandhata.',
      paragraphs: [
        'In the kingdom of Vaidisha, King Citraratha and all his subjects observed Amalaki Ekadashi, keeping vigil and worshipping the Lord beneath an amalaki tree.',
        'A hunter who lived by killing animals hid nearby that night. Hungry and curious, he stayed awake and heard the glorification of the Lord until dawn.',
        'After death he took birth as King Vasuratha of Jayanti. Once, while he slept in a forest, a band of tribesmen seeking revenge attacked him. A fierce goddess emerged from his body and destroyed them with a disc.',
        'A voice from the sky told him that Lord Keshava protects those who take shelter of Him. Vasuratha became a devotee and ruled without obstacles.',
      ],
    },
    lessons: [
      'Hearing the Lord’s glories, even by chance, plants a seed that bears fruit lifetimes later.',
      'The Lord personally protects those connected to His service.',
    ],
    scripture: [
      { label: 'Brahmanda Purana — Amalaki Ekadasi mahatmya' },
      { label: 'Srimad-Bhagavatam 9.15–16 — pastimes of Lord Parashurama', url: `${VB}/sb/9/15/` },
      S_HBV,
    ],
    teachings: teachings(T_NOD),
    sources: [desireTree('amalaki-ekadasi', 'Amalaki Ekadasi'), S_INDEX],
    status: 'needs_review',
    reviewNote: 'Source names Vasishtha–Mandhata as speakers; an outer Krishna–Yudhishthira frame was not confirmed.',
  },
  {
    slug: 'papamochani',
    name: 'Papamochani Ekadashi',
    altNames: ['Papamocani Ekadasi'],
    month: 'Chaitra (Vishnu)',
    paksha: 'krishna',
    summary: 'The sage Medhavi and the apsara Manjughosha were both freed — from sin and from a curse — by this Ekadashi.',
    significance: '“Papa-mochani” means the one who releases from sin. It removes sinful reactions and ghostly influences and fulfils sincere desires.',
    katha: {
      scripture: 'Bhavishya-uttara Purana',
      speakers: 'Lord Krishna to Maharaja Yudhishthira, retelling Lomasha Rishi’s words to King Mandhata.',
      paragraphs: [
        'In the forest of Caitraratha, the sage Medhavi was performing austerities. The apsara Manjughosha, urged on by Cupid, set out to captivate him, and he fell under her charm.',
        'He spent fifty-seven years, nine months and three days with her, thinking it only a moment. When he realised that his austerities had been lost, he angrily cursed her to become a pishaca (hobgoblin).',
        'When she begged for mercy, he told her to fast on Papamochani Ekadashi. Returning to his father, Cyavana Muni, Medhavi was advised to observe the same Ekadashi to purify himself.',
        'Both observed it: Manjughosha was released from the curse, and Medhavi was freed from the reaction of his fall.',
      ],
    },
    lessons: [
      'Even advanced practitioners must guard against illusion.',
      'Anger after a fall only deepens it; the remedy is humble atonement in devotion.',
      'Ekadashi offers a fresh start to the fallen and the cursed alike.',
    ],
    scripture: [{ label: 'Bhavishya-uttara Purana — Papamochani Ekadasi mahatmya' }, S_HBV],
    teachings: teachings(T_SB428),
    sources: [desireTree('papamochani-ekadasi', 'Papamochani Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'kamada',
    name: 'Kamada Ekadashi',
    altNames: [],
    month: 'Chaitra (Vishnu)',
    paksha: 'shukla',
    summary: 'Lalita gave the merit of her fast to her husband Lalit, freeing him from a demon’s body.',
    significance: '“Kamada” means fulfiller of desires. It removes grievous sins and curses and purifies the consciousness; its merit can be given to another.',
    katha: {
      scripture: 'Varaha Purana (as stated by ISKCON Bangalore)',
      speakers: 'Lord Krishna to Maharaja Yudhishthira, relating what Vasishtha told King Dilipa.',
      paragraphs: [
        'In the city of Ratnapura, the Gandharva Lalit sang in the court of King Pundarika. One day, thinking of his wife Lalita, he sang out of tune. An envious snake reported this to the king.',
        'The king cursed Lalit to become a man-eating demon. Lalita, heartbroken, followed her transformed husband as he wandered through the forests.',
        'On Vindhyacala Hill she met the sage Shringi, who advised her to fast on Kamada Ekadashi and offer its merit to her husband.',
        'She did so, and on Dvadashi, before the sage and the deity of Lord Vasudeva, she offered the merit to Lalit. He was immediately freed and regained his celestial form, and the couple returned to the heavenly realm.',
      ],
    },
    lessons: [
      'Selfless love: Lalita used her own spiritual merit for another’s deliverance.',
      'Distraction in service has consequences, but sincere devotion can reverse them.',
    ],
    scripture: [
      { label: 'Varaha Purana — Kamada Ekadasi mahatmya', note: 'Purana named by ISKCON Bangalore; the Desire Tree page does not name one.' },
      S_HBV,
    ],
    teachings: teachings(T_TLC),
    sources: [desireTree('kamada-ekadasi', 'Kamada Ekadasi'), { label: 'ISKCON Bangalore — Kamada Ekadashi', url: 'https://www.iskconbangalore.org/blog/?p=5619' }, S_INDEX],
    status: 'needs_review',
    reviewNote: 'Purana attribution comes from a single ISKCON source.',
  },
  {
    slug: 'varuthini',
    name: 'Varuthini Ekadashi',
    altNames: [],
    month: 'Vaishakha (Madhusudana)',
    paksha: 'krishna',
    summary: 'The protective Ekadashi — its merit equals the highest forms of charity; King Mandhata and others were delivered by it.',
    significance:
      '“Varuthini” means one who protects. Lord Krishna ranks various gifts — from horses and land up to the gift of spiritual knowledge — and says this fast gives the merit of all of them. It brings good fortune and liberation.',
    specialObservance:
      'The mahatmya lists restraints for Dashami, Ekadashi and Dvadashi — for example avoiding eating twice, eating at others’ homes, gambling, daytime sleep, gossip, anger and falsehood.',
    katha: {
      scripture: 'Bhavishya Purana (some sources say Padma Purana)',
      speakers: 'Lord Krishna to Maharaja Yudhishthira.',
      paragraphs: [
        'Rather than a single story, Lord Krishna describes the power of Varuthini Ekadashi through examples. King Mandhata attained liberation by observing it, and King Dhundhumara was freed from a disease brought on by a curse of Lord Shiva.',
        'Krishna explains a scale of charity, rising from gifts such as horses and elephants up to the gift of spiritual knowledge, which is highest of all. Observing Varuthini Ekadashi brings the merit of all of these.',
        'He also warns against exploiting a daughter’s wealth, and concludes that hearing these glories is itself highly purifying.',
      ],
    },
    lessons: [
      'Sharing spiritual knowledge is the highest charity.',
      'Ekadashi protects (varuthini) the devotee from the reactions of past mistakes.',
      'Self-restraint around the fast — in speech, sleep and mood — completes the vow.',
    ],
    scripture: [
      { label: 'Bhavishya Purana — Varuthini Ekadasi mahatmya', note: 'Attribution differs among sources (Bhavishya vs Padma Purana).' },
      { label: 'Srimad-Bhagavatam 9.6 — King Mandhata', url: `${VB}/sb/9/6/` },
      S_HBV,
    ],
    teachings: teachings(T_TLC),
    sources: [
      desireTree('varuthini-ekadasi', 'Varuthini Ekadasi'),
      { label: 'ISKCON Mumbai — Glories of Varuthini Ekadashi', url: 'https://www.iskconmumbai.com/blog/hare-krishna-blogs-1/glories-of-varuthini-ekadashi-17' },
      S_INDEX,
    ],
    status: 'needs_review',
    reviewNote: 'Purana attribution differs between sources.',
  },
  {
    slug: 'mohini',
    name: 'Mohini Ekadashi',
    altNames: [],
    month: 'Vaishakha (Madhusudana)',
    paksha: 'shukla',
    summary: 'The wayward merchant’s son Dhrishtabuddhi was purified and delivered by this Ekadashi on the sage Kaundinya’s advice.',
    significance: 'Mohini Ekadashi cuts the bonds of illusion and sin. No pilgrimage or charity equals even a small fraction of its merit.',
    specialObservance: 'A complete fast. The mahatmya also stresses not fasting on an Ekadashi mixed with Dashami.',
    katha: {
      scripture: 'Kurma Purana',
      speakers: 'Lord Krishna to Maharaja Yudhishthira, retelling what Vasishtha told Lord Ramacandra.',
      paragraphs: [
        'In the city of Bhadravati lived the pious merchant Dhanapala. His youngest son, Dhrishtabuddhi, fell into every kind of vice and squandered the family wealth.',
        'Thrown out of the house, he took to theft, was punished, and finally lived in the forest by hunting, suffering greatly.',
        'One day, drops of water from the cloth of the sage Kaundinya, returning from bathing in the Ganga, fell upon him. Softened, Dhrishtabuddhi begged the sage for a means of atonement.',
        'Kaundinya Rishi told him to observe Mohini Ekadashi. By doing so, he became free from sin and was carried to the abode of Lord Vishnu on Garuda.',
      ],
    },
    lessons: [
      'The association of a saint, even momentary, can change one’s heart.',
      'Sincere desire for atonement is the beginning of transformation.',
    ],
    scripture: [{ label: 'Kurma Purana — Mohini Ekadasi mahatmya' }, S_HBV],
    teachings: teachings(T_PARANA),
    sources: [desireTree('mohini-ekadasi', 'Mohini Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'apara',
    name: 'Apara Ekadashi',
    altNames: ['Achala Ekadasi'],
    month: 'Jyeshtha (Trivikrama)',
    paksha: 'krishna',
    summary: 'An Ekadashi of unlimited merit that burns up even the gravest sins, as an axe fells a tree.',
    significance:
      'Lord Krishna lists many grave sins — from violence and adultery to cheating and blasphemy of the guru — and declares that Apara Ekadashi destroys their reactions like a forest fire, granting the merit of great pilgrimages and charities.',
    specialObservance: 'A strict fast with worship of Lord Trivikrama.',
    katha: {
      scripture: 'Brahmanda Purana',
      speakers: 'Lord Krishna to Maharaja Yudhishthira.',
      paragraphs: [
        'This mahatmya is a glorification rather than a single story. Lord Krishna enumerates sins such as killing a brahmana, a cow or an unborn child, blasphemy, adultery, false witness, cheating as a false astrologer or physician, fleeing the battlefield, and a disciple’s offences against the guru.',
        'He compares Apara Ekadashi to an axe that fells the tree of sin, a forest fire that consumes it, the sun that dispels darkness and a lion that scatters deer.',
        'Whoever observes it, or even hears or reads its glories, is freed from these reactions and attains the abode of Lord Vishnu.',
      ],
    },
    lessons: [
      'The Lord’s mercy is greater than our past; Ekadashi is a way to accept it.',
      'Awareness of what is sinful should make us more careful, not complacent.',
    ],
    scripture: [{ label: 'Brahmanda Purana — Apara Ekadasi mahatmya' }, S_HBV],
    teachings: teachings(T_SB82725),
    sources: [desireTree('apara-ekadasi', 'Apara Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'pandava-nirjala',
    name: 'Pandava Nirjala Ekadashi',
    altNames: ['Bhima Ekadasi', 'Pandava Nirjala Dvadasi'],
    month: 'Jyeshtha (Trivikrama)',
    paksha: 'shukla',
    summary: 'Bhima, unable to fast twice a month, was given one waterless fast equal to all the Ekadashis of the year.',
    significance:
      'Observing this Ekadashi completely — without even water — is said to grant the merit of all the Ekadashis of the year and protection at the time of death.',
    specialObservance:
      'Nirjala means “without water”: the traditional standard is no food or water from sunrise on Ekadashi to sunrise on Dvadashi, apart from sipping a tiny amount during achamana. Those who cannot do this for health reasons should observe a simple grain-free fast and follow their local temple’s guidance.',
    katha: {
      scripture: 'Padma Purana (as quoted in Hari-bhakti-vilasa); also cited from the Brahma-vaivarta Purana',
      speakers: 'Srila Vyasadeva and Bhimasena.',
      paragraphs: [
        'Bhimasena, the second of the Pandavas, told Vyasadeva that a fire called Vrika burned in his stomach, so that he could not bear to fast. His brothers and mother kept every Ekadashi, and he asked whether there was a single fast that could give him the benefit of all.',
        'Vyasadeva instructed him to observe the Ekadashi of the bright fortnight of Jyeshtha with a complete fast, not even drinking water, from sunrise on Ekadashi until sunrise on Dvadashi.',
        'He assured Bhima that this had been confirmed by Lord Keshava: one who observes it gains the merit of all the Ekadashis, is freed from sin, is protected from the messengers of Yamaraja and attains the Lord’s abode.',
      ],
    },
    lessons: [
      'The scriptures make allowances for the sincere devotee’s limitations.',
      'One great sincere effort can compensate for what we cannot otherwise do.',
      'Austerity is an offering of love — never a source of pride.',
    ],
    scripture: [
      { label: 'Padma Purana, quoted in Hari-bhakti-vilasa — Pandava Nirjala Ekadasi', note: 'The Brahma-vaivarta Purana is also cited.' },
      S_HBV,
    ],
    teachings: teachings(T_SB428),
    sources: [desireTree('pandava-nirjala-ekadasi', 'Pandava Nirjala Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'yogini',
    name: 'Yogini Ekadashi',
    altNames: [],
    month: 'Ashadha (Vamana)',
    paksha: 'krishna',
    summary: 'The Yaksha Hemamali, cursed with disease for neglecting his service, was cured by this Ekadashi on Markandeya Rishi’s advice.',
    significance: 'Yogini Ekadashi removes all sinful reactions and grants liberation; its merit is likened to feeding eighty-eight thousand brahmanas.',
    katha: {
      scripture: 'Brahma-vaivarta Purana',
      speakers: 'Lord Krishna to Maharaja Yudhishthira.',
      paragraphs: [
        'Hemamali was a Yaksha who served Kuvera, a great devotee of Lord Shiva, by bringing lotus flowers from a lake for Kuvera’s worship.',
        'One day, absorbed in the company of his wife Svarupavati, he failed to bring the flowers. Kuvera cursed him to suffer from white leprosy and to be separated from his wife.',
        'Wandering in misery, Hemamali reached the ashrama of Markandeya Rishi, who took pity on him and advised him to fast on Yogini Ekadashi.',
        'Hemamali observed the fast, was cured, regained his former form and returned home to his wife.',
      ],
    },
    lessons: [
      'Neglecting one’s service out of attachment brings suffering.',
      'A saint’s compassion opens the way back, through the Lord’s vows.',
    ],
    scripture: [{ label: 'Brahma-vaivarta Purana — Yogini Ekadasi mahatmya' }, S_HBV],
    teachings: teachings(T_TLC),
    sources: [desireTree('yogini-ekadasi', 'Yogini Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'shayana',
    name: 'Shayana Ekadashi',
    altNames: ['Devashayani Ekadasi', 'Padma Ekadasi', 'Vishnu-shayani Ekadasi'],
    month: 'Ashadha (Vamana)',
    paksha: 'shukla',
    summary: 'The Lord begins His four-month rest and Caturmasya begins; King Mandhata’s kingdom was freed from drought by this Ekadashi.',
    significance:
      'On this day Lord Vishnu is said to go to sleep, beginning the four months of Caturmasya, a period of increased austerity and devotion that ends on Utthana Ekadashi.',
    specialObservance:
      'Caturmasya begins. Devotees often accept additional vows for the four months (for example giving up certain foods in particular months) and avoid starting new auspicious ceremonies.',
    katha: {
      scripture: 'Bhavishya-uttara Purana',
      speakers: 'Lord Krishna to Maharaja Yudhishthira, relating what Lord Brahma told Narada.',
      paragraphs: [
        'King Mandhata of the Surya dynasty was a righteous ruler, yet his kingdom suffered a drought for three years, and famine spread among his people.',
        'Seeking the cause and a remedy, the king went to the forest and approached Angira Muni.',
        'The sage advised the king and all his subjects to observe this Ekadashi of the bright fortnight of Ashadha. When they did, abundant rain fell and the crops flourished again.',
      ],
    },
    lessons: [
      'The welfare of a society depends on its spiritual life.',
      'Caturmasya is an opportunity to deepen vows and simplicity during the Lord’s rest.',
    ],
    scripture: [
      { label: 'Bhavishya-uttara Purana — Shayana Ekadasi mahatmya' },
      { label: 'Srimad-Bhagavatam 9.6 — King Mandhata', url: `${VB}/sb/9/6/` },
      S_HBV,
    ],
    teachings: teachings(T_SB82725),
    sources: [desireTree('sayana-ekadasi', 'Sayana Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'kamika',
    name: 'Kamika Ekadashi',
    altNames: [],
    month: 'Shravana (Sridhara)',
    paksha: 'krishna',
    summary: 'An Ekadashi glorified for worship of the four-armed Lord, tulasi devotion and lamp offerings.',
    significance:
      'Worshipping Lord Vishnu on Kamika Ekadashi is said to surpass bathing in holy places. It frees one from sin and from Yamaraja’s punishments. The mahatmya also warns against sinning deliberately while relying on such atonement.',
    specialObservance:
      'Special emphasis on Tulasi devi — seeing, touching, watering and planting her — and on offering a ghee lamp to the Lord, which is said to benefit one’s forefathers.',
    katha: {
      scripture: 'Brahma-vaivarta Purana',
      speakers: 'Lord Krishna to Maharaja Yudhishthira, relating Lord Brahma’s answers to Narada.',
      paragraphs: [
        'This mahatmya is a glorification rather than a single narrative. Lord Brahma explains to Narada that worship of the four-armed form of Lord Vishnu on this day yields greater merit than the greatest pilgrimages and charities.',
        'He glorifies Tulasi devi at length — whoever sees, touches, waters or plants her is purified — and explains that offering a lamp to the Lord on this day frees one from sin and benefits one’s ancestors.',
        'Hearing about this Ekadashi is said to give the merit of a horse sacrifice. At the same time, the text cautions that one should not commit sins on the strength of atonement.',
      ],
    },
    lessons: [
      'Simple loving acts — a lamp, a tulasi leaf — please the Lord greatly.',
      'Atonement is not a licence; the purpose is a changed heart.',
    ],
    scripture: [{ label: 'Brahma-vaivarta Purana — Kamika Ekadasi mahatmya' }, S_HBV],
    teachings: teachings(T_NOD),
    sources: [desireTree('kamika-ekadasi', 'Kamika Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'pavitropana',
    name: 'Pavitropana Ekadashi',
    altNames: ['Pavitraropana Ekadasi', 'Shravana Putrada Ekadasi'],
    month: 'Shravana (Sridhara)',
    paksha: 'shukla',
    summary: 'The citizens of Mahishmati gave the merit of their fast to their childless king, King Mahijit, who was then blessed with a son.',
    significance: 'This Ekadashi grants a worthy son and freedom from sin. Its story shows how the merit of a fast can be shared for another’s welfare.',
    katha: {
      scripture: 'Bhavishya Purana',
      speakers: 'Lord Krishna to Maharaja Yudhishthira.',
      paragraphs: [
        'King Mahijit of Mahishmati-puri was virtuous, yet he had no son. His ministers and brahmana advisers went to the sage Lomasha Rishi to learn the cause.',
        'The sage perceived that in a previous life the king had been a merchant who drove a thirsty cow and her calf away from water so that he could drink first.',
        'Lomasha Rishi instructed the king’s subjects to fast and keep vigil on this Ekadashi and to give its merit to the king on Dvadashi. They did so, and in due course the queen gave birth to a son.',
      ],
    },
    lessons: [
      'Even small acts of cruelty have consequences; compassion to cows and all creatures matters.',
      'A community’s devotion can uplift its leader.',
    ],
    scripture: [{ label: 'Bhavishya Purana — Pavitropana (Putrada) Ekadasi mahatmya' }, S_HBV],
    teachings: teachings(T_TLC),
    sources: [desireTree('pavitropana-ekadasi', 'Pavitropana Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'annada',
    name: 'Annada Ekadashi',
    altNames: ['Aja Ekadasi'],
    month: 'Bhadrapada (Hrishikesha)',
    paksha: 'krishna',
    summary: 'The truthful King Harishcandra, who had lost everything, regained his family and kingdom by observing this Ekadashi.',
    significance: 'Aja (Annada) Ekadashi destroys sinful reactions and leads to the spiritual world; hearing it gives great merit.',
    specialObservance: 'A complete fast with worship of Lord Hrishikesha and an all-night vigil.',
    katha: {
      scripture: 'Brahma-vaivarta Purana',
      speakers: 'Lord Krishna to Maharaja Yudhishthira; within it, Gautama Muni advises King Harishcandra.',
      paragraphs: [
        'The emperor Harishcandra was famous for his truthfulness. By the force of destiny he lost his kingdom, sold his wife Candramati and his son Lohitashva, and became the servant of an outcaste, guarding a cremation ground.',
        'While he lamented his fate, the sage Gautama Muni arrived. Moved by his suffering, the sage told him to fast completely on Aja Ekadashi and remain awake through the night, and then departed.',
        'Harishcandra followed this instruction. His sinful reactions were destroyed, his wife and son were restored to him — his son even being revived — and he regained his kingdom.',
        'At the end of his life he went to the spiritual world together with his relatives and subjects.',
      ],
    },
    lessons: [
      'Truthfulness, even in adversity, is protected by the Lord.',
      'Hopeless circumstances can change when we take up the Lord’s vows.',
    ],
    scripture: [
      { label: 'Brahma-vaivarta Purana — Aja (Annada) Ekadasi mahatmya' },
      { label: 'Srimad-Bhagavatam 9.7 — the history of King Harishcandra', url: `${VB}/sb/9/7/` },
      S_HBV,
    ],
    teachings: teachings(T_SB82725),
    sources: [desireTree('aja-annada-ekadasi', 'Aja (Annada) Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'parshva',
    name: 'Parshva Ekadashi',
    altNames: ['Parivartini Ekadasi', 'Vamana Ekadasi'],
    month: 'Bhadrapada (Hrishikesha)',
    paksha: 'shukla',
    summary: 'The sleeping Lord turns onto His side; the pastime of Lord Vamanadeva and Bali Maharaja is remembered.',
    significance:
      'During His Caturmasya rest the Lord is said to turn on His side (parshva) on this day. Its mahatmya recounts how Lord Vamanadeva accepted Bali Maharaja’s complete surrender. The next day is Vamana Dvadashi, the Lord’s appearance.',
    specialObservance:
      'Worship Lord Vamanadeva and keep vigil. On the following day, Sri Vamana Dvadashi, devotees fast until noon in honour of His appearance.',
    katha: {
      scripture: 'Brahma-vaivarta Purana',
      speakers: 'Lord Krishna to Maharaja Yudhishthira.',
      paragraphs: [
        'Maharaja Yudhishthira asked why the Lord turns in His sleep, how Bali was bound, and how Caturmasya is observed. Lord Krishna answered by describing the history of Bali Maharaja.',
        'Bali, a devoted king born in a demon dynasty, conquered Indra and took control of the heavenly planets. The demigods appealed to the Lord, who appeared as Vamanadeva, a dwarf brahmana boy.',
        'Vamanadeva asked Bali for three steps of land, and then expanded His form to cover the entire universe with two steps. Bali offered his own head for the third step and was sent to the lower planetary system.',
        'Pleased with Bali’s humility and surrender, the Lord promised to remain with him, and Bali installed and worshipped the Lord on this Ekadashi.',
      ],
    },
    lessons: [
      'Complete surrender — offering even oneself — wins the Lord’s heart.',
      'Material position is temporary; devotion is what endures.',
    ],
    scripture: [
      { label: 'Brahma-vaivarta Purana — Parshva Ekadasi mahatmya' },
      { label: 'Srimad-Bhagavatam 8.18–23 — Lord Vamanadeva and Bali Maharaja', url: `${VB}/sb/8/18/` },
      S_HBV,
    ],
    teachings: teachings(T_SB81625),
    sources: [desireTree('parsva-ekadasi', 'Parsva Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'indira',
    name: 'Indira Ekadashi',
    altNames: [],
    month: 'Ashvina (Padmanabha)',
    paksha: 'krishna',
    summary: 'King Indrasena delivered his suffering father by observing this Ekadashi on Narada Muni’s instruction.',
    significance: 'Indira Ekadashi is especially glorified for delivering one’s forefathers. It falls in the fortnight traditionally dedicated to ancestors.',
    specialObservance:
      'The mahatmya describes offerings for the forefathers on Dashami and Ekadashi, worship of the shalagrama and Lord Hrishikesha, a night vigil, and feeding devotees and relatives on Dvadashi.',
    katha: {
      scripture: 'Brahma-vaivarta Purana',
      speakers: 'Lord Krishna to Maharaja Yudhishthira; within it, Narada Muni brings a message to King Indrasena.',
      paragraphs: [
        'In Satya-yuga, King Indrasena of Mahishmati was a devoted and virtuous ruler. One day Narada Muni came to his court with news of the king’s late father.',
        'Narada explained that he had seen the king’s father in the abode of Yamaraja, suffering because he had once broken an Ekadashi fast improperly. The father had asked that his son help him.',
        'Following Narada’s instructions, Indrasena observed Indira Ekadashi with his family and gave charity. By its merit his father was freed and rose to the abode of Lord Vishnu on Garuda.',
        'Indrasena ruled without obstacles and in time also attained Vaikuntha.',
      ],
    },
    lessons: [
      'Children can serve their ancestors best through devotional service.',
      'The Ekadashi vow should be kept carefully, including breaking the fast properly.',
    ],
    scripture: [{ label: 'Brahma-vaivarta Purana — Indira Ekadasi mahatmya' }, S_HBV],
    teachings: teachings(T_PARANA),
    sources: [desireTree('indira-ekadasi', 'Indira Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'pashankusha',
    name: 'Pashankusha Ekadashi',
    altNames: ['Papankusha Ekadasi'],
    month: 'Ashvina (Padmanabha)',
    paksha: 'shukla',
    summary: 'The “goad” that controls the elephant of sin — an Ekadashi that delivers whole generations.',
    significance:
      'Lord Krishna describes this Ekadashi as a goad (ankusha) that brings the wild elephant of sin under control. It protects from Yamaraja’s punishments and is said to deliver ten generations on the mother’s, father’s and wife’s sides.',
    specialObservance: 'Worship Lord Padmanabha, fast and keep vigil; give charity according to one’s means.',
    katha: {
      scripture: 'Brahma-vaivarta Purana',
      speakers: 'Lord Krishna to Maharaja Yudhishthira.',
      paragraphs: [
        'This mahatmya is a glorification. Lord Krishna explains that whoever worships Lord Padmanabha on this Ekadashi and fasts with devotion is freed from all sinful reactions and need not fear the punishments of Yamaraja.',
        'He recommends charity on this day — gold, sesame, land, cows, grain, water, an umbrella or shoes — and adds that the poor may give whatever they can.',
        'The benefit extends to one’s family: ten generations on the mother’s side, the father’s side and the wife’s side are said to be uplifted.',
      ],
    },
    lessons: [
      'Devotion controls the mind and senses as a goad controls an elephant.',
      'Charity according to one’s means is accepted by the Lord.',
    ],
    scripture: [{ label: 'Brahma-vaivarta Purana — Pashankusha Ekadasi mahatmya' }, S_HBV],
    teachings: teachings(T_BG1154),
    sources: [desireTree('papankusha-ekadasi', 'Papankusha Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'rama',
    name: 'Rama Ekadashi',
    altNames: [],
    month: 'Kartika (Damodara)',
    paksha: 'krishna',
    summary: 'Candrabhaga gave the merit of her lifelong Ekadashi fasts to make her husband Shobhana’s celestial kingdom permanent.',
    significance:
      'Rama Ekadashi falls in the holy month of Kartika (Damodara). It destroys great sins, and Lord Krishna teaches here that the Ekadashis of both fortnights are equally to be honoured.',
    katha: {
      scripture: 'Brahma-vaivarta Purana',
      speakers: 'Lord Krishna to Maharaja Yudhishthira.',
      paragraphs: [
        'King Mucukunda was a strict follower of Ekadashi, and in his kingdom everyone observed it. His daughter Candrabhaga was married to Shobhana, a prince of weak constitution.',
        'When Rama Ekadashi came, Shobhana — though afraid he could not bear it — kept the fast, and by the next dawn he had passed away. By the merit of that fast he obtained a splendid kingdom on Mount Mandaracala, but it was not permanent, because he had fasted without faith.',
        'A brahmana named Somasharma saw him there and carried the news back to Candrabhaga. With the help of the sage Vamadeva she went to her husband.',
        'Candrabhaga offered him all the merit she had gathered by observing Ekadashi since childhood, and the kingdom became permanent. They lived there together happily.',
      ],
    },
    lessons: [
      'Faith gives austerity its full potency.',
      'A devoted spouse’s spiritual merit can uplift the other.',
      'Steady practice from childhood becomes a great treasure.',
    ],
    scripture: [{ label: 'Brahma-vaivarta Purana — Rama Ekadasi mahatmya' }, S_HBV],
    teachings: teachings(T_SB82725),
    sources: [desireTree('rama-ekadasi', 'Rama Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'utthana',
    name: 'Utthana Ekadashi',
    altNames: ['Prabodhini Ekadasi', 'Devotthani Ekadasi', 'Haribodhini Ekadasi'],
    month: 'Kartika (Damodara)',
    paksha: 'shukla',
    summary: 'The Lord rises from His four-month rest and Caturmasya ends — a day of vigil, kirtan and lamp offerings.',
    significance:
      'On Utthana Ekadashi the Lord awakens from the rest that began on Shayana Ekadashi, completing Caturmasya. Lord Brahma glorifies it as destroying the reactions of many births when observed fully with a night vigil of singing, dancing and hearing the Lord’s pastimes.',
    specialObservance:
      'Caturmasya ends. Worship Lord Keshava with tulasi, offer lamps, and keep a night vigil with kirtan and recitation. What was given up for Caturmasya may be offered in charity.',
    katha: {
      scripture: 'Skanda Purana (Hari-bhakti-vilasa also quotes the Padma and Varaha Puranas and the Mahabharata)',
      speakers: 'Lord Brahma to Narada Muni.',
      paragraphs: [
        'Lord Brahma explains to Narada the levels of observance: eating once at midday removes the sins of one previous birth, eating only in the evening those of two, and a complete fast those of seven births.',
        'He describes worship of Lord Keshava with tulasi leaves and an all-night vigil filled with singing, dancing and recitation of the Lord’s pastimes, which please the Lord immensely.',
        'The tradition also tells of a mouse who, by chance, caused a ghee lamp offered on this Ekadashi to keep burning, and by that service received a human birth and eventual liberation (from the Kartika-mahatmya of the Padma Purana).',
      ],
    },
    lessons: [
      'Kirtan and wakefulness are the heart of Ekadashi night.',
      'Even accidental service to the Lord, like keeping a lamp alight, is never lost.',
    ],
    scripture: [
      { label: 'Skanda Purana — Utthana Ekadasi mahatmya (Brahma–Narada)' },
      { label: 'Padma Purana, Kartika-mahatmya — the lamp and the mouse' },
      S_HBV,
    ],
    teachings: teachings(T_NOD),
    sources: [desireTree('utthana-ekadasi', 'Utthana Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
  {
    slug: 'padmini',
    name: 'Padmini Ekadashi',
    altNames: ['Kamala Ekadasi', 'Purushottama Ekadasi'],
    month: 'Purushottama (Adhika masa)',
    paksha: 'shukla',
    summary: 'Observed only in the extra month: Queen Padmini and King Kartavirya were blessed with the mighty Kartavirya Arjuna.',
    significance:
      'Padmini Ekadashi occurs only in Purushottama (Adhika) month, which comes about once in three years. It is said to give the merit of all other Ekadashis and lead to the Lord’s abode.',
    specialObservance:
      'One meal on Dashami; purifying bath on Ekadashi; worship of the Lord with a night vigil of singing and dancing, avoiding idle talk.',
    katha: {
      scripture: 'Skanda Purana',
      speakers: 'Suta Gosvami to the sages headed by Shaunaka; within it, Lord Krishna to Maharaja Yudhishthira, relating Pulastya Muni’s words to Narada.',
      paragraphs: [
        'King Kartavirya and his queen Padmini longed for a worthy son.',
        'Guided by the chaste Anasuya, the wife of Atri Muni, Queen Padmini observed this Ekadashi of the Purushottama month with full devotion, together with the king.',
        'Pleased, the Lord blessed them with a son, Kartavirya Arjuna, who became so powerful that he could defeat even Ravana.',
      ],
    },
    lessons: [
      'Guidance from a chaste, saintly person brings success in devotional practices.',
      'The rare Purushottama month is a special opportunity to intensify devotion.',
    ],
    scripture: [
      { label: 'Skanda Purana — Padmini Ekadasi mahatmya' },
      { label: 'Srimad-Bhagavatam 9.15 — Kartavirya Arjuna', url: `${VB}/sb/9/15/` },
      S_HBV,
    ],
    teachings: teachings(T_TLC),
    sources: [desireTree('padmini-ekadasi', 'Padmini Ekadasi'), S_INDEX],
    status: 'needs_review',
    reviewNote: 'The alternate name "Kamala" is common but was not on the source page.',
  },
  {
    slug: 'parama',
    name: 'Parama Ekadashi',
    altNames: ['Purushottama Ekadasi'],
    month: 'Purushottama (Adhika masa)',
    paksha: 'krishna',
    summary: 'Observed only in the extra month: the poor brahmana couple Sumedha and Pavitra were relieved of poverty and liberated.',
    significance:
      'Parama Ekadashi occurs only in Purushottama (Adhika) month. It removes poverty, grants prosperity and leads to liberation.',
    specialObservance:
      'Fast with an all-night vigil. The mahatmya also describes a five-day Pancaratrika vow beginning after this Ekadashi.',
    katha: {
      scripture: 'Skanda Purana',
      speakers: 'Lord Krishna to Maharaja Yudhishthira, relating a history He heard from the sage Kaundinya in Kampilya.',
      paragraphs: [
        'There lived a poor but pious brahmana named Sumedha and his chaste wife Pavitra. Because of past sins they suffered great poverty.',
        'Sumedha thought of leaving for distant lands to seek wealth, but Pavitra persuaded him to stay, trusting in the Lord.',
        'The sage Kaundinya visited them and advised them to observe Parama Ekadashi and then the five-day Pancaratrika vow. They did so faithfully.',
        'Afterwards a prince, sent by Lord Brahma, gave them a house and a village. They lived prosperously and finally attained the abode of Lord Vishnu.',
      ],
    },
    lessons: [
      'Faith and contentment are better than anxious endeavour.',
      'A faithful partner can steady us in difficulty.',
    ],
    scripture: [{ label: 'Skanda Purana — Parama Ekadasi mahatmya' }, S_HBV],
    teachings: teachings(T_SB428),
    sources: [desireTree('parama-ekadasi', 'Parama Ekadasi'), S_INDEX],
    status: 'needs_review',
  },
];

export const findContent = (slug: string) => EKADASHI_CONTENT.find((c) => c.slug === slug);
