import React from 'react';
// @ts-ignore
import maleAvatar from '../utils/Images/avatar-male.png';
// @ts-ignore
import femaleAvatar from '../utils/Images/avatar-female.png';

interface AvatarProps {
  /** Kept for call-site compatibility — profile photos are no longer shown */
  src?: string | null;
  name?: string | null;
  gender?: 'male' | 'female' | null;
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

/** Devotee avatar — a friendly illustration by gender (initials if gender is unknown). */
const Avatar: React.FC<AvatarProps> = ({ name, gender, className = 'h-10 w-10', textClassName = 'text-sm' }) => {
  if (gender === 'male' || gender === 'female') {
    return (
      <img
        src={gender === 'female' ? femaleAvatar : maleAvatar}
        alt={name || 'Devotee'}
        loading="lazy"
        draggable={false}
        className={`${className} shrink-0 rounded-full bg-amber-50 object-cover`}
      />
    );
  }
  return (
    <span
      className={`${className} ${textClassName} flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-marigold-400 to-brand-600 font-semibold text-white`}
      aria-label={name || 'Devotee'}
    >
      {getInitials(name)}
    </span>
  );
};

export default Avatar;
