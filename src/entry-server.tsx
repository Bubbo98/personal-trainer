/**
 * Build-time render of the public pages (scripts/prerender-pages.mjs): their
 * full HTML goes into the page files, so search engines and link previews see
 * the text without running JavaScript. Always Italian, like the page metadata.
 */
import { StrictMode, type ReactNode } from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import { StaticRouter } from 'react-router-dom';
import i18n from './i18n';
import { AppShell } from './App';

export async function render(url: string): Promise<string> {
  await i18n.changeLanguage('it');
  const Router = ({ children }: { children: ReactNode }) => <StaticRouter location={url}>{children}</StaticRouter>;
  const { prelude } = await prerenderToNodeStream(
    <StrictMode>
      <AppShell router={Router} />
    </StrictMode>,
  );
  let html = '';
  for await (const chunk of prelude) html += chunk;
  return html;
}
