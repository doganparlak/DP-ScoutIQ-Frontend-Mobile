// Metric names match ScoutWise enterprise comparisons.
const CANONICAL_LABELS = [
  "Blocked Shots",
  "Tackles Won",
  "Big Chances Missed",
  "Chances Created",
  "Goals Conceded",
  "Long Balls Won",
  "Successful Crosses (%)",
  "Last Man Tackle",
  "Accurate Passes (%)",
  "Aerials Won (%)",
  "Fouls",
  "Hit Woodwork",
  "Total Duels",
  "Accurate Passes",
  "Error Lead To Goal",
  "Error Lead To Shot",
  "Key Passes",
  "Penalties Missed",
  "Yellow Cards",
  "Duels Won",
  "Rating",
  "Shots Total",
  "Shots On Target (%)",
  "Expected Goals",
  "Expected Goals On Target",
  "Shooting Performance",
  "Shot Quality (%)",
  "On-Target Shot Quality (%)",
  "Goal Conversion (%)",
  "On-Target to Goal Conversion (%)",
  "Assist Efficiency (%)",
  "Dribble Accuracy (%)",
  "Total Crosses",
  "Passes",
  "Offsides",
  "Aerials Lost",
  "Penalties Committed",
  "Possession Lost",
  "Long Balls",
  "Aerials Won",
  "Clearances",
  "Man Of Match",
  "Match Count",
  "Ball Recovery",
  "Red Cards",
  "Accurate Crosses",
  "Goals",
  "Offsides Provoked",
  "Aerials",
  "Saves",
  "Touches",
  "Assists",
  "Minutes Played",
  "Dribble Attempts",
  "Tackles",
  "Turn Over",
  "Fouls Drawn",
  "Big Chances Created",
  "Long Balls Won (%)",
  "Penalties Scored",
  "Penalties Won",
  "Duels Lost",
  "Penalties Saved",
  "Saves Insidebox",
  "Shots Off Target",
  "Good High Claim",
  "Dispossessed",
  "Shots On Target",
  "Through Balls Won",
  "Duels Won (%)",
  "Punches",
  "Successful Dribbles",
  "Tackles Won (%)",
  "Interceptions",
  "Yellow & Red Cards",
  "Backward Passes",
  "Captain",
  "Own Goals",
  "Dribbled Past",
  "Clearance Offline",
  "Through Balls",
  "Passes In Final Third",
];

const CANON_BY_KEY: Record<string, string> = {};
CANONICAL_LABELS.forEach((label) => {
  CANON_BY_KEY[metricKey(label)] = label;
});
CANON_BY_KEY[metricKey("yellow_red_cards")] = "Yellow & Red Cards";
CANON_BY_KEY[metricKey("shots_blocked")] = "Blocked Shots";

function metricKey(value: string) {
  return value
    .replace(/%/g, " percentage ")
    .replace(/&/g, " and ")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function canonicalizeLeagueMetricLabel(raw: string) {
  return CANON_BY_KEY[metricKey(raw || "")] || (raw || "").trim();
}
