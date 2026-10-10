export const PREDICTION_PRIZES_KEY = 'score_prediction_prizes';
export const EMPTY_PREDICTION_PRIZES = '{"weeks":{}}';
export type PrizeText = string | { tr?: string; en?: string };
export type PredictionPrizes = { first: PrizeText; second: PrizeText; third: PrizeText; note?: PrizeText };
export type PredictionPrizeWeeks = Record<string, PredictionPrizes>;

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function text(value: unknown, limit = 500): PrizeText | undefined {
  if (typeof value === 'string') return value.trim() && value.length <= limit ? value.trim() : undefined;
  if (!object(value)) return undefined;
  const tr = typeof value.tr === 'string' ? value.tr.trim() : '';
  const en = typeof value.en === 'string' ? value.en.trim() : '';
  return (tr || en) && tr.length <= limit && en.length <= limit ? { tr, en } : undefined;
}
export function prizeText(value: PrizeText, tr: boolean): string {
  return typeof value === 'string' ? value : (tr ? value.tr || value.en : value.en || value.tr) || '';
}

/** Invalid/missing entries never advertise another week's prizes. */
export function parsePredictionPrizes(raw: string): PredictionPrizeWeeks {
  const result: PredictionPrizeWeeks = {};
  try {
    const config: unknown = JSON.parse(raw);
    if (!object(config) || !object(config.weeks)) return result;
    for (const [week, entry] of Object.entries(config.weeks)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || !object(entry) || entry.enabled === false) continue;
      const date = new Date(`${week}T00:00:00Z`);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== week || date.getUTCDay() !== 1) continue;
      const first = text(entry.first), second = text(entry.second), third = text(entry.third);
      if (first && second && third) result[week] = { first, second, third, note: text(entry.note, 1500) };
    }
  } catch { /* A bad Firebase value must not affect predictions or scoring. */ }
  return result;
}

/** Suppress the superseded delivery promise even in cached Firebase values. */
export function prizeNote(value: PrizeText, tr: boolean): string {
  return prizeText(value, tr)
    .replace(/Ödüller,\s*o haftanın maçları tamamlandıktan sonraki 12 saat içinde hesaplara tanımlanacaktır\.?/gi, '')
    .replace(/Prizes will be credited to winners[’'] accounts within 12 hours after all matches in that week[’']s competition finish\.?/gi, '')
    .trim();
}
