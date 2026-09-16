import { portfolioTeamShortName } from "./portfolioTeamShortName";
export const shortSeason = (value: string) =>
  value.replace(/\b(?:19|20)(\d{2})\b/g, "$1");
export const shortCountry = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[^\p{Letter}\s]/gu, "")
    .trim()
    .split(/\s+/)[0]
    ?.slice(0, 3)
    .toUpperCase() || "—";
export const shortPlayer = (value: string) => {
  const words = value.trim().split(/\s+/);
  return words.length < 2
    ? value
    : `${words[0][0]}. ${words.slice(1).join(" ")}`;
};
export const shortTeam = (value: string) =>
  portfolioTeamShortName(value).toUpperCase();
export const shortCompetition = (name: string, code: string) =>
  code ||
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
export const primarySeasonRole = (
  counts: Record<string, number>,
  fallback: string,
) => Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] || fallback;
