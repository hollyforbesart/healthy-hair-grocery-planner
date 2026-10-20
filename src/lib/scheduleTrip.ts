/**
 * A round trip from the meal schedule to meal ideas and back: when someone
 * taps "Find dinner ideas" for an empty spot, meal ideas shows a "Back to my
 * schedule" button, and the schedule reopens that spot when they return.
 * Kept for this visit only (sessionStorage).
 */
import type { MealCategory } from '../types';

export interface ScheduleTrip {
  /** The spot they were filling, if any. */
  day?: number;
  category?: MealCategory;
  /** The meal-type filter before the trip, put back afterwards. */
  previousCategories: MealCategory[];
}

const TRIP_KEY = 'mm_schedule_trip';
const REOPEN_KEY = 'mm_schedule_reopen';

const read = <T,>(key: string): T | null => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const write = (key: string, value: unknown) => {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Without storage the trip just doesn't offer the way back.
  }
};

export const startScheduleTrip = (trip: ScheduleTrip) => write(TRIP_KEY, trip);
export const currentScheduleTrip = () => read<ScheduleTrip>(TRIP_KEY);

/** Ends the trip without going back (e.g. they carried on to Review instead). */
export const cancelScheduleTrip = () => write(TRIP_KEY, null);

/** Ends the trip; the schedule then reopens the spot they were filling. */
export function endScheduleTrip(): ScheduleTrip | null {
  const trip = currentScheduleTrip();
  write(TRIP_KEY, null);
  if (trip && trip.day !== undefined && trip.category) write(REOPEN_KEY, { day: trip.day, category: trip.category });
  return trip;
}

/** The spot to reopen on the schedule, once. */
export function takeSpotToReopen(): { day: number; category: MealCategory } | null {
  const spot = read<{ day: number; category: MealCategory }>(REOPEN_KEY);
  write(REOPEN_KEY, null);
  return spot;
}
