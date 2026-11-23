import React, { useEffect, useRef, useState } from 'react';
import { Music2 } from 'lucide-react';

/** Devotional tracks (files live in /public/audio) */
const SONGS = [
  {
    id: 'om-namo',
    file: 'Om_Namo_Bagavathevasudeyava.mp3',
    displayName: 'Om Namo Bhagavate Vasudevaya',
  },
];

const VOLUME_KEY = 'backgroundMusicVolume';

/**
 * Header kirtan control — a small pill that plays / pauses the devotional track.
 * No floating button, no auto pop-ups; it fades in gently when started.
 */
const BackgroundMusic: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const song = SONGS[0];

  const targetVolume = (() => {
    try {
      const saved = localStorage.getItem(VOLUME_KEY);
      return saved ? Math.min(Math.max(parseFloat(saved) / 100, 0.05), 1) : 0.6;
    } catch {
      return 0.6;
    }
  })();

  useEffect(
    () => () => {
      if (fadeRef.current) clearInterval(fadeRef.current);
      audioRef.current?.pause();
    },
    []
  );

  const fadeTo = (to: number, done?: () => void) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (fadeRef.current) clearInterval(fadeRef.current);
    fadeRef.current = setInterval(() => {
      const step = 0.04;
      const next = audio.volume < to ? Math.min(audio.volume + step, to) : Math.max(audio.volume - step, to);
      audio.volume = next;
      if (next === to) {
        if (fadeRef.current) clearInterval(fadeRef.current);
        done?.();
      }
    }, 60);
  };

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      setIsPlaying(false);
      fadeTo(0, () => audio.pause());
    } else {
      try {
        audio.volume = 0;
        await audio.play();
        setIsPlaying(true);
        fadeTo(targetVolume);
      } catch (err) {
        console.warn('Audio play prevented:', err);
      }
    }
  };

  return (
    <>
      <audio ref={audioRef} loop preload="none" src={`/audio/${song.file}`} onPause={() => setIsPlaying(false)} />
      <button
        onClick={toggle}
        title={isPlaying ? `Pause · ${song.displayName}` : `Play kirtan · ${song.displayName}`}
        aria-label={isPlaying ? 'Pause kirtan' : 'Play kirtan'}
        aria-pressed={isPlaying}
        className={`group inline-flex h-10 items-center gap-2 rounded-xl px-2.5 text-sm font-medium transition-all duration-200 sm:px-3 ${
          isPlaying
            ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
            : 'text-maroon-900/55 hover:bg-white hover:text-maroon-900 hover:shadow-sm hover:ring-1 hover:ring-sandal-300/70'
        }`}
        style={{ minHeight: 0 }}
      >
        {isPlaying ? (
          <>
            <span className="flex h-4 items-end gap-[3px]" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-full bg-brand-600"
                  style={{ animation: `eq 0.9s ${i * 0.15}s ease-in-out infinite alternate`, height: '100%' }}
                />
              ))}
            </span>
          </>
        ) : (
          <Music2 size={18} />
        )}
        <span className="hidden md:inline">{isPlaying ? 'Playing' : 'Kirtan'}</span>
      </button>
      <style>{`@keyframes eq { from { transform: scaleY(0.3); } to { transform: scaleY(1); } } [style*="animation: eq"] { transform-origin: bottom; }`}</style>
    </>
  );
};

export default BackgroundMusic;
