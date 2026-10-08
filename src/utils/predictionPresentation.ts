/** Kickoffs arrive as UTC. Display in the device timezone, with a clear date/time separator. */
export function predictionDateTime(value: string, tr: boolean): string {
  const normalized = value.replace(' ', 'T');
  const date = new Date(normalized + (/Z$|[+-]\d\d:\d\d$/.test(normalized) ? '' : 'Z'));
  const locale = tr ? 'tr-TR' : 'en-GB';
  return `${date.toLocaleDateString(locale, {day:'2-digit',month:'short',year:'numeric'})} – ${date.toLocaleTimeString(locale, {hour:'2-digit',minute:'2-digit'})}`;
}

/** Competition dates use the common Istanbul calendar; kickoff times remain local above. */
export function predictionWeekLabel(value: string, tr: boolean): string {
  const start = new Date(value + 'T00:00:00Z');
  start.setUTCDate(start.getUTCDate() + 4);
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 3);
  const options: Intl.DateTimeFormatOptions = {day:'numeric',month:'short',timeZone:'UTC'};
  const locale = tr ? 'tr-TR' : 'en-GB';
  return `${start.toLocaleDateString(locale, options)} – ${end.toLocaleDateString(locale, options)}`;
}
