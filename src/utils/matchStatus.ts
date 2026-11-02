type MatchStatus = {
  code?: unknown;
  name?: unknown;
  short_name?: unknown;
  developer_name?: unknown;
};

const LABELS: Record<string, readonly [string, string]> = {
  NS: ['Başlamadı', 'Not started'],
  TBA: ['Saat belirsiz', 'Time TBA'],
  FT: ['Tamamlandı', 'Finished'],
  AET: ['Uzatma sonu', 'After extra time'],
  PEN: ['Penaltı sonu', 'After penalties'],
  HT: ['Devre arası', 'Half-time'],
  FIRST: ['İlk yarı', 'First half'],
  SECOND: ['İkinci yarı', 'Second half'],
  ET: ['Uzatma', 'Extra time'],
  BREAK: ['Ara', 'Break'],
  LIVE: ['Canlı', 'Live'],
  PENLIVE: ['Penaltılar', 'Penalties'],
  POST: ['Ertelendi', 'Postponed'],
  DELAYED: ['Gecikmeli', 'Delayed'],
  CANC: ['İptal', 'Cancelled'],
  ABAN: ['Yarıda kaldı', 'Abandoned'],
  INT: ['Duraklatıldı', 'Interrupted'],
  SUSP: ['Durduruldu', 'Suspended'],
  WO: ['Hükmen', 'Walkover'],
  AWARDED: ['Hükmen', 'Awarded'],
};
const ALIASES: Record<string, string> = {
  NOTSTARTED: 'NS', SCHEDULED: 'NS', TOBEANNOUNCED: 'TBA',
  FULLTIME: 'FT', FINISHED: 'FT', ENDED: 'FT',
  AFTEREXTRATIME: 'AET', FTPEN: 'PEN', AFTERPENALTIES: 'PEN',
  HALFTIME: 'HT', '1ST': 'FIRST', '1STHALF': 'FIRST', FIRSTHALF: 'FIRST', INPLAY1STHALF: 'FIRST',
  '2ND': 'SECOND', '2NDHALF': 'SECOND', SECONDHALF: 'SECOND', INPLAY2NDHALF: 'SECOND',
  INPLAYET: 'ET', EXTRATIME: 'ET', INPLAY: 'LIVE', INPROGRESS: 'LIVE',
  PENALTIES: 'PENLIVE', PENALTYSHOOTOUT: 'PENLIVE',
  POSTP: 'POST', POSTPONED: 'POST', CANCL: 'CANC', CANCELLED: 'CANC', CANCELED: 'CANC',
  ABANDONED: 'ABAN', INTERRUPTED: 'INT', SUSPENDED: 'SUSP', WALKOVER: 'WO',
};

export function matchStatusLabel(state: MatchStatus | null | undefined, tr: boolean): string {
  const values = [state?.code, state?.short_name, state?.developer_name, state?.name]
    .filter((value): value is string => typeof value === 'string' && !!value.trim());
  for (const value of values) {
    const key = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const label = LABELS[ALIASES[key] || key];
    if (label) return label[tr ? 0 : 1];
  }
  return (typeof state?.name === 'string' && state.name.trim()) || values[0] || '—';
}
