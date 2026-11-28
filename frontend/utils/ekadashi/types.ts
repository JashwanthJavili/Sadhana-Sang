import type { CalculatedEkadashi } from './calendar';

/* ------------------------------------------------------------ Content --- */

/** Review state of the spiritual content of one Ekadashi */
export type ContentStatus = 'needs_review' | 'verified';

export interface SourceRef {
  label: string;
  url?: string;
  note?: string;
}

/**
 * A teaching of Srila Prabhupada. `summary` is always a paraphrase in our own
 * words. `quote` is only ever shown as a verbatim quotation after an admin has
 * pasted it from Vedabase and ticked `quoteVerified`.
 */
export interface PrabhupadaTeaching {
  summary: string;
  reference: string;
  url?: string;
  quote?: string;
  quoteVerified?: boolean;
}

export interface EkadashiContent {
  slug: string;
  name: string;
  altNames: string[];
  /** Purnimanta month as listed in ISKCON calendars, e.g. "Kartika (Damodara)" */
  month: string;
  paksha: 'shukla' | 'krishna';
  /** One-line summary for cards */
  summary: string;
  significance: string;
  /** Special observance for this Ekadashi, if any (e.g. Nirjala) */
  specialObservance?: string;
  katha: {
    scripture: string;
    speakers: string;
    paragraphs: string[];
  };
  lessons: string[];
  scripture: SourceRef[];
  teachings: PrabhupadaTeaching[];
  sources: SourceRef[];
  status: ContentStatus;
  reviewNote?: string;
  verifiedBy?: string;
  verifiedAt?: number;
  updatedAt?: number;
  updatedBy?: string;
}

/* ------------------------------------------------- Observance records --- */

/**
 * source_imported — copied from an official calendar, awaiting admin review
 * verified        — admin confirmed against an official ISKCON calendar
 * disputed        — admin found conflicting sources; show with a warning
 */
export type ObservanceStatus = 'source_imported' | 'verified' | 'disputed';

/** Official / verified data for one Ekadashi at one preset city. Times are wall-clock in the city's zone. */
export interface ObservanceRecord {
  locationId: string;
  slug: string;
  fastDate: string; // YYYY-MM-DD
  paranaDate: string; // YYYY-MM-DD
  paranaStart?: string; // HH:MM (24h)
  paranaEnd?: string; // HH:MM (24h)
  paranaNote?: string;
  ekadashiStart?: string; // YYYY-MM-DDTHH:MM
  ekadashiEnd?: string; // YYYY-MM-DDTHH:MM
  mahadvadashi?: string;
  sourceName: string;
  sourceUrl?: string;
  status: ObservanceStatus;
  notes?: string;
  enteredBy?: string;
  enteredAt?: number;
  verifiedBy?: string;
  verifiedAt?: number;
}

/* ------------------------------------------------------- Display row --- */

export type DisplayStatus = 'verified' | 'source_imported' | 'disputed' | 'calculated';

export interface DisplayEkadashi {
  key: string;
  slug: string;
  fastDate: string;
  paranaDate: string;
  status: DisplayStatus;
  calc?: CalculatedEkadashi;
  record?: ObservanceRecord;
  /** differences between the official record and the calculation */
  discrepancies: string[];
}
