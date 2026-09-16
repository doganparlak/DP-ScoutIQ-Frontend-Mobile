/** Compact table label only; the full club name remains in filters and player cards. */
export function portfolioTeamShortName(value?: string): string {
  const name = value?.trim();
  if (!name) return '—';
  if (name.length <= 5) return name;
  const words = name.split(/[\s-]+/).filter(word => !/^(fc|cf|afc|sc|ac|fk|sk|club)$/i.test(word.replace(/\./g, '')));
  if (!words.length) return name.slice(0, 3).toUpperCase();
  if (words.length === 1) return words[0].length <= 5 ? words[0] : words[0].slice(0, 3).toUpperCase();
  if (words.length === 2) return (words[0][0] + words[1].slice(0, 2)).toUpperCase();
  return words.slice(0, 4).map(word => word[0]).join('').toUpperCase();
}
