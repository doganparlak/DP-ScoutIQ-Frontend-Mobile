import type { PlayerData } from "@/types";
import { portfolioTeamShortName } from "./portfolioTeamShortName";
const LEAGUES: Record<string, string> = {
  "super lig": "SL",
  "super league": "SL",
  "premier league": "EPL",
  "la liga": "LL",
  laliga: "LL",
  bundesliga: "BL",
  "serie a": "SA",
  "ligue 1": "L1",
  "champions league": "CL",
  "uefa champions league": "CL",
  "europa league": "EL",
  "uefa europa league": "EL",
  "conference league": "UECL",
  "uefa conference league": "UECL",
};
export function comparisonSourceShortLabel(source: {
  competition: string;
  leagueShortCode?: string;
  team: string;
}) {
  const normalized = source.competition
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const supplied = source.leagueShortCode?.trim();
  const league =
    LEAGUES[normalized] ||
    (supplied && supplied.length <= 6
      ? supplied.toUpperCase()
      : normalized
          .split(/\s+/)
          .filter(Boolean)
          .map((word) => word[0])
          .join("")
          .toUpperCase());
  return [league, source.team.trim() ? portfolioTeamShortName(source.team).toUpperCase() : '']
    .filter(Boolean)
    .join(" ");
}
export function comparisonSourceLabels(
  player: PlayerData,
  tr: boolean,
  worldCupMode = false,
) {
  if (player.meta?.comparisonSources?.length)
    return [
      ...new Set(player.meta.comparisonSources.map(comparisonSourceShortLabel)),
    ];
  if (worldCupMode) return [tr ? "Dünya Kupası" : "World Cup"];
  if (player.entityType === "season")
    return [
      [player.meta?.seasonName?.replace(/\b(?:19|20)(\d{2})\b/g, '$1'), comparisonSourceShortLabel({
        competition: player.meta?.league || "",
        team: player.meta?.team || "",
      })].filter(Boolean).join(' · '),
    ];
  return [tr ? "Tüm Veriler" : "All Data"];
}
