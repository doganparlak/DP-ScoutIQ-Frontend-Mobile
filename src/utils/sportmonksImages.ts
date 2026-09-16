function positiveInteger(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

export function sportmonksTeamImage(id: unknown): string | undefined {
  const teamId = positiveInteger(id);
  return teamId
    ? `https://cdn.sportmonks.com/images/soccer/teams/${teamId % 32}/${teamId}.png`
    : undefined;
}

export function sportmonksLeagueImage(id: unknown): string | undefined {
  const leagueId = positiveInteger(id);
  return leagueId
    ? `https://cdn.sportmonks.com/images/soccer/leagues/${leagueId % 32}/${leagueId}.png`
    : undefined;
}

export function cleanImageUrl(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
