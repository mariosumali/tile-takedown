'use client';

import { motion, useReducedMotion } from 'framer-motion';

type Props = {
  /** The +N number shown in Caprasimo. */
  amount: number;
  /** Multiplier string (e.g. "1.25"). Only rendered when combo > 1. */
  mult: string;
  /** Active combo count; > 1 renders the ×mult chip in mustard. */
  combo: number;
  /**
   * Position within the board as a pair of percentages (0–100). Defaults to
   * the board midpoint if not provided.
   */
  xPct?: number;
  yPct?: number;
  /** Re-keyed by parent so the same popup re-fires if the same line clears again. */
  popupKey: string | number;
};

/**
 * Floats above the board for 900ms on each line clear. Spring-scales in, drifts
 * upward, and fades during the last 300ms. Purely decorative — pointer-events
 * are disabled and the element is hidden from assistive tech.
 */
export default function ScorePopup({
  amount,
  mult,
  combo,
  xPct = 50,
  yPct = 50,
  popupKey,
}: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      key={popupKey}
      className="score-popup"
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: `${xPct}%`,
        top: `${yPct}%`,
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.6, x: '-50%', y: '-50%' }}
      animate={
        reduceMotion
          ? {
              opacity: [0, 1, 1, 0],
              scale: 1,
              x: '-50%',
              y: '-50%',
            }
          : {
              opacity: [0, 1, 1, 0],
              scale: [0.6, 1.1, 1.0, 1.0],
              x: '-50%',
              y: ['-50%', 'calc(-50% - 48px)'],
            }
      }
      transition={
        reduceMotion
          ? {
              duration: 0.5,
              times: [0, 0.1, 0.75, 1],
              ease: 'easeOut',
            }
          : {
              duration: 0.9,
              times: [0, 0.22, 0.66, 1],
              ease: 'easeOut',
              scale: {
                duration: 0.42,
                times: [0, 0.55, 1, 1],
                ease: [0.34, 1.56, 0.64, 1],
              },
            }
      }
    >
      <span className="plus">+ {amount}</span>
      {combo > 1 && <span className="mult">&times;{mult}</span>}
    </motion.div>
  );
}
