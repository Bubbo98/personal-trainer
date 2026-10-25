import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { errorResponse, mockApi, renderWithProviders } from '../../test/render';
import TrialWizard from './TrialWizard';
import { signupBody, wizardSteps, type PublicQuestionnaire } from './wizard';

const questionnaire: PublicQuestionnaire = {
  disciplines: ['gym', 'calisthenics'],
  trialDays: 7,
  dayOptions: [2, 3, 4],
  questions: [
    { id: 'years', text: 'Da quanto ti alleni?', textEn: null, discipline: null, options: [{ id: 'new', text: 'Ho appena iniziato', textEn: null }, { id: 'old', text: 'Da anni', textEn: null }] },
    { id: 'bench', text: 'Fai la panca?', textEn: null, discipline: 'gym', options: [{ id: 'no', text: 'No', textEn: null }, { id: 'yes', text: 'Sì', textEn: null }] },
    { id: 'pullups', text: 'Quante trazioni?', textEn: null, discipline: 'calisthenics', options: [{ id: 'few', text: 'Poche', textEn: null }, { id: 'many', text: 'Tante', textEn: null }] },
  ],
};

async function answerAll() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: /Calisthenics/ }));
  await user.click(screen.getByRole('button', { name: '3 giorni' }));
  await user.click(screen.getByRole('button', { name: 'Da anni' }));
  await user.click(screen.getByRole('button', { name: 'Tante' }));
  return user;
}

async function fillContacts(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Nome/), 'Giulia');
  await user.type(screen.getByLabelText(/^Email/), 'giulia@example.com');
  await user.type(screen.getByLabelText(/^Telefono/), '333 1234567');
  await user.click(screen.getByLabelText(/informativa privacy/));
  await user.click(screen.getByLabelText("Ho letto l'avvertenza e la accetto"));
}

describe('trial signup wizard', () => {
  it('steps: discipline (when there is a choice), training days, its questions, contacts', () => {
    expect(wizardSteps(questionnaire, 'gym')).toEqual(['discipline', 'days', 'q:years', 'q:bench', 'contact']);
    expect(wizardSteps({ ...questionnaire, disciplines: ['calisthenics'] }, 'calisthenics')).toEqual(['days', 'q:years', 'q:pullups', 'contact']);
  });

  it('only sends the answers of the chosen discipline', () => {
    const form = { firstName: ' Giulia ', lastName: '', email: 'g@example.com ', phone: '333', privacy: true, disclaimer: true, marketing: false };
    const body = signupBody('gym', 4, { years: 'old', bench: 'yes', pullups: 'many' }, questionnaire.questions, form, 'en-GB', {
      elapsedMs: 12345.6,
      website: '',
      captchaToken: null,
    });
    expect(body).toMatchObject({ discipline: 'gym', daysPerWeek: 4, answers: { years: 'old', bench: 'yes' }, firstName: 'Giulia', email: 'g@example.com', lang: 'en', elapsedMs: 12346, website: '' });
    expect(body).not.toHaveProperty('captchaToken');
  });

  it('asks the questions of the discipline, then sends the signup', async () => {
    const { calls } = mockApi({
      'GET /trials/questionnaire': questionnaire,
      'POST /trials/signup': { resent: false, emailSent: true },
    });
    renderWithProviders(<TrialWizard />);
    const user = await answerAll();

    expect(screen.queryByText('Fai la panca?')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Inizia la prova gratuita' }));
    expect(await screen.findByText('Per iniziare la prova devi accettare l\'informativa privacy.')).toBeInTheDocument();
    expect(screen.getByText("Per iniziare la prova devi accettare l'avvertenza sull'uso della scheda.")).toBeInTheDocument();
    expect(screen.getByText(/Questa scheda è un esempio generico di allenamento/)).toBeInTheDocument();
    expect(calls.some((c) => c.path === '/trials/signup')).toBe(false);

    await fillContacts(user);
    await user.click(screen.getByRole('button', { name: 'Inizia la prova gratuita' }));
    expect(await screen.findByRole('heading', { name: 'Fatto! Controlla la tua email' })).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/trials/signup')?.body).toMatchObject({
      discipline: 'calisthenics',
      daysPerWeek: 3,
      answers: { years: 'old', pullups: 'many' },
      firstName: 'Giulia',
      phone: '333 1234567',
      privacy: true,
      disclaimer: true,
      marketing: false,
      lang: 'it',
      website: '',
    });
    expect(calls.find((c) => c.path === '/trials/signup')?.body).toHaveProperty('elapsedMs', expect.any(Number));
  });

  it('the back button returns to the previous answer', async () => {
    mockApi({ 'GET /trials/questionnaire': questionnaire });
    renderWithProviders(<TrialWizard />);
    const user = await answerAll();
    await user.click(screen.getByRole('button', { name: 'Indietro' }));
    expect(screen.getByRole('button', { name: 'Tante' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('a trial already used with that email points to WhatsApp', async () => {
    mockApi({
      'GET /trials/questionnaire': questionnaire,
      'POST /trials/signup': () => errorResponse(409, 'used', 'TRIAL_ALREADY_USED'),
    });
    renderWithProviders(<TrialWizard />);
    const user = await answerAll();
    await fillContacts(user);
    await user.click(screen.getByRole('button', { name: 'Inizia la prova gratuita' }));
    expect(await screen.findByText(/hai già fatto la prova gratuita/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Scrivici su WhatsApp' })).toHaveAttribute('href', expect.stringContaining('https://wa.me/'));
  });

  it('no discipline offered: the trial is unavailable', async () => {
    mockApi({ 'GET /trials/questionnaire': { ...questionnaire, disciplines: [] } });
    renderWithProviders(<TrialWizard />);
    expect(await screen.findByText(/non è disponibile in questo momento/)).toBeInTheDocument();
  });
});
