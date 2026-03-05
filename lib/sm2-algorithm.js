// SM-2 Spaced Repetition Algorithm
// Rating: 0 = Hard, 1 = Good, 2 = Easy
// Maps to SM-2 quality: Hard=2, Good=3, Easy=5

/**
 * Calculate next review schedule for a card based on user rating.
 * Pure function — no side effects.
 *
 * @param {{ interval: number, repetitions: number, easeFactor: number }} card
 * @param {0|1|2} rating - 0=Hard, 1=Good, 2=Easy
 * @returns {{ interval: number, repetitions: number, easeFactor: number, nextReview: string }}
 */
export function calculateSM2(card, rating) {
  const qualityMap = { 0: 2, 1: 3, 2: 5 };
  const quality = qualityMap[rating];

  let { interval, repetitions, easeFactor } = card;

  if (quality < 3) {
    // Hard — reset repetitions, short interval
    repetitions = 0;
    interval = 1;
  } else {
    // Good or Easy — advance schedule
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  // Adjust ease factor (minimum 1.3)
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  // Calculate next review date
  const next = new Date();
  next.setDate(next.getDate() + interval);
  const nextReview = next.toISOString().split('T')[0];

  return { interval, repetitions, easeFactor, nextReview };
}

/**
 * Create default SM-2 state for a new card.
 * @returns {{ interval: number, repetitions: number, easeFactor: number, nextReview: string }}
 */
export function createDefaultSM2() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    interval: 1,
    repetitions: 0,
    easeFactor: 2.5,
    nextReview: tomorrow.toISOString().split('T')[0],
  };
}
