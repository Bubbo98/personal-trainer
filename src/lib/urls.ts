/**
 * An http(s) URL safe to put in href/src, or null. Guards links typed in the
 * admin (products…) against javascript: and other schemes.
 */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}
