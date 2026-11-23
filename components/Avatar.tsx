import React, { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  /** Tailwind size classes, e.g. "h-10 w-10" */
  className?: string;
  textClassName?: string;
}

const getInitials = (name?: string | null) =>
  (name || 'Devotee')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'D';

/** Profile photo with a graceful initials fallback. */
const Avatar: React.FC<AvatarProps> = ({ src, name, className = 'h-10 w-10', textClassName = 'text-sm' }) => {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name || 'User'}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${className} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      className={`${className} ${textClassName} flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-marigold-400 to-brand-600 font-semibold text-white`}
      aria-label={name || 'User'}
    >
      {getInitials(name)}
    </span>
  );
};

export default Avatar;
