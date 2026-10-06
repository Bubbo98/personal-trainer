/** Page numbers to show: first, last and two around the current one, with gaps. */
export function pageItems(page: number, pages: number): (number | 'gap')[] {
  const items: (number | 'gap')[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 2) {
      if (items.length && p - (items[items.length - 1] as number) > 1) items.push('gap');
      items.push(p);
    }
  }
  return items;
}
