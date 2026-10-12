import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '../i18n';
import { mockApi, renderWithProviders } from '../test/render';
import Home from './Home';
import Contact from './Contact';
import Services from './Services';

vi.mock('@calcom/embed-react', () => ({ default: () => <div data-testid="cal" /> }));

const review = (id: number) => ({ id, rating: 5, title: `Titolo ${id}`, comment: `Bellissimo ${id}`, createdAt: '2026-09-01 10:00:00', author: { displayName: `Cliente ${id}` } });

describe('Home', () => {
  afterEach(() => i18n.changeLanguage('it'));

  it('loads a single hero image up front and sets the page meta', () => {
    mockApi({ 'GET /reviews/featured': { reviews: [] } });
    renderWithProviders(<Home />);
    // The hero is the only image not lazy-loaded
    expect(document.querySelectorAll('main img:not([loading="lazy"])')).toHaveLength(1);
    expect(document.querySelectorAll('main picture source')).toHaveLength(3);
    expect(document.title).toBe('Personal Trainer Joshua - Allenamenti Personalizzati Milano');
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
    for (const link of screen.getAllByRole('link', { name: 'Prenota la consulenza gratuita' })) {
      expect(link).toHaveAttribute('href', '/booking#booking-calendar');
    }
    expect(screen.getByText('Personal trainer a Milano · Prima consulenza gratuita di 15 minuti')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Come funziona' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Servizio Calisthenics & Funzionale/ })).toHaveAttribute('href', '/services#calisthenics');
  });

  it('shows the Google rating; hides the site reviews section when there are none', async () => {
    const { calls } = mockApi({ 'GET /reviews/featured': { reviews: [] } });
    renderWithProviders(<Home />);
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    expect(screen.getAllByRole('heading', { name: 'Cosa dicono i miei clienti' })).toHaveLength(1);
    expect(screen.getByRole('img', { name: '5,0 su 5, 5 recensioni su Google' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Leggi le recensioni su Google/ })).toHaveAttribute('href', 'https://maps.google.com/?cid=11057326487453307505');
    expect(document.getElementById('reviews-title')).toBeNull();
  });

  it('shows featured reviews with paging', async () => {
    mockApi({ 'GET /reviews/featured': { reviews: [review(1), review(2), review(3), review(4)] } });
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    const user = userEvent.setup();
    renderWithProviders(<Home />);
    expect(await screen.findByText('Cliente 1')).toBeInTheDocument();
    expect(screen.queryByText('Cliente 4')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Recensioni successive' }));
    expect(screen.getByText('Cliente 4')).toBeInTheDocument();
  });

  it('switches language from the header', async () => {
    mockApi({ 'GET /reviews/featured': { reviews: [] } });
    const user = userEvent.setup();
    renderWithProviders(<Home />);
    await user.click(screen.getByRole('button', { name: "Passa all’inglese" }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ready for a change?');
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('Personal Trainer Joshua - Personal Training in Milan');
  });
});

describe('Contact', () => {
  it('lists the contacts with working links', async () => {
    renderWithProviders(<Contact />);
    const address = document.querySelector('address')!;
    expect(within(address as HTMLElement).getByRole('link', { name: /328 206 2823/ })).toHaveAttribute('href', 'tel:+393282062823');
    expect(within(address as HTMLElement).getByRole('link', { name: /@mauriziojoshuapt/ })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(address as HTMLElement).getByRole('link', { name: /@joshua\.maurizio/ })).toHaveAttribute('href', 'https://www.tiktok.com/@joshua.maurizio');
    // Google Maps (and its cookies) only on request
    expect(screen.queryByTitle('Mappa di Allenamento Funzionale Milano')).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Mostra la mappa' }));
    expect(screen.getByTitle('Mappa di Allenamento Funzionale Milano')).toHaveAttribute('src', expect.stringContaining('output=embed'));
  });
});

describe('Services', () => {
  it('shows every service with its description; every button books the free consultation', () => {
    renderWithProviders(<Services />);
    expect(within(screen.getByRole('main')).getAllByRole('heading', { level: 2 })).toHaveLength(5);
    expect(screen.getByText(/Allenamenti personalizzati 1 to 1/)).toBeInTheDocument();
    expect(screen.getByText(/Coaching online su misura/)).toBeInTheDocument();
    expect(screen.queryByTestId('cal')).not.toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'Prenota la consulenza gratuita' });
    expect(links).toHaveLength(5);
    for (const link of links) expect(link).toHaveAttribute('href', '/booking#booking-calendar');
  });
});
