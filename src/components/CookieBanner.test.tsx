import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/render';
import { getConsent, openCookieSettings, resetConsentCache } from '../lib/consent';
import CookieBanner from './CookieBanner';

beforeEach(resetConsentCache);

describe('CookieBanner', () => {
  it('asks on public pages and rejecting is one click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CookieBanner />, { route: '/services' });

    expect(screen.getByRole('dialog', { name: 'Usiamo i cookie' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Rifiuta' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getConsent()).toMatchObject({ analytics: false, marketing: false });
    expect(JSON.parse(localStorage.getItem('cookie-consent')!)).toMatchObject({ analytics: false, marketing: false, version: 1 });
  });

  it('closing with the X rejects; "Accetta tutti" accepts both', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CookieBanner />);
    await user.click(screen.getByRole('button', { name: 'Chiudi rifiutando i cookie facoltativi' }));
    expect(getConsent()).toMatchObject({ analytics: false, marketing: false });

    act(openCookieSettings);
    await user.click(screen.getByRole('button', { name: 'Accetta tutti' }));
    expect(getConsent()).toMatchObject({ analytics: true, marketing: true });
  });

  it('lets the visitor choose each category, starting from off', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CookieBanner />);
    await user.click(screen.getByRole('button', { name: 'Personalizza' }));

    expect(screen.getByRole('switch', { name: 'Tecnici' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Tecnici' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Marketing' })).not.toBeChecked();
    await user.click(screen.getByRole('switch', { name: 'Statistiche' }));
    await user.click(screen.getByRole('button', { name: 'Salva le scelte' }));

    expect(getConsent()).toMatchObject({ analytics: true, marketing: false });
  });

  it('stays hidden once chosen and in the client area, reopens from the footer', () => {
    const { unmount } = renderWithProviders(<CookieBanner />, { route: '/dashboard' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    unmount();

    localStorage.setItem('cookie-consent', JSON.stringify({ analytics: true, marketing: false, date: '2026-10-12', version: 1 }));
    resetConsentCache();
    renderWithProviders(<CookieBanner />, { route: '/' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(openCookieSettings);
    expect(screen.getByRole('switch', { name: 'Statistiche' })).toBeChecked();
  });
});
