export function normalizeSearchText(value: string) {
  const folded = value
    .trim()
    .replace(/[ıİ]/g, (char) => (char === "ı" ? "i" : "I"))
    .replace(/[áàâäãåāăą]/gi, "a")
    .replace(/[éèêëēĕėęě]/gi, "e")
    .replace(/[íìîïīĭį]/gi, "i")
    .replace(/[óòôöõøōŏő]/gi, "o")
    .replace(/[úùûüūŭůűų]/gi, "u")
    .replace(/[ñń]/gi, "n")
    .replace(/[ćčç]/gi, "c")
    .replace(/[ğ]/gi, "g")
    .replace(/[ł]/gi, "l")
    .replace(/[ř]/gi, "r")
    .replace(/[śšş]/gi, "s")
    .replace(/[ýÿ]/gi, "y")
    .replace(/[žźż]/gi, "z")
    .replace(/æ/gi, "ae")
    .replace(/œ/gi, "oe")
    .replace(/ß/g, "ss");

  return folded
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function optionMatchesSearch(option: string, normalizedQuery: string) {
  const normalizedOption = normalizeSearchText(option);
  if (normalizedOption.includes(normalizedQuery)) return true;

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (!queryTokens.length) return false;

  let searchFrom = 0;
  return queryTokens.every((token) => {
    const index = normalizedOption.indexOf(token, searchFrom);
    if (index === -1) return false;
    searchFrom = index + token.length;
    return true;
  });
}
