/**
 * Video titles often list several numbers ("(1°) - 30/34 ; (2°) - 38/41").
 * When searching a bare number, rank a title by the smallest of its numbers
 * that contains the searched digits, so "5" orders 5, 15, 25… ahead of
 * unrelated numbers. Numbers followed by "°" (angles like 45°, set markers
 * like (2°)) are ignored. Infinity when nothing matches.
 */
export function numberMatchScore(title: string, digits: string): number {
  const numbers = title.match(/\d+(?![\d°])/g) ?? [];
  const matching = numbers.filter((n) => n.includes(digits)).map(Number);
  return matching.length ? Math.min(...matching) : Infinity;
}
