export function compactSavedExplanation(text: string) {
  const words = text.trim().split(/\s+/);
  if (words.length < 8) return text;
  const limit = Math.ceil(words.length * .75);
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
  let paragraph = '';
  for (const sentence of sentences) {
    const next = `${paragraph} ${sentence.trim()}`.trim();
    if (next.split(/\s+/).length > limit) break;
    paragraph = next;
  }
  if (paragraph && paragraph.split(/\s+/).length >= limit - 5) return paragraph;
  return words.slice(0, limit).join(' ').replace(/[,;:.!?]+$/, '') + '…';
}
