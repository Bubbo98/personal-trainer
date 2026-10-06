import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { ADMIN_TOKEN_KEY } from '../../lib/api';
import { errorResponse, mockApi, renderWithProviders } from '../../test/render';
import AdminPage from './AdminPage';
import type { AdminUser, Checkin } from './types';

const trainers = { trainers: [{ id: 1, name: 'Joshua', createdAt: '' }, { id: 2, name: 'Denise', createdAt: '' }] };

const user = (over: Partial<AdminUser>): AdminUser => ({
  id: 1,
  username: 'mrossi',
  email: 'mario@example.com',
  firstName: 'Mario',
  lastName: 'Rossi',
  isActive: true,
  isPaying: true,
  checkinExempt: false,
  trainerId: 1,
  createdAt: '2026-01-01 10:00:00',
  lastLogin: null,
  videoCount: 3,
  pdf: { originalName: 'scheda.pdf', expirationDate: '2099-01-01 00:00:00', durationMonths: 2, durationDays: 0 },
  ...over,
});

const renderAdmin = (route = '/admin/users') =>
  renderWithProviders(
    <Routes>
      <Route path="/admin/*" element={<AdminPage />} />
    </Routes>,
    { route },
  );

describe('AdminPage — session', () => {
  it('signs in and opens the users list', async () => {
    const { calls } = mockApi({
      'POST /auth/login': { token: 'admin-token', user: {} },
      'GET /admin/trainers': trainers,
      'GET /admin/users': { users: [user({})] },
      'GET /feedback/admin/unread-count': { unreadCount: 2 },
    });
    const u = userEvent.setup();
    renderAdmin();

    await u.type(screen.getByLabelText('Username'), 'joshua');
    await u.type(screen.getByLabelText('Password'), 'secret');
    await u.click(screen.getByRole('button', { name: 'Accedi' }));

    expect(await screen.findByRole('heading', { name: 'Gestione utenti' })).toBeInTheDocument();
    expect(localStorage.getItem(ADMIN_TOKEN_KEY)).toBe('admin-token');
    expect(calls[0].body).toEqual({ username: 'joshua', password: 'secret' });
    expect(screen.getAllByText('Mario Rossi').length).toBeGreaterThan(0);
    expect(screen.getByText('2 check da leggere')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: "Sezioni dell'amministrazione" });
    expect(within(nav).getByRole('link', { name: 'Utenti' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Video' })).toHaveAttribute('href', '/admin/videos');
  });

  it('shows wrong credentials', async () => {
    mockApi({ 'POST /auth/login': () => errorResponse(401, 'Invalid credentials') });
    const u = userEvent.setup();
    renderAdmin();
    await u.type(screen.getByLabelText('Username'), 'x');
    await u.type(screen.getByLabelText('Password'), 'y');
    await u.click(screen.getByRole('button', { name: 'Accedi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenziali non valide.');
  });

  it('refuses a client account', async () => {
    mockApi({
      'POST /auth/login': { token: 'client-token' },
      'GET /admin/trainers': () => errorResponse(403, 'Admin access required'),
    });
    const u = userEvent.setup();
    renderAdmin();
    await u.type(screen.getByLabelText('Username'), 'client');
    await u.type(screen.getByLabelText('Password'), 'pw');
    await u.click(screen.getByRole('button', { name: 'Accedi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("non ha accesso all'amministrazione");
    expect(localStorage.getItem(ADMIN_TOKEN_KEY)).toBeNull();
  });

  it('drops an expired stored session', async () => {
    localStorage.setItem(ADMIN_TOKEN_KEY, 'old');
    mockApi({ 'GET /admin/trainers': () => errorResponse(401, 'Invalid token') });
    renderAdmin();
    expect(await screen.findByRole('alert')).toHaveTextContent('Sessione scaduta');
    expect(localStorage.getItem(ADMIN_TOKEN_KEY)).toBeNull();
  });
});

describe('AdminPage — users', () => {
  beforeEach(() => localStorage.setItem(ADMIN_TOKEN_KEY, 'admin-token'));

  const routes = (users: AdminUser[]) => ({
    'GET /admin/trainers': trainers,
    'GET /admin/users': { users },
    'GET /feedback/admin/unread-count': { unreadCount: 0 },
  });

  it('filters by trainer, list and search', async () => {
    mockApi(
      routes([
        user({ id: 1 }),
        user({ id: 2, firstName: 'Anna', lastName: 'Bianchi', isPaying: false }),
        user({ id: 3, firstName: 'Luca', lastName: 'Verdi', trainerId: 2 }),
      ]),
    );
    const u = userEvent.setup();
    renderAdmin();

    await screen.findByRole('heading', { name: 'Gestione utenti' });
    const table = screen.getByRole('table');
    expect(within(table).getByText('Mario Rossi')).toBeInTheDocument();
    expect(within(table).queryByText('Anna Bianchi')).not.toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Non paganti (1)' }));
    expect(within(table).getByText('Anna Bianchi')).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'PT Denise (1)' }));
    await u.click(screen.getByRole('button', { name: 'Paganti (1)' }));
    expect(within(table).getByText('Luca Verdi')).toBeInTheDocument();

    await u.type(screen.getByRole('searchbox', { name: 'Cerca utenti' }), 'zzz');
    expect(within(table).getByText('Nessun utente trovato per "zzz"')).toBeInTheDocument();
  });

  it('creates a user and copies the access link', async () => {
    const { calls } = mockApi({ ...routes([]), 'POST /admin/users': { user: {}, loginUrl: 'https://site/dashboard/abc' } });
    const u = userEvent.setup();
    // After setup: user-event installs its own clipboard
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderAdmin();

    await u.click(await screen.findByRole('button', { name: 'Nuovo utente' }));
    const dialog = screen.getByRole('dialog', { name: 'Nuovo utente' });
    await u.type(within(dialog).getByLabelText('Nome'), ' Giulia ');
    await u.type(within(dialog).getByLabelText('Cognome'), 'Neri');
    await u.type(within(dialog).getByLabelText(/^Username/), 'gneri');
    await u.click(within(dialog).getByRole('button', { name: 'Crea utente' }));

    expect(await screen.findByText(/Link di accesso copiato/)).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('https://site/dashboard/abc');
    expect(calls.find((c) => c.method === 'POST' && c.path === '/admin/users')?.body).toEqual({
      firstName: 'Giulia',
      lastName: 'Neri',
      email: '',
      isPaying: true,
      trainerId: 1,
      username: 'gneri',
    });
  });

  it('asks before deleting a user', async () => {
    const { calls } = mockApi({ ...routes([user({})]), 'DELETE /admin/users/:id': null });
    const u = userEvent.setup();
    renderAdmin();
    const table = await screen.findByRole('table');
    await u.click(within(table).getByRole('button', { name: 'Elimina utente' }));
    const dialog = screen.getByRole('dialog', { name: 'Eliminare Mario Rossi?' });
    await u.click(within(dialog).getByRole('button', { name: 'Elimina' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/admin/users/1')).toBe(true));
  });
});

describe('AdminPage — check-ins', () => {
  it('opens a new check-in, marks it as seen and shows translated answers', async () => {
    localStorage.setItem(ADMIN_TOKEN_KEY, 'admin-token');
    const checkin = {
      id: 7,
      user_id: 1,
      username: 'mrossi',
      user_first_name: 'Mario',
      user_last_name: 'Rossi',
      first_name: 'Mario',
      last_name: 'Rossi',
      email: '',
      feedback_date: '2026-10-01',
      energy_level: 'high',
      workouts_completed: 'all',
      meal_plan_followed: 'mostly',
      sleep_quality: 'poor',
      physical_discomfort: 'significant',
      discomfort_details: null,
      muscular_zones: null,
      muscular_notes: null,
      articular_zones: '["Ginocchio"]',
      articular_notes: 'destro',
      motivation_level: 'good',
      weekly_highlights: 'tutto ok',
      current_weight: 80,
      created_at: '2026-10-01 09:00:00',
      pdf_change_date: null,
      trainer_seen_at: null,
    } satisfies Checkin;
    const { calls } = mockApi({
      'GET /admin/trainers': trainers,
      'GET /admin/users': { users: [] },
      'GET /feedback/admin/unread-count': { unreadCount: 1 },
      'GET /feedback/admin/all': { feedbacks: [checkin], total: 1, totalPages: 1, stats: { total: 1, withDiscomfort: 1, lowMotivation: 0, missedWorkouts: 0 } },
      'POST /feedback/admin/:id/mark-seen': null,
    });
    const u = userEvent.setup();
    renderAdmin();

    await u.click(await screen.findByRole('button', { name: /Check/ }));
    await u.click(await screen.findByRole('button', { name: /Apri il check di Mario Rossi/ }));
    const dialog = screen.getByRole('dialog', { name: 'Check di Mario Rossi' });
    expect(within(dialog).getByText('Ginocchio')).toBeInTheDocument();
    expect(within(dialog).getByText('Scarsa')).toBeInTheDocument();
    expect(within(dialog).getByText('80 kg')).toBeInTheDocument();
    await waitFor(() => expect(calls.some((c) => c.path === '/feedback/admin/7/mark-seen')).toBe(true));
  });
});
