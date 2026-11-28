import i18n from '../i18n';

/**
 * Mantra text helpers: balanced 2- or 4-line layout, and built-in Hindi / Telugu
 * versions of the best-known mantras (used when a mantra has no saved translation).
 */

/** Words that end a natural phrase */
const BREAK_MARK = /[।॥|;,.:]$|\|\|$/;

/** Never ask for more lines than there are words */
const lines_ = (words: string[], forced?: number) => Math.min(forced ?? 2, words.length);

/**
 * Lays a mantra out in balanced lines, breaking at natural pauses (danda, comma)
 * when they are close to the ideal spot. Without `forceLines`: 2 lines for most
 * mantras, 4 for long ones.
 */
export const layoutMantra = (raw: string, forceLines?: number): string => {
  const words = raw.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (words.length < 2) return raw.trim();
  if (lines_(words, forceLines) < 2) return words.join(' ');

  const total = words.join(' ').length;
  const lines = Math.min(words.length, forceLines ?? (words.length >= 4 && total > 90 ? 4 : 2));

  // cumulative length at the end of each word
  const ends: number[] = [];
  let run = 0;
  words.forEach((w, i) => {
    run += w.length + (i ? 1 : 0);
    ends.push(run);
  });

  const cuts: number[] = []; // index of the last word of each line except the final one
  let from = 0;
  for (let n = 1; n < lines; n++) {
    const ideal = (total * n) / lines;
    const tolerance = total / lines / 3;
    let best = -1;
    let bestDist = Infinity;
    for (let i = from; i < words.length - (lines - n); i++) {
      const dist = Math.abs(ends[i] - ideal);
      const natural = BREAK_MARK.test(words[i]);
      // prefer a natural pause when it is within tolerance, otherwise the closest word
      const score = natural && dist <= tolerance ? dist - tolerance : dist;
      if (score < bestDist) {
        bestDist = score;
        best = i;
      }
    }
    if (best < 0) break;
    cuts.push(best);
    from = best + 1;
  }

  const out: string[] = [];
  let start = 0;
  [...cuts, words.length - 1].forEach((end) => {
    out.push(words.slice(start, end + 1).join(' '));
    start = end + 1;
  });
  return out.join('\n');
};

/* ------------------------------------------------------------------ */
/* Well-known mantras: Hindi / Telugu text comes from the i18n files   */
/* ------------------------------------------------------------------ */

const KNOWN: { id: string; match: RegExp }[] = [
  { id: 'maha', match: /hare\s*kri?shna[\s,]*hare\s*kri?shna[\s,]*kri?shna\s*kri?shna|hare\s*krsna[\s,]*hare\s*krsna[\s,]*krsna\s*krsna/ },
  { id: 'vasudeva', match: /om\s*namo\s*bhagavate\s*vasudevaya/ },
  { id: 'pranama', match: /namo\s*brahmanya[\s-]*devaya/ },
  { id: 'panchatattva', match: /sh?ri\s*-?kri?s?h?na\s*-?ch?ai?tanya\s*prabhu\s*nityananda/ },
];

/** Verified Hindi / Telugu text for a well-known mantra, or null */
export const knownTranslation = (english: string, lang: 'hi' | 'te'): string | null => {
  const text = english.toLowerCase();
  const hit = KNOWN.find((k) => k.match.test(text));
  if (!hit) return null;
  const key = `known.${hit.id}`;
  const out = i18n.getFixedT(lang)(key);
  return out && out !== key ? out : null;
};

/** Lines as the writer typed them. A blank line is kept (once) as a gap between verses. */
export const typedLines = (raw: string) => {
  const out: string[] = [];
  raw.split(/\r?\n/).forEach((l) => {
    const line = l.replace(/[ \t]+/g, ' ').trim();
    if (line) out.push(line);
    else if (out.length && out[out.length - 1] !== '') out.push('');
  });
  while (out.length && out[out.length - 1] === '') out.pop();
  return out;
};

/** Line choices an admin can set for a mantra. 0 = keep the lines as typed. */
export const LINE_CHOICES: { value: number | undefined; label: string }[] = [
  { value: undefined, label: 'Auto' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 0, label: 'As typed' },
];
