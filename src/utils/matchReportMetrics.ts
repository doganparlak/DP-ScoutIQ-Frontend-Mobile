// Metric names, order and Turkish labels used by enterprise match reports.
export const teamMetricOrder: Record<string, string[]> = {
  contribution_impact: [
    "Ball Possession %",
    "Attacks",
    "Dangerous Attacks",
    "Big Chances Created",
    "Dribble Attempts",
    "Successful Dribbles",
    "Dribble Accuracy (%)",
  ],
  shooting: [
    "Goal Attempts",
    "Goals",
    "Shots Total",
    "Shots On Target",
    "Shots On Target (%)",
    "Shots Insidebox",
    "Shots Outsidebox",
  ],
  passing: [
    "Passes",
    "Accurate Passes",
    "Accurate Passes (%)",
    "Key Passes",
    "Total Crosses",
    "Accurate Crosses",
    "Accurate Crosses (%)",
    "Long Balls",
    "Long Balls Won",
    "Long Balls Won (%)",
    "Ball Safe",
  ],
  defending: [
    "Duels Won",
    "Successful Headers",
    "Tackles",
    "Interceptions",
    "Blocked Shots",
  ],
  errors_discipline: ["Shots Off Target", "Big Chances Missed"],
};
export const expectedMetricOrder: string[] = [
  "Expected Points (xPTS)",
  "Expected Goals (xG)",
  "Expected Goals on Target (xGoT)",
  "Expected Goals Non Penalty Goals (npxG)",
  "Expected Goals Open Play (xGOP)",
  "Expected Goals Free Kicks (xGFK)",
  "Expected Goals Corners (xGC)",
  "Expected Goals Set Play (xGSP)",
  "Shooting Performance (SP)",
];
const MATCH_METRIC_LABELS_TR: Record<string, string> = {
    Attacks: "Hücumlar",
    "Dangerous Attacks": "Tehlikeli Hücumlar",
    "Ball Possession %": "Topa Sahip Olma (%)",
    "Big Chances Created": "Yaratılan Net Fırsatlar",
    "Dribble Accuracy (%)": "Başarılı Çalım (%)",
    "Dribble Attempts": "Çalım Denemeleri",
    "Successful Dribbles": "Başarılı Çalımlar",
    Captain: "Kaptan",
    "Fouls Drawn": "Kazanılan Fauller",
    "Minutes Played": "Oynanan Dakika",
    Rating: "Puan",
    Touches: "Topla Buluşma",
    Saves: "Kurtarışlar",
    "Saves Insidebox": "Ceza Sahası İçi Kurtarışlar",
    Punches: "Yumruklamalar",
    "Good High Claim": "Başarılı Yüksek Top Alma",
    "Goal Attempts": "Gol Girişimleri",
    Goals: "Goller",
    "Shots Insidebox": "Ceza Sahası İçinden Şutlar",
    "Shots On Target": "İsabetli Şutlar",
    "Shots On Target (%)": "İsabetli Şutlar (%)",
    "Goal Conversion (%)": "Gol Dönüşümü (%)",
    "On Target Goal Conversion (%)": "İsabetli Şuttan Gol Dönüşümü (%)",
    "Shots Outsidebox": "Ceza Sahası Dışından Şutlar",
    "Shots Total": "Toplam Şutlar",
    "Expected Goals": "Gol Beklentisi (xG)",
    "Expected Goals On Target": "İsabetli Şut Gol Beklentisi (xGoT)",
    "Expected Assists": "Asist Beklentisi (xA)",
    "Expected Assists (xA)": "Asist Beklentisi (xA)",
    "Shooting Performance": "Şut Performansı (SP)",
    Passes: "Paslar",
    "Accurate Passes": "İsabetli Paslar",
    "Accurate Passes (%)": "İsabetli Paslar (%)",
    "Accurate Crosses": "İsabetli Ortalar",
    "Accurate Crosses (%)": "İsabetli Ortalar (%)",
    "Assist Efficiency (%)": "Asist Verimliliği (%)",
    "Key Passes": "Kilit Paslar",
    "Long Balls": "Uzun Toplar",
    "Long Balls Won": "Başarılı Uzun Toplar",
    "Long Balls Won (%)": "Başarılı Uzun Toplar (%)",
    "Long Balls Won Percentage": "Başarılı Uzun Toplar (%)",
    "Total Crosses": "Toplam Ortalar",
    Assists: "Asistler",
    "Backward Passes": "Geri Paslar",
    "Passes In Final Third": "Son Üçüncü Bölge Pasları",
    "Successful Crosses Percentage": "Başarılı Ortalar (%)",
    Corners: "Kornerler",
    "Free Kicks": "Serbest Vuruşlar",
    "Goal Kicks": "Kale Vuruşları",
    Throwins: "Taç Atışları",
    "Penalties Scored": "Atılan Penaltılar",
    "Penalties Missed": "Kaçırılan Penaltılar",
    "Penalties Won": "Kazanılan Penaltılar",
    "Penalties Committed": "Yaptırılan Penaltılar",
    "Penalties Saved": "Kurtarılan Penaltılar",
    "Blocked Shots": "Bloke Edilen Şutlar",
    "Shots Blocked": "Bloke Edilen Şutlar",
    "Duels Won": "Kazanılan İkili Mücadeleler",
    Interceptions: "Araya Girmeler",
    "Successful Headers": "Başarılı Kafa Vuruşları",
    Tackles: "Müdahaleler",
    "Tackles Won": "Kazanılan Müdahaleler",
    "Tackles Won (%)": "Kazanılan Müdahaleler (%)",
    Clearances: "Uzaklaştırmalar",
    "Ball Recovery": "Top Kazanma",
    Aerials: "Hava Topları",
    "Aerials Won": "Kazanılan Hava Topları",
    "Aerials Won (%)": "Kazanılan Hava Topları (%)",
    "Aerials Won Percentage": "Kazanılan Hava Topları (%)",
    "Total Duels": "Toplam İkili Mücadeleler",
    "Duels Won (%)": "Kazanılan İkili Mücadeleler (%)",
    "Duels Won Percentage": "Kazanılan İkili Mücadeleler (%)",
    "Big Chances Missed": "Kaçan Net Fırsatlar",
    Fouls: "Fauller",
    Offsides: "Ofsaytlar",
    "Red Cards": "Kırmızı Kartlar",
    "Shots Off Target": "İsabetsiz Şutlar",
    "Yellow Cards": "Sarı Kartlar",
    Yellowcards: "Sarı Kartlar",
    "Aerials Lost": "Kaybedilen Hava Topları",
    Dispossessed: "Top Kaybı",
    "Dribbled Past": "Yenen Çalımlar",
    "Duels Lost": "Kaybedilen İkili Mücadeleler",
    "Error Lead To Goal": "Gole Yol Açan Hata",
    "Error Lead To Shot": "Şuta Yol Açan Hata",
    "Goals Conceded": "Yenen Goller",
    "Goalkeeper Goals Conceded": "Yenen Goller",
    "Possession Lost": "Kaybedilen Toplar",
    "Expected Goals (xG)": "Gol Beklentisi (xG)",
    "Expected Goals on Target (xGoT)": "İsabetli Şut Gol Beklentisi (xGoT)",
    "Expected Goals Penalties (pxG)": "Penaltı Gol Beklentisi (pxG)",
    "Expected Goals Difference (xGD)": "Gol Beklentisi Farkı (xGD)",
    "Expected Goals Prevented (xGP)": "Önlenen Gol Beklentisi (xGP)",
    "Expected Points (xPTS)": "Puan Beklentisi (xPTS)",
    "Expected Goals Free Kicks (xGFK)": "Frikik Gol Beklentisi (xGFK)",
    "Expected Goals Corners (xGC)": "Korner Gol Beklentisi (xGC)",
    "Expected Goals Non Penalty Goals (npxG)":
      "Penaltı Hariç Gol Beklentisi (npxG)",
    "Expected Goals Set Play (xGSP)": "Duran Toplar Gol Beklentisi (xGSP)",
    "Expected Goals Open Play (xGOP)": "Akan Oyun Gol Beklentisi (xGOP)",
    "Shooting Performance (SP)": "Şut Performansı (SP)",
    "Shot Quality (%)": "Şut Kalitesi (%)",
    "On Target Shot Quality (%)": "İsabetli Şut Kalitesi (%)",
    "Ball Safe": "Güvenli Top",
    Injuries: "Sakatlıklar",
    Substitutions: "Oyuncu Değişiklikleri",
    "Chances Created": "Yaratılan Fırsatlar",
    "Cumulative Minutes Played": "Kümülatif Oynanan Dakika",
};

