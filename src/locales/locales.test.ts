const files = import.meta.glob<Record<string, unknown>>('./*/*.json', { eager: true, import: 'default' });

/** Every leaf path of a translation tree ("feedback.status.tooSoon"). */
function leaves(tree: unknown, prefix = ''): [string, unknown][] {
  if (tree === null || typeof tree !== 'object') return [[prefix, tree]];
  return Object.entries(tree).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
}

const namespaces = [...new Set(Object.keys(files).map((path) => path.split('/')[2]))];

describe.each(namespaces)('translations: %s', (file) => {
  const it_ = leaves(files[`./it/${file}`]);
  const en = leaves(files[`./en/${file}`]);

  it('exists in both languages', () => {
    expect(files[`./it/${file}`]).toBeDefined();
    expect(files[`./en/${file}`]).toBeDefined();
  });

  it('has the same keys in Italian and English', () => {
    const itKeys = new Set(it_.map(([k]) => k));
    const enKeys = new Set(en.map(([k]) => k));
    expect([...itKeys].filter((k) => !enKeys.has(k))).toEqual([]);
    expect([...enKeys].filter((k) => !itKeys.has(k))).toEqual([]);
  });

  it('has no empty texts', () => {
    expect([...it_, ...en].filter(([, v]) => v === '').map(([k]) => k)).toEqual([]);
  });

  it('uses the same {{placeholders}} in both languages', () => {
    const vars = (v: unknown) => [...String(v).matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort().join(',');
    const enByKey = new Map(en);
    const mismatched = it_.filter(([k, v]) => enByKey.has(k) && vars(v) !== vars(enByKey.get(k))).map(([k]) => k);
    expect(mismatched).toEqual([]);
  });
});
