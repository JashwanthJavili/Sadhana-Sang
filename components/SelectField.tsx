import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  icon?: React.ReactNode;
  wrapperClassName?: string;
}

/**
 * Shared beautiful select / dropdown component used across the app.
 * Renders a full-width labelled select (for forms) when `label` is provided,
 * or a compact inline select (for filter chips) when used without a label.
 */
const SelectField: React.FC<SelectFieldProps> = ({
  label,
  icon,
  wrapperClassName = '',
  className = '',
  children,
  ...props
}) => {
  if (label) {
    // ── Form / full-width variant ──────────────────────────────────────────
    return (
      <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
        <label className="text-xs font-semibold uppercase tracking-wide text-maroon-900/60">
          {label}
        </label>
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-marigold-500">
              {icon}
            </span>
          )}
          <select
            className={`
              w-full appearance-none rounded-2xl bg-white py-2.5 pr-10 text-sm font-medium
              text-maroon-900 shadow-soft ring-1 ring-sandal-200 outline-none
              transition
              hover:ring-marigold-400/60
              focus:ring-2 focus:ring-marigold-400
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? 'pl-10' : 'pl-4'}
              ${className}
            `}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-maroon-900/40"
          />
        </div>
      </div>
    );
  }

  // ── Chip / inline variant (no label) ──────────────────────────────────────
  return (
    <div className={`relative shrink-0 ${wrapperClassName}`}>
      <select
        className={`
          h-9 max-w-[11rem] appearance-none cursor-pointer truncate rounded-full
          border-0 pl-4 pr-8 text-sm font-medium outline-none ring-1
          transition focus:ring-2 focus:ring-marigold-400
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={13}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-current opacity-50"
      />
    </div>
  );
};

export default SelectField;
