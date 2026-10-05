import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { CLIENT_TOKEN_KEY } from '../../lib/api';
import { weekStart } from '../../lib/format';
import { errorResponse, mockApi, renderWithProviders } from '../../test/render';
import DashboardPage from './DashboardPage';
import type { CheckinStatus, Exercise, ExerciseLog, TrainingDay, Video } from './types';

const user = { id: 165, username: 'bubbo', email: null, firstName: 'Test', lastName: 'User', trainerId: 1 };

const video = (id: number, over: Partial<Video> = {}): Video => ({
  id,
  title: `Video ${id}`,
  description: '',
  filePath: '',
  signedUrl: `https://r2/${id}.mp4`,
  duration: 90,
  category: 'Palestra',
  createdAt: '2026-01-01',
  ...over,
});

const exercises: Exercise[] = [
  { id: 1, day_number: 1, day_name: 'Giorno 1 - MACCHINARI', order_index: 0, name: 'Leg press', sets: '4', reps: '10', rest: '90"', notes: 'Peso consigliato: 80', weight_slots: 1 },
  { id: 2, day_number: 2, day_name: 'Giorno 2', order_index: 0, name: 'Panca', sets: '3', reps: '8', rest: null, notes: null, weight_slots: 2 },
];

interface Setup {
  checkin?: CheckinStatus;
  exercises?: Exercise[];
  logs?: ExerciseLog[];
  days?: TrainingDay[];
  videos?: Video[];
}

function setup({ checkin = { shouldShow: false, reason: 'exempt' }, exercises: ex = exercises, logs = [], days = [], videos = [] }: Setup = {}) {
  return mockApi({
    'POST /auth/login-link': { token: 'session-token', user },
    'GET /auth/verify': { user },
    'GET /feedback/should-show': checkin,
    'GET /feedback/my-feedbacks': { feedbacks: [] },
    'GET /feedback/trainer-seen-notification': { notifications: [] },
    'POST /feedback/dismiss-trainer-seen': null,
    'POST /feedback': null,
    'GET /pdf/my-pdf': null,
    'GET /workout/plan': { exercises: ex },
    'GET /workout/logs': { logs },
    'POST /workout/logs': null,
    'GET /videos/training-days': { trainingDays: days },
    'GET /videos': { videos },
    'GET /reviews/my': { review: null },
    'GET /integration/products': { categories: [] },
  });
}

const renderPage = (route = '/dashboard') =>
  renderWithProviders(
    <Routes>
      <Route path="/dashboard/:token?" element={<DashboardPage />} />
      <Route path="/" element={<p>home</p>} />
    </Routes>,
    { route },
  );

describe('DashboardPage — access', () => {
  it('exchanges a login link for a session and cleans the URL', async () => {
    const { calls } = setup();
    renderPage('/dashboard/link-token');

    expect(await screen.findByRole('heading', { name: 'Benvenuto, Test!' })).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/auth/login-link')?.body).toEqual({ token: 'link-token' });
    expect(localStorage.getItem(CLIENT_TOKEN_KEY)).toBe('session-token');
  });

  it('reuses a stored session', async () => {
    localStorage.setItem(CLIENT_TOKEN_KEY, 'stored');
    const { calls } = setup();
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Benvenuto, Test!' })).toBeInTheDocument();
    expect(calls.some((c) => c.path === '/auth/verify')).toBe(true);
  });

  it('denies access without a session', async () => {
    const { calls } = setup();
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Accesso negato' })).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('explains an expired plan', async () => {
    mockApi({ 'POST /auth/login-link': () => errorResponse(403, 'Scheda scaduta', 'PLAN_EXPIRED') });
    renderPage('/dashboard/old-link');
    expect(await screen.findByRole('heading', { name: 'Scheda scaduta' })).toBeInTheDocument();
    expect(screen.getByText(/la tua scheda è scaduta/i)).toBeInTheDocument();
  });

  it('logs out', async () => {
    localStorage.setItem(CLIENT_TOKEN_KEY, 'stored');
    setup();
    const u = userEvent.setup();
    renderPage();
    await u.click(await screen.findByRole('button', { name: 'Esci' }));
    expect(await screen.findByText('home')).toBeInTheDocument();
    expect(localStorage.getItem(CLIENT_TOKEN_KEY)).toBeNull();
  });
});

