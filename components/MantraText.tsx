import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { layoutMantra, typedLines } from '../utils/mantraText';

const FONT_STACK = "Poppins, 'Noto Sans Devanagari', 'Noto Sans Telugu', system-ui, sans-serif";
const MAX_SIZE = 22;
const MIN_SIZE = 11;
const MIN_COMFORT = 15; // in Auto, below this size try 4 lines instead of 2

let canvas: HTMLCanvasElement | null = null;
const textWidth = (text: string, weight: number, size: number) => {
  canvas ||= document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.length * size * 0.6;
  ctx.font = `${weight} ${size}px ${FONT_STACK}`;
  return ctx.measureText(text).width;
};

/** Widest line at a 20px reference size */
const widest = (lines: string[]) => Math.max(1, ...lines.map((l) => textWidth(l, 500, 20)));

interface Props {
  text: string;
  /**
   * How many lines the mantra is shown in, set by an admin.
   * undefined = Auto (2, or 4 when long) · 0 = as typed · n = exactly n lines.
   */
  lines?: number;
  className?: string;
}

/**
 * Shows a mantra in a fixed number of lines, shrinking the letters so each
 * line fits the width of the screen and never wraps.
 */
const MantraText: React.FC<Props> = ({ text, lines: wanted, className = '' }) => {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [, setFontsReady] = useState(0);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // measure again once web fonts have loaded
  useEffect(() => {
    (document as any).fonts?.ready?.then(() => setFontsReady((n) => n + 1));
  }, []);

  // font size (px) that makes the widest line fit
  const fitSize = (ls: string[]) => (width > 0 ? Math.min(MAX_SIZE, (20 * width) / widest(ls)) : 16);

  let lines: string[];
  let size: number;

  if (wanted === 0) {
    lines = typedLines(text);
    size = fitSize(lines);
  } else if (wanted && wanted > 0) {
    lines = layoutMantra(text, wanted).split('\n');
    size = fitSize(lines);
  } else {
    const plain = text.replace(/\s+/g, ' ').trim();
    const two = layoutMantra(plain, 2).split('\n');
    lines = two;
    size = fitSize(two);
    if (size < MIN_COMFORT) {
      const four = layoutMantra(plain, 4).split('\n');
      const s4 = fitSize(four);
      if (four.length > two.length && s4 > size) {
        lines = four;
        size = s4;
      }
    }
  }
  size = Math.max(MIN_SIZE, Math.floor(size * 10) / 10);

  return (
    <div ref={box} className={`scrollbar-none w-full overflow-x-auto ${className}`}>
      {lines.map((l, i) => (
        <div key={i} className="whitespace-nowrap" style={{ fontFamily: FONT_STACK, fontSize: size, lineHeight: 1.85 }}>
          {l}
        </div>
      ))}
    </div>
  );
};

export default MantraText;
