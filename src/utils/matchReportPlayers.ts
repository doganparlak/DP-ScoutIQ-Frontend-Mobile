import type { MatchReportLineup, MatchReportEvent } from '@/services/matchPool';
export const playerGroups = [
  ['contribution_impact', 'Katkı ve Etki', 'Contribution & Impact'], ['goalkeeping', 'Kalecilik', 'Goalkeeping'],
  ['shooting', 'Şut', 'Shooting'], ['passing', 'Pas', 'Passing'], ['defending', 'Savunma', 'Defending'],
  ['errors_discipline', 'Hatalar ve Disiplin', 'Errors & Discipline'],
] as const;
export const numeric = (value: unknown) => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
export const playerValue = (player: MatchReportLineup, name: string) => player.categories?.contribution_impact?.find(m => m.name === name)?.value;
export function positionOrder(player: MatchReportLineup) {
  const name = (player.position_name || '').toLowerCase();
  if (player.position_id === 24 || /goalkeeper|kaleci/.test(name)) return 0;
  if (player.position_id === 25 || /defender|back/.test(name)) return 1;
  if (player.position_id === 26 || /midfielder|midfield/.test(name)) return 2;
  if (player.position_id === 27 || /attacker|forward/.test(name)) return 3;
  return 4;
}
export function teamPlayers(lineups: MatchReportLineup[], events: MatchReportEvent[], teamId?: number) {
  const entry = (id: number) => Number(events.find(e => Number(e.player_id) === id && e.type?.toLowerCase() === 'substitution')?.minute || 999);
  return lineups.filter(p => p.team_id === teamId && (numeric(playerValue(p, 'Minutes Played')) || 0) > 0).sort((a, b) =>
    Number(Boolean(b.starter)) - Number(Boolean(a.starter)) || (!a.starter && !b.starter ? entry(a.player_id) - entry(b.player_id) : 0) || positionOrder(a) - positionOrder(b) || Number(a.jersey_number || 99) - Number(b.jersey_number || 99));
}
export function setPieceTarget(name: string) {
  const value = name.toLowerCase();
  if (/goal|shot|xg|xgot|npxg|finishing|penalt/.test(value)) return 'shooting';
  if (/assist|xa|pass|cross|corner|key.?pass|through.?ball|chance|delivery|free.?kick/.test(value)) return 'passing';
  if (/defen|tackle|interception|duel|aerial|clearance|block|recovery|conced/.test(value)) return 'defending';
  if (/error|foul|card|offside|possession.?lost/.test(value)) return 'errors_discipline';
  return 'contribution_impact';
}
export function playerSections(player: MatchReportLineup) {
  return playerGroups.map(([key, tr, en]) => ({ key, tr, en, metrics: [...(player.categories?.[key] || []), ...(player.categories?.set_pieces || []).filter(m => setPieceTarget(m.name) === key)] })).filter(g => g.metrics.length);
}