describe('DashboardPage — check-in lock', () => {
  it('locks every other section while a check-in is due', async () => {
    localStorage.setItem(CLIENT_TOKEN_KEY, 'stored');
    setup({ checkin: { shouldShow: true, pdfUpdatedAt: '2026-09-01T00:00:00Z', lastFeedbackAt: null } });
    renderPage();

    expect(await screen.findByText('Check settimanale richiesto')).toBeInTheDocument();
    const nav = screen.getAllByRole('navigation', { name: "Sezioni dell'area clienti" })[0];
    expect(within(nav).getByRole('button', { name: /Allenamento/ })).toBeDisabled();
    expect(within(nav).getByRole('button', { name: /Check/ })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByText('Primo check di questa scheda!')).toBeInTheDocument();
  });

  it('sends the check-in and unlocks the dashboard', async () => {
    localStorage.setItem(CLIENT_TOKEN_KEY, 'stored');
    let status: CheckinStatus = { shouldShow: true, pdfUpdatedAt: '2026-09-01T00:00:00Z', lastFeedbackAt: '2026-09-10 10:00:00' };
    const { calls } = mockApi({
      'GET /auth/verify': { user },
      'GET /feedback/should-show': () => status,
      'GET /feedback/my-feedbacks': { feedbacks: [] },
      'GET /feedback/trainer-seen-notification': { notifications: [] },
      'POST /feedback': () => {
        status = { shouldShow: false, reason: 'too_soon_since_last', lastFeedbackAt: new Date().toISOString() };
        return null;
      },
      'GET /pdf/my-pdf': null,
      'GET /workout/plan': { exercises: [] },
      'GET /workout/logs': { logs: [] },
      'GET /videos/training-days': { trainingDays: [] },
      'GET /videos': { videos: [] },
    });
    const u = userEvent.setup();
    renderPage();

    await screen.findByText('Check settimanale richiesto');
    await u.click(screen.getByRole('button', { name: 'Invia check' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Rispondi a tutte le domande');

    await u.click(screen.getByRole('radio', { name: 'Alta' }));
    await u.click(screen.getByRole('radio', { name: 'Quasi tutti' }));
    await u.click(screen.getByRole('radio', { name: 'In gran parte' }));
    await u.click(screen.getAllByRole('radio', { name: 'Buona' })[0]); // sleep (motivation comes later)
    await u.click(screen.getByRole('radio', { name: 'Sì, ho dei dolori' }));
    await u.click(screen.getByRole('button', { name: 'Ginocchio' }));
    await u.click(screen.getByRole('radio', { name: 'Molto alta' }));
    await u.type(screen.getByLabelText(/peso attuale/i), '10');
    await u.click(screen.getByRole('button', { name: 'Invia check' }));
    expect(screen.getByRole('alert')).toHaveTextContent('tra 20 e 300 kg');

    await u.clear(screen.getByLabelText(/peso attuale/i));
    await u.type(screen.getByLabelText(/peso attuale/i), '72,5');
    await u.click(screen.getByRole('button', { name: 'Invia check' }));

    await waitFor(() => expect(screen.queryByText('Check settimanale richiesto')).not.toBeInTheDocument());
    expect(calls.find((c) => c.method === 'POST' && c.path === '/feedback')?.body).toEqual({
      firstName: 'Test',
      lastName: 'User',
      email: '',
      energyLevel: 'high',
      workoutsCompleted: 'almost_all',
      mealPlanFollowed: 'mostly',
      sleepQuality: 'good',
      motivationLevel: 'very_high',
      physicalDiscomfort: 'significant',
      muscularZones: [],
      muscularNotes: '',
      articularZones: ['Ginocchio'],
      articularNotes: '',
      weeklyHighlights: '',
      currentWeight: '72.5',
    });
    expect(await screen.findByText('Grazie per il tuo check!')).toBeInTheDocument();
  });
});

describe('DashboardPage — training days', () => {
  beforeEach(() => localStorage.setItem(CLIENT_TOKEN_KEY, 'stored'));

  it('shows the week with carried-over weights and suggested placeholders', async () => {
    setup({
      logs: [{ id: 9, exercise_id: 1, week_start: '2020-01-06', weight: '75', sets_done: null, reps_done: '9', notes: null, exercise_name: null, day_number_snapshot: 1, day_name_snapshot: null }],
      days: [{ id: 1, dayNumber: 1, dayName: null, videos: [video(5, { exerciseId: 1, title: 'Leg press tecnica' }), video(6, { title: 'Stretching' })] }],
    });
    renderPage();

    const weight = await screen.findByLabelText('Peso (kg)');
    expect(weight).toHaveValue('75');
    expect(weight).toHaveAttribute('placeholder', 'es. 80');
    expect(screen.getByLabelText('Reps fatte')).toHaveValue('');
    expect(screen.getByText('Leg press tecnica')).toBeInTheDocument();
    expect(screen.getByText('Altri video del giorno')).toBeInTheDocument();
    // Reminder: nothing logged this week
    expect(screen.getAllByText('Da fare a breve').length).toBeGreaterThan(0);
  });

  it('autosaves a weight after typing and on blur', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { calls } = setup();
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    const weight = await screen.findByLabelText('Peso (kg)');
    await u.type(weight, '82.5');
    expect(calls.filter((c) => c.method === 'POST' && c.path === '/workout/logs')).toHaveLength(0);

    await act(() => vi.advanceTimersByTimeAsync(1300));
    const saves = calls.filter((c) => c.method === 'POST' && c.path === '/workout/logs');
    expect(saves).toHaveLength(1);
    expect(saves[0].body).toEqual({ exerciseId: 1, weekStart: weekStart(), weight: '82.5', repsDone: null });
    expect(await screen.findByText('Salvato')).toBeInTheDocument();

    await u.type(screen.getByLabelText('Reps fatte'), '10');
    await u.tab();
    await waitFor(() => expect(calls.filter((c) => c.method === 'POST' && c.path === '/workout/logs')).toHaveLength(2));
  });

  it('offers a retry when a save fails', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let fail = true;
    const routes = mockApi({
      'GET /auth/verify': { user },
      'GET /feedback/should-show': { shouldShow: false, reason: 'exempt' },
      'GET /feedback/trainer-seen-notification': { notifications: [] },
      'GET /pdf/my-pdf': null,
      'GET /workout/plan': { exercises },
      'GET /workout/logs': { logs: [] },
      'GET /videos/training-days': { trainingDays: [] },
      'GET /videos': { videos: [] },
      'POST /workout/logs': () => (fail ? errorResponse(500, 'boom') : null),
    });
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await u.type(await screen.findByLabelText('Peso (kg)'), '60');
    await u.tab();
    const retry = await screen.findByRole('button', { name: 'Non salvato · Riprova' });
    fail = false;
    await u.click(retry);
    expect(await screen.findByText('Salvato')).toBeInTheDocument();
    expect(routes.calls.filter((c) => c.method === 'POST')).toHaveLength(2);
  });

  it('uses one input per weight slot', async () => {
    setup();
    const u = userEvent.setup();
    renderPage();
    await u.click(await screen.findByRole('button', { name: /Giorno 2/ }));
    expect(screen.getByLabelText('Peso 1 (kg)')).toBeInTheDocument();
    expect(screen.getByLabelText('Peso 2 (kg)')).toBeInTheDocument();
  });

  it('falls back to day videos when the plan has no exercises', async () => {
    setup({
      exercises: [],
      days: [{ id: 1, dayNumber: 1, dayName: 'Lunedì', videos: [video(1, { groupId: 3, groupLabel: 'Circuito' }), video(2, { groupId: 3 }), video(3)] }],
      videos: [video(1), video(2), video(3)],
    });
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Lunedì' })).toBeInTheDocument();
    expect(screen.getByText('Circuito')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vedi tutti i video' })).toBeInTheDocument();
  });
});

describe('DashboardPage — videos', () => {
  it('filters, searches and plays videos', async () => {
    localStorage.setItem(CLIENT_TOKEN_KEY, 'stored');
    setup({
      videos: [
        video(1, { title: 'Squat 25', category: 'Palestra', techniques: [{ id: 9, title: 'Tecnica squat', description: 'schiena dritta', signedUrl: 'https://r2/9.mp4' }] }),
        video(2, { title: 'Trazioni', category: 'CorpoLibero' }),
      ],
    });
    const u = userEvent.setup();
    renderPage();

    await u.click(await screen.findByRole('button', { name: 'Video' }));
    expect(await screen.findByText('Squat 25')).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: /CorpoLibero/ }));
    expect(screen.queryByText('Squat 25')).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /Tutti/ }));

    await u.type(screen.getByRole('searchbox', { name: 'Cerca nei video' }), 'zzz');
    expect(await screen.findByText('Nessun video trovato')).toBeInTheDocument();
    await u.click(screen.getAllByRole('button', { name: 'Cancella ricerca' })[0]);

    await u.click(screen.getByRole('button', { name: 'Riproduci Squat 25' }));
    const player = screen.getByRole('dialog', { name: 'Squat 25' });
    expect(player.querySelector('video')).toHaveAttribute('src', 'https://r2/1.mp4');
    await u.keyboard('{Escape}');

    await u.click(screen.getByRole('button', { name: 'Tecnica' }));
    expect(screen.getByRole('dialog', { name: 'Tecnica squat' })).toHaveTextContent('schiena dritta');
  });
});

