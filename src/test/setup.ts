import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import i18n from '../i18n';

// Tests read Italian texts, whatever the machine's language
beforeAll(async () => {
  await i18n.changeLanguage('it');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  localStorage.clear();
});
