import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flower2,
  Library,
  Lightbulb,
  MapPin,
  Quote,
  ScrollText,
  ShieldCheck,
  AlertTriangle,
  CalendarDays,
} from 'lucide-react';
import { useEkadashiCalendar } from '../components/ekadashi/useEkadashiCalendar';
import { ObservanceTimings, StatusBadge, VerificationNote, ekadashiName } from '../components/ekadashi/shared';
import LocationPicker from '../components/ekadashi/LocationPicker';
import { formatDateKey } from '../utils/ekadashi/timezone';
import { RULE_LABELS } from '../utils/ekadashi/calendar';
import type { SourceRef } from '../utils/ekadashi/types';
import { PageLoader } from '../components/LoadingScreen';
import { EKADASHI_LANGS, EKADASHI_UI, localizeEkadashi, useEkadashiLang } from '../utils/ekadashi/i18n';

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; id?: string }> = ({ icon, title, children, id }) => (
  <section id={id} className="scroll-mt-24 rounded-3xl bg-white/90 p-5 shadow-card ring-1 ring-sandal-200 sm:p-7">
    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-maroon-900">
      <span className="text-brand-600">{icon}</span>
      {title}
    </h2>
    {children}
  </section>
);

const RefLink: React.FC<{ s: SourceRef }> = ({ s }) => (
  <li className="flex gap-2 text-sm leading-relaxed text-maroon-900/75">
    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
    <span>
      {s.url ? (
        <a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-brand-700 underline-offset-2 hover:underline">
          {s.label}
          <ExternalLink size={12} className="ml-1 inline -translate-y-px" />
        </a>
      ) : (
        <span className="font-medium text-maroon-900">{s.label}</span>
      )}
      {s.note && <span className="block text-xs text-maroon-900/50">{s.note}</span>}
    </span>
  </li>
);

const EkadashiDetailPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const cal = useEkadashiCalendar();
  const { rows, content, location, todayKey, loading } = cal;
  const [pickerOpen, setPickerOpen] = useState(false);

  const c = content[slug];
  const [lang, setLang] = useEkadashiLang();
  const t = EKADASHI_UI[lang];
  const dateParam = params.get('date');

  // Which occurrence to show: requested date, else the next upcoming one of this Ekadashi
  const occurrence = useMemo(() => {
    const same = rows.filter((r) => r.slug === slug);
    if (dateParam) {
      const exact = same.find((r) => r.fastDate === dateParam);
      if (exact) return exact;
      // nearest occurrence (location may have moved the date by a day)
      const near = same.find((r) => Math.abs(Date.parse(r.fastDate) - Date.parse(dateParam)) <= 3 * 86_400_000);
      if (near) return near;
    }
    return same.find((r) => r.paranaDate >= todayKey) || same[same.length - 1];
  }, [rows, slug, dateParam, todayKey]);

  const idx = occurrence ? rows.findIndex((r) => r.key === occurrence.key) : -1;
  const prev = idx > 0 ? rows[idx - 1] : undefined;
  const next = idx >= 0 && idx < rows.length - 1 ? rows[idx + 1] : undefined;
  const others = rows.filter((r) => r.slug === slug && r.key !== occurrence?.key);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug, dateParam]);

  if (!c) {
    if (loading || Object.keys(content).length === 0) return <PageLoader />;
    return (
      <div className="mx-auto max-w-3xl">
        <div className="empty-state card">
          <BookOpen size={40} className="text-stone-300" />
          <p className="text-sm text-stone-500">This Ekadashi was not found.</p>
          <Link to="/festivals?tab=ekadashi" className="btn-primary btn-sm">
            Back to Ekadashi calendar
          </Link>
        </div>
      </div>
    );
  }

  const go = (r: { slug: string; fastDate: string }) => navigate(`/ekadashi/${r.slug}?date=${r.fastDate}`);
  // reader-facing text in the chosen language (teachings and references stay in English)
  const L = localizeEkadashi(c, lang);

  return (
    <article className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => navigate('/festivals?tab=ekadashi')} className="btn-ghost btn-sm -ml-2">
          <ArrowLeft size={16} /> Ekadashi calendar
        </button>
        <button onClick={() => setPickerOpen(true)} className="btn-secondary btn-sm">
          <MapPin size={14} className="text-brand-600" /> {location.name}
        </button>
      </div>

      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-card ring-1 ring-amber-200/70 sm:p-10">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-amber-200/40 blur-2xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
              {t.ekadashi} · {L.month}
            </span>
            <div className="inline-flex rounded-xl bg-white/80 p-1 ring-1 ring-amber-200" role="tablist" aria-label="Language">
              {EKADASHI_LANGS.map((l) => (
                <button
                  key={l.id}
                  role="tab"
                  aria-selected={lang === l.id}
                  onClick={() => setLang(l.id)}
                  className={`h-8 rounded-lg px-3 text-sm font-semibold transition ${lang === l.id ? 'bg-brand-600 text-white shadow-soft' : 'text-maroon-900/60 hover:text-maroon-900'}`}
                  style={{ minHeight: 0 }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-maroon-900 sm:text-5xl">{L.name}</h1>
          {L.altNames.length > 0 && (
            <p className="mt-1.5 text-sm font-medium text-brand-600">
              {t.alsoKnownAs} {L.altNames.join(', ')}
            </p>
          )}
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-maroon-900/75">{L.summary}</p>
          <nav className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: 'none' }} aria-label="Sections">
            {[
              ['#story', t.story],
              ['#teachings', t.teachings],
              ['#references', t.references],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-white px-4 text-sm font-semibold text-brand-700 shadow-soft ring-1 ring-amber-200 transition hover:bg-amber-50 active:scale-95"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Observance */}
      {occurrence ? (
        <section className="rounded-3xl bg-sandal-50 p-4 ring-1 ring-sandal-200 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-maroon-900">
              <CalendarDays size={17} className="text-brand-600" />
              {formatDateKey(occurrence.fastDate, { day: 'numeric', month: 'long', year: 'numeric' })} · {location.name}
            </h2>
            <StatusBadge status={occurrence.status} />
          </div>
          <ObservanceTimings row={occurrence} location={location} />
          {occurrence.calc && occurrence.calc.rule !== 'shuddha' && !occurrence.record && (
            <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs leading-relaxed text-maroon-900/70 ring-1 ring-sandal-200">
              <b>{RULE_LABELS[occurrence.calc.rule].title}.</b> {RULE_LABELS[occurrence.calc.rule].explain}
            </p>
          )}
          <div className="mt-3">
            <VerificationNote row={occurrence} location={location} />
          </div>
          {others.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-maroon-900/55">
              Other years:
              {others.map((o) => (
                <button key={o.key} onClick={() => go(o)} className="rounded-full bg-white px-2.5 py-1 font-medium text-brand-700 ring-1 ring-sandal-200 hover:ring-brand-200">
                  {formatDateKey(o.fastDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        !loading && (
          <p className="rounded-2xl bg-sandal-50 p-4 text-sm text-maroon-900/60 ring-1 ring-sandal-200">
            {c.month.includes('Adhika')
              ? 'This Ekadashi occurs only in the Purushottama (Adhika) month, which is not within the current calendar range.'
              : 'No date for this Ekadashi in the current calendar range.'}
          </p>
        )
      )}

      {t.translationNote && <p className="rounded-2xl bg-sandal-50 px-4 py-3 text-xs leading-relaxed text-maroon-900/60 ring-1 ring-sandal-200">{t.translationNote}</p>}

      <Section icon={<Flower2 size={18} />} title={t.significance}>
        <p className="text-[15px] leading-relaxed text-maroon-900/80">{L.significance}</p>
        {L.specialObservance && (
          <div className="mt-4 rounded-2xl bg-amber-50/70 p-4 ring-1 ring-amber-200/70">
            <p className="eyebrow mb-1 text-amber-800/70">{t.specialObservance}</p>
            <p className="text-sm leading-relaxed text-maroon-900/80">{L.specialObservance}</p>
          </div>
        )}
      </Section>

      <Section id="story" icon={<ScrollText size={18} />} title={t.storyTitle}>
        <p className="mb-5 text-xs leading-relaxed text-maroon-900/55">
          {lang === 'en' ? (
            <>
              From the <b className="text-maroon-900/75">{c.katha.scripture}</b>. {c.katha.speakers} Retold in summary from the traditional Ekadashi-mahatmya; see the
              sources below for the full narration.
            </>
          ) : (
            <>
              {t.storyFrom} <b className="text-maroon-900/75">{L.katha.scripture}</b>. {L.katha.speakers}
            </>
          )}
        </p>
        <div className={`space-y-4 text-[15px] text-maroon-900/85 sm:text-base ${lang === 'en' ? 'leading-[1.85]' : 'leading-[2]'}`}>
          {L.katha.paragraphs.map((p, i) => (
            <p key={i} className={i === 0 && lang === 'en' ? 'first-letter:float-left first-letter:mr-2 first-letter:text-5xl first-letter:font-bold first-letter:leading-none first-letter:text-brand-600' : ''}>
              {p}
            </p>
          ))}
        </div>
      </Section>

      <Section icon={<Lightbulb size={18} />} title={t.lessons}>
        <ul className="space-y-3">
          {L.lessons.map((l) => (
            <li key={l} className="flex gap-3 text-[15px] leading-relaxed text-maroon-900/80">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] text-brand-600">✦</span>
              {l}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="teachings" icon={<Quote size={18} />} title="Srila Prabhupada’s teachings">
        <p className="mb-4 text-xs text-maroon-900/55">
          Summaries in our own words, with the exact reference — please read the full verse and purport on Vedabase. Direct quotations appear only after they
          have been verified word-for-word.
        </p>
        <div className="space-y-3">
          {c.teachings.map((t) => (
            <figure key={t.reference + t.summary.slice(0, 20)} className="rounded-2xl bg-sandal-50 p-4 ring-1 ring-sandal-200">
              {t.quote && t.quoteVerified && (
                <blockquote className="mb-2 border-l-4 border-brand-300 pl-3 text-[15px] italic leading-relaxed text-maroon-900">“{t.quote}”</blockquote>
              )}
              <p className="text-sm leading-relaxed text-maroon-900/80">{t.summary}</p>
              <figcaption className="mt-2 text-xs font-medium">
                {t.url ? (
                  <a href={t.url} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                    {t.reference} <ExternalLink size={11} className="inline -translate-y-px" />
                  </a>
                ) : (
                  <span className="text-maroon-900/60">{t.reference}</span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section id="references" icon={<Library size={18} />} title="Scriptural references & sources">
        <p className="eyebrow mb-2">Scripture</p>
        <ul className="mb-5 space-y-2">
          {c.scripture.map((s) => (
            <RefLink key={s.label} s={s} />
          ))}
        </ul>
        <p className="eyebrow mb-2">Sources</p>
        <ul className="space-y-2">
          {c.sources.map((s) => (
            <RefLink key={s.label} s={s} />
          ))}
        </ul>
        <div className="mt-5 flex items-start gap-2 rounded-2xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-600 ring-1 ring-stone-200">
          {c.status === 'verified' ? <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />}
          <span>
            {c.status === 'verified'
              ? `Content reviewed and verified${c.verifiedBy ? ' by an administrator' : ''}${c.verifiedAt ? ` on ${new Date(c.verifiedAt).toLocaleDateString()}` : ''}.`
              : 'This reading is awaiting review by an administrator against the cited sources.'}
            {c.reviewNote && <span className="mt-1 block text-stone-500">Note: {c.reviewNote}</span>}
          </span>
        </div>
      </Section>

      {/* Prev / next */}
      <nav className="grid gap-3 sm:grid-cols-2" aria-label="Previous and next Ekadashi">
        {prev ? (
          <button onClick={() => go(prev)} className="group rounded-2xl bg-white/90 p-4 text-left shadow-card ring-1 ring-sandal-200 transition hover:ring-brand-200">
            <span className="flex items-center gap-1 text-xs text-maroon-900/50">
              <ChevronLeft size={14} /> Previous · {formatDateKey(prev.fastDate, { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="mt-1 block font-semibold text-maroon-900 group-hover:text-brand-700">{ekadashiName(prev.slug, content)}</span>
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button onClick={() => go(next)} className="group rounded-2xl bg-white/90 p-4 text-right shadow-card ring-1 ring-sandal-200 transition hover:ring-brand-200">
            <span className="flex items-center justify-end gap-1 text-xs text-maroon-900/50">
              Next · {formatDateKey(next.fastDate, { day: 'numeric', month: 'short', year: 'numeric' })} <ChevronRight size={14} />
            </span>
            <span className="mt-1 block font-semibold text-maroon-900 group-hover:text-brand-700">{ekadashiName(next.slug, content)}</span>
          </button>
        )}
      </nav>

      {pickerOpen && <LocationPicker current={location} onSelect={cal.setLocation} onClose={() => setPickerOpen(false)} />}
    </article>
  );
};

export default EkadashiDetailPage;
