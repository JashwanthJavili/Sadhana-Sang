import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, BookOpen, Languages, Check, X, ChevronDown, Inbox, Loader2 } from 'lucide-react';
import {
  getAllFestivalRequests,
  getAllSlokaRequests,
  reviewFestivalRequest,
  reviewSlokaRequest,
  FestivalRequest,
  SlokaRequest,
} from '../services/requests';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

type Tab = 'festivals' | 'mantras' | 'languages';
type Status = 'pending' | 'approved' | 'rejected' | 'all';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
};

const when = (ts: number) => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** One label + value row inside an expanded request */
const Field: React.FC<{ label: string; children?: React.ReactNode }> = ({ label, children }) =>
  children ? (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-maroon-900/40">{label}</p>
      <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-maroon-900/80">{children}</p>
    </div>
  ) : null;

interface CardProps {
  title: string;
  meta: string;
  status: string;
  open: boolean;
  onToggle: () => void;
  comment?: string;
  reviewedBy?: string;
  children: React.ReactNode;
  review?: React.ReactNode;
}

const RequestCard: React.FC<CardProps> = ({ title, meta, status, open, onToggle, comment, reviewedBy, children, review }) => (
  <li className={`rounded-2xl bg-white ring-1 transition-shadow ${open ? 'shadow-card ring-amber-200' : 'shadow-soft ring-sandal-200'}`}>
    <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left" style={{ minHeight: 0 }}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-maroon-900">{title}</p>
        <p className="truncate text-xs text-maroon-900/50">{meta}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${STATUS_STYLE[status] || 'bg-stone-100 text-stone-700'}`}>{status}</span>
      <ChevronDown size={17} className={`shrink-0 text-maroon-900/40 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
    </button>
    <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
      <div className="min-h-0 overflow-hidden">
        <div className="space-y-3 border-t border-sandal-200/70 px-4 pb-4 pt-3">
          {children}
          {comment && (
            <div className="rounded-xl bg-sky-50 px-3 py-2.5 ring-1 ring-sky-100">
              <p className="text-xs font-semibold text-sky-900">Admin note{reviewedBy ? ` · ${reviewedBy}` : ''}</p>
              <p className="mt-0.5 text-sm text-sky-800">{comment}</p>
            </div>
          )}
          {review}
        </div>
      </div>
    </div>
  </li>
);

