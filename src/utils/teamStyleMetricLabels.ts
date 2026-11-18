export function attackingStyleMetricLabel(name: string, tr: boolean): string | undefined {
  const roles: Record<string, string> = { Defenders: "Savunma Hattı", Midfielders: "Orta Saha", Attackers: "Hücum Hattı" };
  const tasks: Record<string, string> = { Passes: "Pas", "Key Passes": "Kilit Pas", "Successful Dribbles": "Başarılı Dripling", "Shots Total": "Şut", "Total Crosses": "Orta" };
  const role = name.match(/^(Defenders|Midfielders|Attackers) (.+) Share \(\%\)$/);
  if (role) return tr ? (tasks[role[2]] ? `${roles[role[1]]} · ${tasks[role[2]]} Payı` : undefined) : name;
  const custom: Record<string, [string, string]> = {
    "Long Ball Share (%)": ["Uzun Pas Payı", "Long-ball Share"],
    "Cross Share (%)": ["Paslarda Orta Payı", "Cross Share of Passes"],
    "Final-third Pass Share (%)": ["Son Bölge Pas Payı", "Final-third Pass Share"],
    "Outfield Final-third Pass Share (%)": ["Saha Oyuncuları · Son Bölge Pas Payı", "Outfield Final-third Pass Share"],
    "Key Passes Per 100 Passes": ["100 Pasta Kilit Pas", "Key Passes per 100 Passes"],
    "Through Balls Per 100 Passes": ["100 Pasta Ara Pas", "Through Balls per 100 Passes"],
    "Shots Per 100 Passes": ["100 Pasta Şut", "Shots per 100 Passes"],
    "Creator Concentration (%)": ["Yaratıcı Katkı Yoğunluğu", "Creator Contribution Concentration"],
    "Inside-box Shot Share (%)": ["Ceza Sahası İçi Şut Payı", "Inside-box Shot Share"],
    "Recoveries Per 100 Opponent Passes": ["Rakibin 100 Pasında Top Kazanımı", "Recoveries per 100 Opponent Passes"],
    "Outfield Recoveries Per 100 Opponent Passes": ["Saha Oyuncuları · Rakibin 100 Pasında Top Kazanımı", "Outfield Recoveries per 100 Opponent Passes"],
  };
  return custom[name]?.[tr ? 0 : 1];
}

export function defensiveStyleMetricLabel(name: string, tr: boolean): string | undefined {
  if (!tr) return undefined;
  const tasks: Record<string, string> = { "Tackles": "Müdahale", "Interceptions": "Pas Arası", "Ball Recovery": "Top Kazanımı", "Clearances": "Uzaklaştırma", "Blocked Shots": "Engellenen Şut", "Total Duels": "İkili Mücadele", "Duels Won": "Kazanılan İkili Mücadele", "Fouls": "Faul" };
  const role = name.match(/^(Defenders|Midfielders|Attackers) (.+) Share \(%\)$/);
  if (role && tasks[role[2]]) {
    const roles: Record<string,string> = {Defenders:"Savunma Hattı",Midfielders:"Orta Saha",Attackers:"Hücum Hattı"};
    return `${roles[role[1]]} · ${tasks[role[2]]} Payı`;
  }
  const per100 = name.match(/^(Outfield )?(Tackles|Interceptions|Recoveries|Duels|Fouls) Per 100 Opponent Passes$/);
  if (per100) {
    const labels:Record<string,string>={Tackles:"Müdahale",Interceptions:"Pas Arası",Recoveries:"Top Kazanımı",Duels:"İkili Mücadele",Fouls:"Faul"};
    return `${per100[1]?"Saha Oyuncuları · ":""}Rakibin 100 Pasında ${labels[per100[2]]}`;
  }
  const custom:Record<string,string>={
    "Defensive Role Balance (%)":"Savunma Katkısının Hatlara Dağılımı",
    "Recovery To Loss Ratio":"Top Kazanımı / Top Kaybı",
    "Outfield Recovery To Loss Ratio":"Saha Oyuncuları · Top Kazanımı / Top Kaybı",
    "Outfield Duels Won (%)":"Saha Oyuncuları · İkili Mücadele Başarı Oranı",
    "Outfield Clearances":"Saha Oyuncuları · Uzaklaştırma",
    "Opponent Final-third Pass Share (%)":"Rakip Son Bölge Pas Payı",
    "Opponent Long Ball Share (%)":"Rakip Uzun Pas Payı",
    "Opponent Inside-box Shot Share (%)":"Rakip Ceza Sahası İçi Şut Payı",
  };
  return custom[name];
}

export function teamFindingMetricLabel(name: string, tr: boolean): string | undefined {
  if (!tr) return undefined;
  const names: Record<string,string> = {
    "Total Cards":"Toplam Kart",
    "Lead Win Rate (%)":"Öne Geçilen Maçlarda Galibiyet Oranı",
    "Lead Dropped Points Rate (%)":"Öne Geçilen Maçlarda Puan Kaybı Oranı",
    "Trailing Equalizer Rate (%)":"Geride Kalınan Maçlarda Eşitliği Sağlama Oranı",
    "Trailing No Equalizer Rate (%)":"Geride Kalınan Maçlarda Eşitliği Sağlayamama Oranı",
    "Shot Quality (%)":"Şut Başına Gol Beklentisi",
    "Inside-box Shot Share (%)":"Ceza Sahası İçi Şut Payı",
    "Goal Conversion (%)":"Şutları Gole Çevirme Oranı",
    "On Target Goal Conversion (%)":"İsabetli Şutları Gole Çevirme Oranı",
    "Final-third Pass Share (%)":"Son Bölge Pas Payı",
    "Passes In Final Third":"Son Bölge Pasları",
    "Passes":"Pas",
    "Duels Won":"Kazanılan İkili Mücadele",
    "Duels Won (%)":"İkili Mücadele Başarı Oranı",
    "Recoveries Per 100 Opponent Passes":"Rakibin 100 Pasında Top Kazanımı",
    "Interceptions Per 100 Opponent Passes":"Rakibin 100 Pasında Pas Arası",
    "Fouls Per 100 Opponent Passes":"Rakibin 100 Pasında Faul",
    "Dribble Accuracy (%)":"Dripling Başarı Oranı",
    "Successful Dribbles":"Başarılı Dripling",
  };
  if (name.startsWith("Opponent ")) {
    const label=teamFindingMetricLabel(name.slice(9),tr);
    return label ? `Rakip ${label}` : undefined;
  }
  if (name.startsWith("Outfield ")) {
    const label=teamFindingMetricLabel(name.slice(9),tr);
    return label ? `Saha Oyuncuları · ${label}` : undefined;
  }
  return names[name];
}