describe('DashboardPage — reviews', () => {
  it('opens the review section from the email link and publishes a review', async () => {
    localStorage.setItem(CLIENT_TOKEN_KEY, 'stored');
    let review: object | null = null;
    const { calls } = mockApi({
      'GET /auth/verify': { user },
      'GET /feedback/should-show': { shouldShow: false, reason: 'exempt' },
      'GET /feedback/trainer-seen-notification': { notifications: [] },
      'GET /pdf/my-pdf': null,
      'GET /workout/plan': { exercises: [] },
      'GET /workout/logs': { logs: [] },
      'GET /reviews/my': () => ({ review }),
      'POST /reviews': (_url, init) => {
        review = { id: 1, ...JSON.parse(String(init.body)), isApproved: 0, createdAt: '2026-10-05 10:00:00', updatedAt: '2026-10-05 10:00:00' };
        return null;
      },
    });
    const u = userEvent.setup();
    renderPage('/dashboard?tab=reviews');

    await u.click(await screen.findByRole('button', { name: 'Lascia una recensione' }));
    await u.click(screen.getByText('4 stelle'));
    await u.type(screen.getByLabelText('Commento'), 'corto');
    expect(screen.getByRole('button', { name: 'Pubblica recensione' })).toBeDisabled();
    await u.type(screen.getByLabelText('Commento'), ' ma adesso abbastanza lungo');
    await u.click(screen.getByRole('button', { name: 'Pubblica recensione' }));

    expect(await screen.findByText('In attesa di approvazione', { exact: false })).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/reviews' && c.method === 'POST')?.body).toEqual({
      rating: 4,
      title: '',
      comment: 'corto ma adesso abbastanza lungo',
    });
  });
});
