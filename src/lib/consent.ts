import { useSyncExternalStore } from 'react';

/**
 * The visitor's cookie choices (GDPR / Garante): technical cookies need no consent,
 * statistics and advertising do. Stored in this browser only; a new VERSION asks again.
 */
export interface Consent {
  analytics: boolean;
  marketing: boolean;
  /** When the choice was made (ISO), kept as proof of consent. */
  date: string;
  version: number;
}

const KEY = 'cookie-consent';
const VERSION = 1;
const OPEN_EVENT = 'cookie-settings-open';

let current: Consent | null | undefined;
const listeners = new Set<() => void>();

function read(): Consent | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null') as Consent | null;
    return saved && saved.version === VERSION ? saved : null;
  } catch {
    return null;
  }
}

/** The stored choice, or null while the visitor hasn't chosen (or on the server). */
export function getConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  if (current === undefined) current = read();
  return current;
}

export function saveConsent(choice: { analytics: boolean; marketing: boolean }): void {
  current = { ...choice, date: new Date().toISOString(), version: VERSION };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* private mode: the choice lasts for this page view */
  }
  listeners.forEach((listener) => listener());
}

export function onConsentChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The current choice, re-rendering when it changes (null on the server and before the choice). */
export const useConsent = () => useSyncExternalStore(onConsentChange, getConsent, () => null);

/** Reopens the banner (footer "Preferenze cookie"). */
export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_EVENT));

export function onCookieSettingsOpen(listener: () => void): () => void {
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
}

/** For tests: forget the cached choice. */
export function resetConsentCache(): void {
  current = undefined;
}
