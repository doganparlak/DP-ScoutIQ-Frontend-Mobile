/** Format decimal metrics in commentary only; never alter the underlying evidence. */
export function formatNarrativeNumbers(text: string, language = 'en'): string {
  const tr = language.toLowerCase().startsWith('tr');
  const protectedPattern = /https?:\/\/\S+|\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b|\b\d{1,4}([./-])\d{1,2}\1\d{1,4}\b|\b\d+(?:\.\d+){2,}\b|\b\d+(?:[.,]\d+)?[eE][+-]?\d+\b/g;
  const protectedRanges = Array.from(text.matchAll(protectedPattern), match => [match.index!, match.index! + match[0].length]);
  const format = new Intl.NumberFormat(tr ? 'tr-TR' : 'en-US', { maximumFractionDigits: 2, useGrouping: false });
  return text.replace(/(^|[^\p{L}\p{N}_.,])(-?\d+[.,]\d+)(?![\p{L}\p{N}_]|[.,]\d)/gu, (match, prefix: string, token: string, offset: number) => {
    const start = offset + prefix.length;
    if (protectedRanges.some(([from, to]) => start >= from && start < to)) return match;
    const thousands = tr ? /^-?[1-9]\d{0,2}\.\d{3}$/ : /^-?[1-9]\d{0,2},\d{3}$/;
    if (thousands.test(token)) return match;
    const value = Number(token.replace(',', '.'));
    if (!Number.isFinite(value)) return match;
    const rounded = format.format(value);
    return prefix + (Number(rounded.replace(',', '.')) === 0 ? '0' : rounded);
  });
}
