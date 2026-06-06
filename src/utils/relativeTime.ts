/**
 * Format a past timestamp (ms since epoch) into a short, localized relative
 * string such as "just now", "2h ago", "yesterday", or "last week".
 *
 * Uses Intl.RelativeTimeFormat so output is correctly localized for the active
 * i18n language (en / ja / zh) without needing per-string translation keys.
 */
export const formatRelativeTime = (
  timestamp: number,
  locale: string = "en"
): string => {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "";

  const diffMs = timestamp - Date.now();
  const seconds = Math.round(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const divisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 7, unit: "day" },
    { amount: 4.34524, unit: "week" },
    { amount: 12, unit: "month" },
    { amount: Number.POSITIVE_INFINITY, unit: "year" },
  ];

  let value = seconds;
  for (const { amount, unit } of divisions) {
    if (Math.abs(value) < amount) {
      return rtf.format(Math.round(value), unit);
    }
    value /= amount;
  }

  return rtf.format(Math.round(value), "year");
};
