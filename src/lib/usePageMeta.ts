import { useEffect } from 'react';

export const SITE_URL = 'https://www.esercizifacili.com';

interface PageMeta {
  title: string;
  description?: string;
  /** Canonical path ("/about"); omitted for private pages. */
  path?: string;
  /** Private pages (dashboard, admin, 404) stay out of search results. */
  noindex?: boolean;
}

/** Finds (or creates) a <meta>/<link> in <head> by selector. */
function headElement<K extends 'meta' | 'link'>(tag: K, selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLElementTagNameMap[K]>(selector);
  if (!el) {
    el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
    document.head.appendChild(el);
  }
  return el;
}

/**
 * Keeps <title>, description, canonical and robots in sync with the current page.
 * index.html holds the defaults that crawlers without JavaScript see.
 */
export function usePageMeta({ title, description, path, noindex }: PageMeta) {
  useEffect(() => {
    document.title = title;
    headElement('meta', 'meta[property="og:title"]', { property: 'og:title' }).content = title;
    headElement('meta', 'meta[name="twitter:title"]', { name: 'twitter:title' }).content = title;

    if (description) {
      headElement('meta', 'meta[name="description"]', { name: 'description' }).content = description;
      headElement('meta', 'meta[property="og:description"]', { property: 'og:description' }).content = description;
    }

    const canonical = path ? `${SITE_URL}${path}` : null;
    const canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) {
      headElement('link', 'link[rel="canonical"]', { rel: 'canonical' }).href = canonical;
      headElement('meta', 'meta[property="og:url"]', { property: 'og:url' }).content = canonical;
    } else {
      canonicalLink?.remove();
    }

    headElement('meta', 'meta[name="robots"]', { name: 'robots' }).content = noindex ? 'noindex, nofollow' : 'index, follow';
  }, [title, description, path, noindex]);
}
