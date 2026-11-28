import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Eraser, UserX, Download, ShieldBan } from 'lucide-react';

interface ChatOptionsMenuProps {
  chatId: string;
  otherUserId: string;
  otherUserName: string;
  isOpen: boolean;
  onClose: () => void;
  onClearChat: () => void;
  onDeleteChat: () => void;
  onRemoveConnection: () => void;
  onExportChat: () => void;
  onBlock?: (report: boolean) => void;
}

type Confirm = null | 'clear' | 'delete' | 'remove' | 'block';

const ChatOptionsMenu: React.FC<ChatOptionsMenuProps> = ({ otherUserName, isOpen, onClose, onClearChat, onDeleteChat, onRemoveConnection, onExportChat, onBlock }) => {
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [report, setReport] = useState(false);
  const [visible, setVisible] = useState(false);

  // Animate in on the next frame; reset when closed
  useEffect(() => {
    if (!isOpen) {
      setVisible(false);
      setConfirm(null);
      setReport(false);
      return;
    }
    const r = requestAnimationFrame(() => setVisible(true));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(r);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items = [
    { id: 'export', label: 'Save chat as a file', Icon: Download, tone: 'text-emerald-600', run: () => (onExportChat(), onClose()) },
    { id: 'clear', label: 'Clear messages', Icon: Eraser, tone: 'text-amber-600', run: () => setConfirm('clear') },
    { id: 'remove', label: 'Remove connection', Icon: UserX, tone: 'text-orange-600', run: () => setConfirm('remove') },
    ...(onBlock ? [{ id: 'block', label: 'Block & report', Icon: ShieldBan, tone: 'text-rose-600', run: () => setConfirm('block') }] : []),
    { id: 'delete', label: 'Delete chat', Icon: Trash2, tone: 'text-rose-600', run: () => setConfirm('delete') },
  ];

  const confirms: Record<Exclude<Confirm, null>, { title: string; text: string; action: string; run: () => void }> = {
    clear: { title: 'Clear messages?', text: `All messages with ${otherUserName} will be removed.`, action: 'Clear', run: onClearChat },
    delete: { title: 'Delete this chat?', text: `Your conversation with ${otherUserName} will be deleted for good.`, action: 'Delete', run: onDeleteChat },
    remove: { title: 'Remove connection?', text: `${otherUserName} will be removed from your connections. You can connect again later.`, action: 'Remove', run: onRemoveConnection },
    block: {
      title: `Block ${otherUserName}?`,
      text: 'They will not be able to message you or send requests. They are not told that you blocked them.',
      action: 'Block',
      run: () => onBlock?.(report),
    },
  };

  return createPortal(
    <div className="fixed inset-0 z-[120]" role="dialog" aria-label="Chat options">
      {/* Transparent click-catcher — no dimming */}
      <div className="absolute inset-0" onClick={confirm ? () => setConfirm(null) : onClose} />

      {!confirm ? (
        <div
          style={{ top: 'calc(env(safe-area-inset-top) + 3.6rem)', transformOrigin: 'top right' }}
          className={`absolute right-3 w-60 rounded-2xl border border-sandal-200/80 bg-white/95 p-1.5 shadow-[0_18px_40px_-12px_rgba(67,27,17,0.28)] backdrop-blur-xl transition-all duration-200 ease-out sm:right-[max(0.75rem,calc(50vw-24rem+0.75rem))] ${
            visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          {items.map(({ id, label, Icon, tone, run }) => (
            <button
              key={id}
              onClick={run}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-maroon-900 transition-colors hover:bg-sandal-100 active:bg-sandal-200/70"
              style={{ minHeight: 0 }}
            >
              <Icon size={17} className={`shrink-0 ${tone}`} />
              {label}
            </button>
          ))}
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
          <div className="pointer-events-auto w-full max-w-sm animate-scale-in rounded-[28px] bg-white p-6 text-center shadow-[0_24px_60px_-15px_rgba(67,27,17,0.35)] ring-1 ring-sandal-200">
            <h3 className="text-lg font-semibold text-maroon-900">{confirms[confirm].title}</h3>
            <p className="mt-2 text-sm text-maroon-900/60">{confirms[confirm].text}</p>
            {confirm === 'block' && (
              <label className="mt-4 flex items-center justify-center gap-2 text-sm text-maroon-900/70">
                <input type="checkbox" checked={report} onChange={(e) => setReport(e.target.checked)} className="h-4 w-4 accent-rose-500" />
                Also report to the admin
              </label>
            )}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
              <button onClick={() => setConfirm(null)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={() => {
                  confirms[confirm].run();
                  setConfirm(null);
                  onClose();
                }}
                className="flex-1 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600"
              >
                {confirms[confirm].action}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default ChatOptionsMenu;
