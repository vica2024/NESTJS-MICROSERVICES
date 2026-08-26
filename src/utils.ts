import { format } from './i18n';
import type { Dictionary } from './i18n';

export function formatUsd(cents: number, numberLocale = 'en-US'): string {
  const dollars = cents / 100;
  return dollars.toLocaleString(numberLocale, { maximumFractionDigits: dollars % 1 === 0 ? 0 : 2 });
}

export function relativeTime(ts: number, t: Dictionary): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return format(t.time.secondsAgo, { n: diffSec });
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return format(t.time.minutesAgo, { n: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return format(t.time.hoursAgo, { n: diffHr });
  return format(t.time.daysAgo, { n: Math.floor(diffHr / 24) });
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