// Prefer the same user-facing English terminology as ScoutWise Enterprise.
const MATCH_METRIC_LABELS_EN: Record<string, string> = {
  "Saves Insidebox": "Saves Inside Box",
  "Good High Claim": "High Claims",
  "Shots Total": "Shots Attempted",
  "Expected Goals": "xG",
  "Expected Goals On Target": "xG on Target",
  Passes: "Passes Attempted",
  "Long Balls": "Long Balls Attempted",
  "Long Balls Won": "Successful Long Balls",
  "Long Balls Won (%)": "Successful Long Balls (%)",
  "Accurate Passes": "Successful Passes",
  "Accurate Passes (%)": "Successful Passes (%)",
  "Accurate Crosses": "Successful Crosses",
  "Passes In Final Third": "Passes in Final Third",
  "Goalkeeper Goals Conceded": "Goals Conceded",
  "Error Lead To Goal": "Error Leading to Goal",
  "Error Lead To Shot": "Error Leading to Shot",
  Yellowcards: "Yellow Cards",
  "Ball Recovery": "Ball Recoveries",
  Aerials: "Total Aerials",
  "On Target Goal Conversion (%)": "On-Target Goal Conversion (%)",
  "On Target Shot Quality (%)": "On-Target Shot Quality (%)",
};

