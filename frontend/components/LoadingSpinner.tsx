import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { spinner: 'h-7 w-7 border-[3px]', text: 'text-sm' },
  md: { spinner: 'h-10 w-10 border-[3px]', text: 'text-sm' },
  lg: { spinner: 'h-14 w-14 border-4', text: 'text-base' },
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading…', size = 'md' }) => {
  const { spinner, text } = SIZES[size];
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className={`${spinner} animate-spin rounded-full border-sandal-300 border-t-brand-600`} />
      {message && <p className={`${text} text-stone-500`}>{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
