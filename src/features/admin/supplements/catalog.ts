import { safeExternalUrl } from '../../../lib/urls';
import type { CatalogCategory } from '../types';

/** Every category and product named, every product with an http(s) link (image optional). */
export function catalogIsValid(categories: CatalogCategory[]): boolean {
  return categories.every(
    (c) =>
      c.name.trim() &&
      c.products.every((p) => p.name.trim() && safeExternalUrl(p.productUrl) && (!p.imageUrl.trim() || safeExternalUrl(p.imageUrl))),
  );
}
