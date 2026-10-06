import type { ReactNode } from 'react';
import { safeExternalUrl } from '../../lib/urls';

const INLINE = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;

/** **bold** and [text](url) inside a string. */
export function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      nodes.push(<strong key={match.index}>{match[1]}</strong>);
    } else {
      const href = match[3].startsWith('mailto:') || match[3].startsWith('tel:') ? match[3] : safeExternalUrl(match[3]);
      nodes.push(
        href ? (
          <a key={match.index} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-blue-600 hover:underline break-words">
            {match[2]}
          </a>
        ) : (
          match[2]
        ),
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
