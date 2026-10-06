/**
 * After `vite build`: one HTML file per public page with its own title,
 * description, canonical and Open Graph tags (Italian), so crawlers see the
 * right metadata without running JavaScript. Also writes 404.html (noindex),
 * which Vercel serves with a real 404 status for unknown URLs, and app.html
 * (noindex, no canonical) for the client area and the admin.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const build = join(root, 'build');
const SITE = 'https://www.esercizifacili.com';
const { meta, notFound } = JSON.parse(readFileSync(join(root, 'src/locales/it/common.json'), 'utf8'));

const PAGES = [
  ['/', meta.home],
  ['/about', meta.about],
  ['/services', meta.services],
  ['/contact', meta.contact],
  ['/booking', meta.booking],
  ['/privacy-policy', meta.privacy],
  ['/terms-of-service', meta.terms],
  ['/cookie-policy', meta.cookies],
];

const template = readFileSync(join(build, 'index.html'), 'utf8');
const escape = (text) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function render({ title, description, url, robots = 'index, follow' }) {
  const setMeta = (html, attr, name, value) =>
    html.replace(new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(")`), `$1${escape(value)}$2`);
  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`);
  html = setMeta(html, 'name', 'description', description);
  html = setMeta(html, 'name', 'robots', robots);
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'name', 'twitter:title', title);
  html = setMeta(html, 'name', 'twitter:description', description);
  if (url) {
    html = setMeta(html, 'property', 'og:url', url);
    html = html.replace('</head>', `  <link rel="canonical" href="${url}" />\n  </head>`);
  }
  return html;
}

for (const [path, { title, description }] of PAGES) {
  const file = path === '/' ? join(build, 'index.html') : join(build, path.slice(1), 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, render({ title, description, url: `${SITE}${path}` }));
}
writeFileSync(join(build, 'app.html'), render({ title: meta.home.title, description: meta.home.description, robots: 'noindex, nofollow' }));
writeFileSync(join(build, '404.html'), render({ title: notFound.title, description: notFound.message, robots: 'noindex, nofollow' }));

console.log(`prerendered ${PAGES.length} pages + app.html + 404.html`);
