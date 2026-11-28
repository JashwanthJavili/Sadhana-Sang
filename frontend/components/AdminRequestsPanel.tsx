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
import { useConfirm } from './ConfirmDialog';

type Tab = 'festivals' | 'mantras' | 'languages';
type Status = 'pending' | 'approved' | 'rejected' | 'all';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
};

const longDate = (d: string) => {
  const t = new Date(d);
  return isNaN(t.getTime()) ? d : t.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const when = (ts: number) => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** One label + value row inside an expanded request */
const Field: React.FC<{ label: string; children?: React.ReactNode }> = ({ label, children }) =>
  children ? (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-maroon-900/40">{label}</p>
      <p className="mt-0.5 whitespace-pre-line break-words text-sm leading-relaxed text-maroon-900/80">{children}</p>
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
  <li className={`rounded-2xl border bg-white shadow-soft transition-colors ${open ? 'border-marigold-400' : 'border-sandal-200'}`}>
    <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3 p-4 text-left" style={{ minHeight: 0 }}>
      <div className="min-w-0 flex-1">
        <p className="break-words font-semibold text-maroon-900">{title}</p>
        <p className="break-words text-xs text-maroon-900/50">{meta}</p>
      </div>
      <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${STATUS_STYLE[status] || 'bg-stone-100 text-stone-700'}`}>{status}</span>
      <ChevronDown size={17} className={`mt-1 shrink-0 text-maroon-900/40 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
    </button>
    <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
      <div className="min-h-0 min-w-0 overflow-hidden">
        <div className="space-y-3 border-t border-sandal-200/70 px-4 pb-4 pt-3">
          {children}
          {comment && (
            <div className="rounded-xl bg-sky-50 px-3 py-2.5 ring-1 ring-sky-100">
              <p className="text-xs font-semibold text-sky-900">Admin note{reviewedBy ? ` · ${reviewedBy}` : ''}</p>
              <p className="mt-0.5 whitespace-pre-line break-words text-sm text-sky-800">{comment}</p>
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
  const { ask, dialog } = useConfirm();
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
    const ok = await ask({
      title: result === 'approved' ? 'Approve this request?' : 'Decline this request?',
      message: result === 'approved' ? 'It will be published and the devotee will be notified.' : 'The devotee will be notified with your note.',
      confirmLabel: result === 'approved' ? 'Approve' : 'Decline',
      danger: result === 'rejected',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const who = user.displayName || user.email || 'Admin';
      if (kind === 'festival') await reviewFestivalRequest(id, result, note.trim(), user.uid, who);
      else await reviewSlokaRequest(id, result, note.trim(), user.uid, who);
      showSuccess(result === 'approved' ? 'Approved and published' : 'Request declined');
      setNote('');
      setOpenId(null);
    } catch (e) {
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
        className="block w-full h-11 rounded-xl border border-sandal-200 bg-white px-3.5 text-sm text-maroon-900 outline-none placeholder:text-maroon-900/30 focus:ring-2 focus:ring-marigold-400/40"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button onClick={() => review(kind, id, 'rejected')} disabled={busy} style={{ minHeight: 0 }} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white text-sm font-semibold text-maroon-900/70 ring-1 ring-sandal-200 disabled:opacity-50">
          <X size={16} /> Decline
        </button>
        <button onClick={() => review(kind, id, 'approved')} disabled={busy} style={{ minHeight: 0 }} className="inline-flex h-10 flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {approveLabel}
        </button>
      </div>
    </div>
  );

  const empty = (label: string) => (
    <div className="rounded-2xl border border-sandal-200 bg-white px-6 py-10 text-center shadow-soft">
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
    <div className="min-w-0 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-maroon-900">Requests</h2>
        <p className="mt-0.5 text-xs text-maroon-900/50">Review what devotees have suggested.</p>
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
            className={`flex items-center justify-center gap-1.5 h-10 min-w-0 rounded-xl px-1.5 text-sm font-semibold transition-all ${
              tab === id ? 'bg-white text-maroon-900 shadow-soft' : 'text-maroon-900/55 hover:text-maroon-900'
            }`}
            style={{ minHeight: 0 }}
          >
            <Icon size={16} className="shrink-0" />
            <span className="truncate">{label}</span>
            {pending[id] > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">{pending[id]}</span>}
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="flex flex-wrap gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`shrink-0 h-9 rounded-full px-3.5 text-sm font-semibold capitalize transition ${
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
                  {longDate(r.date)}
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
                {(r.reference || '').startsWith('translation:') && <Field label="Type">Translation of an existing mantra</Field>}
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
      {dialog}
    </div>
  );
}
