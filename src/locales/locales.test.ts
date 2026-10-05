import itTranslation from './it/translation.json';
import enTranslation from './en/translation.json';

/** Every leaf path of a translation tree ("dashboard.feedback.title"). */
function keys(tree: unknown, prefix = ''): string[] {
  if (tree === null || typeof tree !== 'object') return [prefix];
  return Object.entries(tree).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe('translations', () => {
  it('Italian and English have the same keys', () => {
    const itKeys = new Set(keys(itTranslation));
    const enKeys = new Set(keys(enTranslation));
    expect([...itKeys].filter((k) => !enKeys.has(k))).toEqual([]);
    expect([...enKeys].filter((k) => !itKeys.has(k))).toEqual([]);
  });

  it('has no empty strings', () => {
    for (const [lng, tree] of Object.entries({ it: itTranslation, en: enTranslation })) {
      const empty = keys(tree).filter((k) => k.split('.').reduce<any>((o, p) => o[p], tree) === ''); // eslint-disable-line @typescript-eslint/no-explicit-any
      expect(empty, lng).toEqual([]);
    }
  });
});
