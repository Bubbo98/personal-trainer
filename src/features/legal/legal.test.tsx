import { render, screen } from '@testing-library/react';
import i18n from '../../i18n';
import { renderWithProviders } from '../../test/render';
import LegalPage from './LegalPage';
import { renderInline } from './inline';
import type { Block, LegalDoc } from './types';
import privacyIt from './content/privacy.it';
import privacyEn from './content/privacy.en';
import termsIt from './content/terms.it';
import termsEn from './content/terms.en';
import cookiesIt from './content/cookies.it';
import cookiesEn from './content/cookies.en';

const docs: [string, LegalDoc, LegalDoc][] = [
  ['privacy', privacyIt, privacyEn],
  ['terms', termsIt, termsEn],
  ['cookies', cookiesIt, cookiesEn],
];

/** The shape of a document: block kinds and list lengths, ignoring the text. */
const shape = (blocks: Block[]): unknown =>
  blocks.map((b) =>
    'list' in b
      ? ['list', b.list.length]
      : 'table' in b
        ? ['table', b.table.rows.length]
        : 'box' in b
          ? ['box', shape(b.box)]
          : 'grid' in b
            ? ['grid', b.grid.map((g) => shape(g.blocks))]
            : Object.keys(b)[0],
  );

describe.each(docs)('%s document', (_, italian, en) => {
  it('has the same structure in Italian and English', () => {
    expect(en.sections).toHaveLength(italian.sections.length);
    expect(en.sections.map((s) => shape(s.blocks))).toEqual(italian.sections.map((s) => shape(s.blocks)));
    expect(en.updated).toBe(italian.updated);
  });

  it('marks only the English version as a translation', () => {
    expect(italian.notice).toBeUndefined();
    expect(en.notice).toMatch(/Italian version prevails/);
  });
});

describe('renderInline', () => {
  it('renders bold text and safe links only', () => {
    render(<p data-testid="p">{renderInline('Ciao **Mario**, vedi [sito](https://example.com) e [male](javascript:alert(1)) o [mail](mailto:a@b.it)')}</p>);
    const p = screen.getByTestId('p');
    expect(p.querySelector('strong')).toHaveTextContent('Mario');
    expect(screen.getByRole('link', { name: 'sito' })).toHaveAttribute('href', 'https://example.com/');
    expect(screen.getByRole('link', { name: 'sito' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'mail' })).toHaveAttribute('href', 'mailto:a@b.it');
    expect(screen.queryByRole('link', { name: 'male' })).not.toBeInTheDocument();
    expect(p).toHaveTextContent('male');
  });
});

describe('LegalPage', () => {
  afterEach(() => i18n.changeLanguage('it'));

  it('shows the document in the active language with a fixed update date', async () => {
    renderWithProviders(<LegalPage docs={{ it: privacyIt, en: privacyEn }} path="/privacy-policy" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText('Ultimo aggiornamento: 20 luglio 2026')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1. Titolare del Trattamento' })).toBeInTheDocument();
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.esercizifacili.com/privacy-policy');

    await i18n.changeLanguage('en');
    expect(await screen.findByRole('heading', { name: '1. Data Controller' })).toBeInTheDocument();
    expect(screen.getByText(/Italian version prevails/)).toBeInTheDocument();
  });
});
