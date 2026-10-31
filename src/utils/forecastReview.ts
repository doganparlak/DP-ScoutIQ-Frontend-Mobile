import type {PostMatchCardData} from '@/services/matchPool';

/** Regulation-time outcomes only; never include extra time or shootouts. */
export function forecastActuals(data: PostMatchCardData, homeId: number, awayId: number) {
  const state = [data.state?.short_name, data.state?.developer_name, data.state?.name]
    .filter(Boolean).join(' ').toLowerCase().replace(/[_-]/g, ' ');
  const finished = /\b(ft|aet|pen)\b|full time|finished|completed|after extra time|after penalties/.test(state);
  const extraTime = /\b(aet|pen)\b|extra time|penalt/.test(state);
  const score = (id: number, description: string) => {
    const value = data.scores.find(row => row.participant_id === id && row.description === description)?.score?.goals;
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
  };
  if (!finished) return null;
  const home = score(homeId, '2ND_HALF') ?? (extraTime ? null : score(homeId, 'CURRENT'));
  const away = score(awayId, '2ND_HALF') ?? (extraTime ? null : score(awayId, 'CURRENT'));
  if (home == null || away == null) return null;
  const firstHome = score(homeId, '1ST_HALF'), firstAway = score(awayId, '1ST_HALF');
  const halvesKnown = firstHome != null && firstAway != null && firstHome <= home && firstAway <= away;
  const firstGoals = halvesKnown ? firstHome + firstAway : null;
  const secondGoals = firstGoals == null ? null : home + away - firstGoals;
  return {
    home, away, outcome: home > away ? 'home' : home < away ? 'away' : 'draw',
    range: home + away <= 1 ? 0 : home + away <= 3 ? 1 : 2,
    over25: home + away >= 3, bothTeamsScore: home > 0 && away > 0,
    firstHalfBothTeamsScore: halvesKnown ? firstHome > 0 && firstAway > 0 : null,
    moreGoalsHalf: firstGoals == null || secondGoals == null ? null : firstGoals > secondGoals ? 'first' : firstGoals < secondGoals ? 'second' : 'equal',
    cleanSheet: {home: away === 0, away: home === 0},
  };
}
