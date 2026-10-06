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

  it('loads a single hero image and sets the page meta', () => {
    mockApi({ 'GET /reviews/featured': { reviews: [] } });
    renderWithProviders(<Home />);
    expect(document.querySelectorAll('main img')).toHaveLength(1);
    expect(document.querySelectorAll('main picture source')).toHaveLength(3);
    expect(document.title).toBe('Personal Trainer Joshua - Allenamenti Personalizzati Milano');
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
    expect(screen.getByRole('link', { name: 'Prenota la tua consulenza' })).toHaveAttribute('href', '/booking#booking-calendar');
  });

  it('hides the reviews section when there are none', async () => {
    const { calls } = mockApi({ 'GET /reviews/featured': { reviews: [] } });
    renderWithProviders(<Home />);
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    expect(screen.queryByRole('heading', { name: 'Cosa dicono i miei clienti' })).not.toBeInTheDocument();
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
  it('lists the contacts with working links', () => {
    renderWithProviders(<Contact />);
    const address = document.querySelector('address')!;
    expect(within(address as HTMLElement).getByRole('link', { name: /328 206 2823/ })).toHaveAttribute('href', 'tel:+393282062823');
    expect(within(address as HTMLElement).getByRole('link', { name: /@mauriziojoshuapt/ })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByTitle('Mappa di Allenamento Funzionale Milano')).toHaveAttribute('src', expect.stringContaining('output=embed'));
  });
});

describe('Services', () => {
  it('opens a service and its booking calendar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Services />);
    const button = screen.getByRole('button', { name: 'Allenamento 1 to 1' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('cal')).toBeInTheDocument();
    expect(screen.getAllByText(/Allenamenti personalizzati 1 to 1/).length).toBeGreaterThan(0);
  });
});
