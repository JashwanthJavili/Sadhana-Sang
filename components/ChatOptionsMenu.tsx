import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Eraser, UserX, Download, X } from 'lucide-react';

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
}

type Confirm = null | 'clear' | 'delete' | 'remove';

const ChatOptionsMenu: React.FC<ChatOptionsMenuProps> = ({ otherUserName, isOpen, onClose, onClearChat, onDeleteChat, onRemoveConnection, onExportChat }) => {
  const [confirm, setConfirm] = useState<Confirm>(null);

  if (!isOpen) return null;

  const items = [
    { id: 'export', label: 'Save chat as a file', hint: 'Download this conversation', Icon: Download, tone: 'bg-emerald-50 text-emerald-600', run: () => (onExportChat(), onClose()) },
    { id: 'clear', label: 'Clear messages', hint: 'Remove all messages, keep the chat', Icon: Eraser, tone: 'bg-amber-100 text-amber-700', run: () => setConfirm('clear') },
    { id: 'remove', label: 'Remove connection', hint: `Disconnect from ${otherUserName}`, Icon: UserX, tone: 'bg-orange-100 text-orange-600', run: () => setConfirm('remove') },
    { id: 'delete', label: 'Delete chat', hint: 'Delete this conversation for good', Icon: Trash2, tone: 'bg-rose-100 text-rose-600', run: () => setConfirm('delete') },
  ];

  const confirms: Record<Exclude<Confirm, null>, { title: string; text: string; action: string; run: () => void }> = {
    clear: { title: 'Clear messages?', text: `All messages with ${otherUserName} will be removed.`, action: 'Clear', run: onClearChat },
    delete: { title: 'Delete this chat?', text: `Your conversation with ${otherUserName} will be deleted for good.`, action: 'Delete', run: onDeleteChat },
    remove: { title: 'Remove connection?', text: `${otherUserName} will be removed from your connections. You can connect again later.`, action: 'Remove', run: onRemoveConnection },
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Chat options">
      <div className="absolute inset-0 animate-fadeIn bg-maroon-900/25 backdrop-blur-[2px]" onClick={confirm ? () => setConfirm(null) : onClose} />

      {!confirm ? (
        <div
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
          className="relative w-full animate-rise-in rounded-t-[28px] bg-white p-4 sm:max-w-sm sm:rounded-[28px] sm:p-5"
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-sandal-300 sm:hidden" />
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-base font-semibold text-maroon-900">Chat options</h3>
            <button onClick={onClose} className="icon-btn" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <ul>
            {items.map(({ id, label, hint, Icon, tone, run }) => (
              <li key={id}>
                <button onClick={run} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-sandal-50" style={{ minHeight: 0 }}>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                    <Icon size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-maroon-900">{label}</span>
                    <span className="block text-xs text-maroon-900/50">{hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="relative m-4 w-full max-w-sm animate-scale-in rounded-[28px] bg-white p-6 text-center">
          <h3 className="text-lg font-semibold text-maroon-900">{confirms[confirm].title}</h3>
          <p className="mt-2 text-sm text-maroon-900/60">{confirms[confirm].text}</p>
          <div className="mt-5 flex gap-2">
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
      )}
    </div>,
    document.body
  );
};

export default ChatOptionsMenu;
