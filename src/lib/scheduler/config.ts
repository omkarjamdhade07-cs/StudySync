/**
 * Scheduler configuration — all weights and constants live here.
 * Changing a weight here affects every priority calculation in the app.
 * Values are documented so they can be cited in the project report.
 */

/**
 * Priority score weights.
 * Must sum to 1.0.
 *
 * URGENCY   — how close the exam is (exponential, 1.0 on exam day)
 * DIFFICULTY — how hard the topic is (normalised from the 1–5 scale)
 * WEAKNESS  — composite of confidence, missed count, and understanding
 * REMAINING — how much of the topic is still uncovered
 */
export const WEIGHTS = {
  URGENCY: 0.40,
  DIFFICULTY: 0.20,
  WEAKNESS: 0.25,
  REMAINING: 0.15,
} as const

/**
 * Weakness sub-weights (must sum to 1.0).
 * CONFIDENCE    — student's self-rated confidence (inverted: low confidence → high weakness)
 * MISSED        — how many times they've missed this topic (capped at 5 misses)
 * UNDERSTANDING — inverse of average post-session understanding rating
 */
export const WEAKNESS_WEIGHTS = {
  CONFIDENCE: 0.5,
  MISSED: 0.3,
  UNDERSTANDING: 0.2,
} as const

/**
 * Spaced-repetition revision offsets in days after the first study session.
 * Based on the spacing effect literature (Ebbinghaus forgetting curve approximation).
 */
export const REVISION_OFFSETS = [1, 3, 7, 14] as const

/** Duration of each revision block in minutes. */
export const REVISION_DURATION = 20

/**
 * Priority boost applied to revision tasks so they are preferentially
 * scheduled over new study tasks of similar priority.
 */
export const REVISION_PRIORITY_BOOST = 0.1

/** Maximum planning horizon in days. Plans beyond 60 days are not generated. */
export const MAX_HORIZON_DAYS = 60

/**
 * Default normalised understanding score (0–1) used when a topic has no
 * post-session ratings yet. 0.5 = neutral (neither strong nor weak).
 */
export const DEFAULT_UNDERSTANDING_N = 0.5

/**
 * Maximum number of missed sessions tracked for the weakness calculation.
 * Beyond this, additional misses don't further increase the weakness score.
 */
export const MAX_MISSED_FOR_WEAKNESS = 5
