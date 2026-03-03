/**
 * Get UTC ISO strings for the start and end of the local day,
 * so database queries correctly match the user's local "today".
 */
export function getLocalDayBoundsUTC(date: Date): { start: string; end: string } {
  const localStart = new Date(date);
  localStart.setHours(0, 0, 0, 0);

  const localEnd = new Date(date);
  localEnd.setHours(23, 59, 59, 999);

  return {
    start: localStart.toISOString(),
    end: localEnd.toISOString(),
  };
}

/**
 * Format a date to a local YYYY-MM-DD string without UTC conversion.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string as a local date (not UTC).
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}