// Aliases emitted by different SportMonks/report payloads resolve to one label.
const MATCH_METRIC_CANONICAL_ALIASES: Record<string, string> = {
  "Shots Blocked": "Blocked Shots",
  Yellowcards: "Yellow Cards",
  "Goalkeeper Goals Conceded": "Goals Conceded",
  "Long Balls Won Percentage": "Long Balls Won (%)",
  "Aerials Won Percentage": "Aerials Won (%)",
  "Duels Won Percentage": "Duels Won (%)",
  "Successful Crosses Percentage": "Accurate Crosses (%)",
};

const MATCH_REPORT_SECTION_LABELS_TR: Record<string, string> = {
  "Contribution & Impact": "Katkı ve Etki",
  Shooting: "Şut",
  Passing: "Pas",
  "Set Pieces": "Duran Toplar",
  Defending: "Savunma",
  "Errors & Discipline": "Hatalar ve Disiplin",
  "Advanced Metrics": "Gelişmiş Metrikler",
  Goalkeeping: "Kalecilik",
};

function metricLookupKey(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
}

const MATCH_METRIC_ENGLISH_BY_TURKISH = Object.entries(
  MATCH_METRIC_LABELS_TR,
).reduce<Record<string, string>>((result, [english, turkish]) => {
  const key = metricLookupKey(turkish);
  // Keep the first entry for duplicate Turkish aliases; preferred names appear first.
  if (!result[key]) {
    result[key] = MATCH_METRIC_CANONICAL_ALIASES[english] || english;
  }
  return result;
}, {});

const MATCH_REPORT_SECTION_ENGLISH_BY_TURKISH = Object.entries(
  MATCH_REPORT_SECTION_LABELS_TR,
).reduce<Record<string, string>>((result, [english, turkish]) => {
  result[metricLookupKey(turkish)] = english;
  return result;
}, {});

export const matchMetricLabels: Record<string, Record<string, string>> = {
  en: Object.keys(MATCH_METRIC_LABELS_TR).reduce<Record<string, string>>(
    (result, english) => {
      const canonical = MATCH_METRIC_CANONICAL_ALIASES[english] || english;
      result[english] = MATCH_METRIC_LABELS_EN[canonical] || canonical;
      return result;
    },
    {},
  ),
  tr: MATCH_METRIC_LABELS_TR,
};

export function canonicalizeMatchMetricLabel(label: string) {
  const value = String(label || "").trim();
  if (!value) return value;
  const englishFromTurkish = MATCH_METRIC_ENGLISH_BY_TURKISH[metricLookupKey(value)];
  return (
    englishFromTurkish ||
    MATCH_REPORT_SECTION_ENGLISH_BY_TURKISH[metricLookupKey(value)] ||
    MATCH_METRIC_CANONICAL_ALIASES[value] ||
    value
  );
}

export function matchMetricLabel(label: string, locale: "en" | "tr") {
  const canonical = canonicalizeMatchMetricLabel(label);
  if (locale === "tr") {
    return (
      MATCH_METRIC_LABELS_TR[canonical] ||
      MATCH_REPORT_SECTION_LABELS_TR[canonical] ||
      MATCH_METRIC_LABELS_TR[label] ||
      label
    );
  }
  return MATCH_METRIC_LABELS_EN[canonical] || canonical;
}
