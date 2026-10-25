import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { ADMIN_TOKEN_KEY } from '../../../lib/api';
import { mockApi, renderWithProviders } from '../../../test/render';
import AdminPage from '../AdminPage';
import type { Trial, TrialTemplate } from './types';

const template: TrialTemplate = {
  id: 3, name: 'Palestra base', discipline: 'gym', description: null, userId: 900, online: true, minScore: 0, maxScore: 6,
  exerciseCount: 6, videoCount: 6, dayCount: 3, createdAt: '', updatedAt: '',
};

const trial = (over: Partial<Trial>): Trial => ({
  id: 1, kind: 'free_session', templateId: 3, templateName: 'Palestra base', userId: 901, firstName: 'Mario', lastName: 'Rossi',
  email: null, phone: '333 1234567', discipline: 'gym', score: null, answers: [], marketingConsent: false, status: 'to_contact',
  notes: null, createdAt: '2026-10-20 10:00:00', disclaimerAcceptedAt: null, openedAt: '2026-10-20 11:00:00', expiresAt: '2026-10-27 11:00:00', lastLogin: null,
  logCount: 4, state: 'ended', daysLeft: 0, ...over,
});

const renderAdmin = (route: string) => {
  localStorage.setItem(ADMIN_TOKEN_KEY, 'admin-token');
  return renderWithProviders(
    <Routes>
      <Route path="/admin/*" element={<AdminPage />} />
    </Routes>,
    { route },
  );
};

const base = {
  'GET /admin/trainers': { trainers: [{ id: 1, name: 'Joshua', createdAt: '' }] },
  'GET /admin/trial-templates': { templates: [template] },
};

describe('Admin — trials', () => {
  it('lists the ended trials to call first, with WhatsApp and phone links', async () => {
    mockApi({
      ...base,
      'GET /admin/trials': {
        trials: [
          trial({ id: 1, firstName: 'Anna', state: 'active', daysLeft: 3 }),
          trial({ id: 2, firstName: 'Mario' }),
          trial({ id: 3, firstName: 'Luca', status: 'client' }),
        ],
      },
    });
    renderAdmin('/admin/trials');

    const items = await screen.findAllByRole('listitem');
    // "Da chiamare" is the default filter: only Mario
    expect(items).toHaveLength(1);
    expect(within(items[0]).getByRole('link', { name: 'Mario Rossi' })).toHaveAttribute('href', '/admin/trials/2');
    expect(within(items[0]).getByText('Prova terminata')).toBeInTheDocument();
    expect(within(items[0]).getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/393331234567');
    expect(within(items[0]).getByText(/4 esercizi registrati/)).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: /Tutte/ }));
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('3 giorni rimasti')).toBeInTheDocument();
  });

  it('creates a free session and shows the link to send', async () => {
    const { calls } = mockApi({
      ...base,
      'GET /admin/trials': { trials: [] },
      'POST /admin/trials': { trial: trial({ id: 7, state: 'not_opened', firstName: 'Sara', lastName: null }), loginUrl: 'https://www.esercizifacili.com/dashboard/abc' },
    });
    const u = userEvent.setup();
    renderAdmin('/admin/trials');

    await u.click(await screen.findByRole('button', { name: 'Nuova free session' }));
    const dialog = await screen.findByRole('dialog');
    await u.type(within(dialog).getByLabelText('Nome'), 'Sara');
    await u.type(within(dialog).getByLabelText(/Telefono/), '333 1234567');
    await u.click(within(dialog).getByRole('button', { name: 'Crea link' }));

    expect(await screen.findByDisplayValue('https://www.esercizifacili.com/dashboard/abc')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST' && c.path === '/admin/trials')?.body).toMatchObject({ templateId: 3, firstName: 'Sara', phone: '333 1234567' });
    const whatsapp = screen.getByRole('link', { name: 'Invia su WhatsApp' });
    expect(whatsapp.getAttribute('href')).toContain('https://wa.me/393331234567?text=');
    expect(decodeURIComponent(whatsapp.getAttribute('href')!)).toContain('https://www.esercizifacili.com/dashboard/abc');
    expect(screen.getByRole('link', { name: /Personalizza la scheda/ })).toHaveAttribute('href', '/admin/trials/7');
  });

  it('warns when a discipline has no online template', async () => {
    mockApi({
      ...base,
      'GET /admin/trial-questionnaire': {
        questionnaire: { dayOptions: [3, 4], questions: [{ id: 'a', text: 'A', discipline: null, options: [{ id: 'x', text: 'X', points: 0 }, { id: 'y', text: 'Y', points: 9 }] }] },
        isDefault: true,
        updatedAt: null,
      },
    });
    renderAdmin('/admin/trials/templates');
    expect(await screen.findByText(/Calisthenics: nessuna scheda è disponibile online/)).toBeInTheDocument();
    expect(screen.getByText(/Palestra: i punteggi 7, 8, 9 non rientrano/)).toBeInTheDocument();
    expect(screen.getByText(/Palestra: nessuna scheda online ha 4 giorni/)).toBeInTheDocument();
    expect(screen.getByText(/3 giorni · 6 esercizi/)).toBeInTheDocument();
  });

  it('the questionnaire editor sets the training days offered', async () => {
    const { calls } = mockApi({
      ...base,
      'GET /admin/trial-questionnaire': {
        questionnaire: { dayOptions: [3, 4], questions: [{ id: 'a', text: 'A', discipline: null, options: [{ id: 'x', text: 'X', points: 0 }, { id: 'y', text: 'Y', points: 1 }] }] },
        isDefault: false,
        updatedAt: '2026-10-20 10:00:00',
      },
      'PUT /admin/trial-questionnaire': null,
    });
    renderAdmin('/admin/trials/questionnaire');
    const user = userEvent.setup();
    await user.click(await screen.findByLabelText('5 giorni'));
    await user.click(screen.getByLabelText('3 giorni'));
    await user.click(screen.getByLabelText('4 giorni'));
    expect(screen.getByText('Scegli almeno 2 risposte.')).toBeInTheDocument();
    await user.click(screen.getByLabelText('2 giorni'));
    await user.click(screen.getByRole('button', { name: 'Salva modifiche' }));
    expect(calls.find((c) => c.method === 'PUT')?.body).toMatchObject({ dayOptions: [2, 5] });
  });
});
