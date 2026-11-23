import React from 'react';

/** Japa mala (prayer beads) icon — a ring of beads with a hanging head bead and tassel. */
const MalaIcon: React.FC<{ size?: number | string; strokeWidth?: number; className?: string }> = ({
  size = 20,
  strokeWidth = 2,
  className = '',
}) => {
  const beads = 9;
  const cx = 12;
  const cy = 9;
  const r = 6.9;
  const points = Array.from({ length: beads }, (_, i) => {
    // start at the bottom so a bead sits right above the head bead
    const a = Math.PI / 2 + (2 * Math.PI * i) / beads;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.6} fill="currentColor" stroke="none" />
      ))}
      {/* head (Krishna) bead */}
      <circle cx={12} cy={18.9} r={1.9} fill="currentColor" stroke="none" />
      {/* tassel */}
      <path d="M12 20.8v2" strokeWidth={Math.max(1.4, Number(strokeWidth) * 0.75)} />
    </svg>
  );
};

export default MalaIcon;
