import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * A search that stays out of the way: just an icon until it is tapped,
 * then it opens into a field. It stays open while there is text in it.
 */
const CollapsibleSearch: React.FC<Props> = ({ value, onChange, placeholder = 'Search', className = '' }) => {
  const [open, setOpen] = useState(!!value);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const close = () => {
    onChange('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-maroon-800 shadow-soft ring-1 ring-sandal-200 transition hover:bg-sandal-50 active:scale-95 ${className}`}
        aria-label={placeholder}
        title={placeholder}
        style={{ minHeight: 0 }}
      >
        <Search size={18} />
      </button>
    );
  }

  return (
    <label
      className={`flex h-10 min-w-0 flex-1 animate-fadeIn items-center gap-2 rounded-full bg-white pl-3.5 pr-1 shadow-soft ring-1 ring-sandal-200 focus-within:ring-2 focus-within:ring-marigold-400 ${className}`}
    >
      <Search size={16} className="shrink-0 text-maroon-900/40" />
      <input
        ref={input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => !value && setOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && close()}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent text-sm text-maroon-900 outline-none placeholder:text-maroon-900/40"
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={close}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-maroon-900/45 hover:bg-sandal-100"
        aria-label="Close search"
        style={{ minHeight: 0 }}
      >
        <X size={15} />
      </button>
    </label>
  );
};

export default CollapsibleSearch;