export default function AdminRequestsPanel() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [tab, setTab] = useState<Tab>('festivals');
  const [festivalRequests, setFestivalRequests] = useState<FestivalRequest[]>([]);
  const [slokaRequests, setSlokaRequests] = useState<SlokaRequest[]>([]);
  const [status, setStatus] = useState<Status>('pending');
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const a = getAllFestivalRequests(setFestivalRequests);
    const b = getAllSlokaRequests(setSlokaRequests);
    return () => {
      a();
      b();
    };
  }, []);

  const isLanguage = (r: SlokaRequest) => (r.reference || '').startsWith('language:');
  const mantraRequests = useMemo(() => slokaRequests.filter((r) => !isLanguage(r)), [slokaRequests]);
  const languageRequests = useMemo(() => slokaRequests.filter(isLanguage), [slokaRequests]);

  const pending = {
    festivals: festivalRequests.filter((r) => r.status === 'pending').length,
    mantras: mantraRequests.filter((r) => r.status === 'pending').length,
    languages: languageRequests.filter((r) => r.status === 'pending').length,
  };

  const byStatus = <T extends { status: string }>(list: T[]) => (status === 'all' ? list : list.filter((r) => r.status === status));

  const review = async (kind: 'festival' | 'sloka', id: string, result: 'approved' | 'rejected') => {
    if (!user) return;
    if (result === 'rejected' && !note.trim()) return showError('Please add a short note for the devotee');
    setBusy(true);
    try {
      const who = user.displayName || user.email || 'Admin';
      if (kind === 'festival') await reviewFestivalRequest(id, result, note.trim(), user.uid, who);
      else await reviewSlokaRequest(id, result, note.trim(), user.uid, who);
      showSuccess(result === 'approved' ? 'Approved and published' : 'Request declined');
      setNote('');
      setOpenId(null);
    } catch (e) {
      console.error(e);
      showError('Could not process the request');
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) => {
    setOpenId((o) => (o === id ? null : id));
    setNote('');
  };

  const reviewBox = (kind: 'festival' | 'sloka', id: string, approveLabel: string) => (
    <div className="space-y-2.5 pt-1">
      <input
        value={openId === id ? note : ''}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Short note (needed to decline)"
        className="block w-full rounded-xl border border-sandal-300 bg-white px-3.5 py-2.5 text-sm text-maroon-900 placeholder:text-maroon-900/30 focus:border-marigold-400 focus:outline-none focus:ring-4 focus:ring-marigold-400/20"
      />
      <div className="flex gap-2">
        <button onClick={() => review(kind, id, 'rejected')} disabled={busy} className="btn-secondary flex-1 disabled:opacity-50">
          <X size={16} /> Decline
        </button>
        <button onClick={() => review(kind, id, 'approved')} disabled={busy} className="btn-primary flex-[1.4] disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {approveLabel}
        </button>
      </div>
    </div>
  );

  const empty = (label: string) => (
    <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-soft ring-1 ring-sandal-200">
      <Inbox size={34} className="mx-auto text-sandal-400" />
      <p className="mt-2 text-sm text-maroon-900/55">No {status === 'all' ? '' : `${status} `}{label}</p>
    </div>
  );

  const tabs: { id: Tab; label: string; Icon: React.ComponentType<any> }[] = [
    { id: 'festivals', label: 'Festivals', Icon: Calendar },
    { id: 'mantras', label: 'Mantras', Icon: BookOpen },
    { id: 'languages', label: 'Languages', Icon: Languages },
  ];

  const festivals = byStatus(festivalRequests);
  const mantras = byStatus(mantraRequests);
  const languages = byStatus(languageRequests);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-elegant text-2xl font-semibold text-maroon-900">Requests</h2>
        <p className="mt-0.5 text-sm text-maroon-900/55">Review what devotees have suggested.</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-sandal-100 p-1">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => {
              setTab(id);
              setOpenId(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-semibold transition-all ${
              tab === id ? 'bg-white text-maroon-900 shadow-soft' : 'text-maroon-900/55 hover:text-maroon-900'
            }`}
            style={{ minHeight: 0 }}
          >
            <Icon size={16} />
            {label}
            {pending[id] > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">{pending[id]}</span>}
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${
              status === s ? 'bg-brand-600 text-white' : 'bg-white text-maroon-900/65 ring-1 ring-sandal-200 hover:bg-sandal-50'
            }`}
            style={{ minHeight: 0 }}
          >
            {s}
          </button>
        ))}
      </div>

      {tab === 'festivals' &&
        (festivals.length === 0 ? (
          empty('festival requests')
        ) : (
          <ul className="space-y-2.5">
            {festivals.map((r) => (
              <RequestCard
                key={r.id}
                title={r.name}
                meta={`${r.requesterName} · ${when(r.timestamp)}`}
                status={r.status}
                open={openId === r.id}
                onToggle={() => toggle(r.id!)}
                comment={r.adminComment}
                reviewedBy={r.reviewedBy}
                review={r.status === 'pending' ? reviewBox('festival', r.id!, 'Approve & publish') : undefined}
              >
                <Field label="Date">
                  {new Date(r.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </Field>
                <Field label="Category">{r.category}</Field>
                <Field label="Description">{r.description}</Field>
                <Field label="Significance">{r.significance}</Field>
                <Field label="Observances">{r.observances}</Field>
              </RequestCard>
            ))}
          </ul>
        ))}

      {tab === 'mantras' &&
        (mantras.length === 0 ? (
          empty('mantra requests')
        ) : (
          <ul className="space-y-2.5">
            {mantras.map((r) => (
              <RequestCard
                key={r.id}
                title={r.title}
                meta={`${r.requesterName} · ${when(r.timestamp)}`}
                status={r.status}
                open={openId === r.id}
                onToggle={() => toggle(r.id!)}
                comment={r.adminComment}
                reviewedBy={r.reviewedBy}
                review={r.status === 'pending' ? reviewBox('sloka', r.id!, 'Approve & publish') : undefined}
              >
                <Field label="Category">{r.category}</Field>
                <Field label="Mantra">{r.sanskrit}</Field>
                <Field label="Meaning">{r.translation}</Field>
                <Field label="Purport">{r.purport}</Field>
              </RequestCard>
            ))}
          </ul>
        ))}

      {tab === 'languages' &&
        (languages.length === 0 ? (
          empty('language requests')
        ) : (
          <ul className="space-y-2.5">
            {languages.map((r) => (
              <RequestCard
                key={r.id}
                title={r.sanskrit}
                meta={`${r.requesterName} · ${when(r.timestamp)}`}
                status={r.status}
                open={openId === r.id}
                onToggle={() => toggle(r.id!)}
                comment={r.adminComment}
                reviewedBy={r.reviewedBy}
                review={r.status === 'pending' ? reviewBox('sloka', r.id!, 'Approve language') : undefined}
              >
                <Field label="Requested language">{r.sanskrit}</Field>
                <p className="text-xs text-maroon-900/50">Once approved, it appears in every mantra's language list.</p>
              </RequestCard>
            ))}
          </ul>
        ))}
    </div>
  );
}
