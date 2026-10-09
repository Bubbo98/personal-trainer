import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ADMIN_TOKEN_KEY } from '../../../../lib/api';
import { mockApi, renderWithProviders } from '../../../../test/render';
import WorkoutPlanPanel from './WorkoutPlanPanel';

const parsedDay = {
  dayNumber: 1,
  dayName: 'Giorno 1 - Petto',
  exercises: [{ name: 'Panca piana', sets: '4', reps: '8', rest: "2'", notes: 'Peso consigliato: 30 kg', weightSlots: 1 }],
};

describe('WorkoutPlanPanel — import from text', () => {
  beforeEach(() => localStorage.setItem(ADMIN_TOKEN_KEY, 'admin-token'));

  it('lists the lines it cannot read and imports nothing', async () => {
    const { calls } = mockApi({
      'GET /workout/admin/plan/:id': { exercises: [] },
      'POST /workout/admin/parse-text': { days: [parsedDay], errors: [{ line: 3, text: "Croci 3 12 1'", reason: 'columns' }] },
    });
    const user = userEvent.setup();
    renderWithProviders(<WorkoutPlanPanel userId={7} userName="Mario" />);
    await user.click(await screen.findByRole('button', { name: 'Importa da testo' }));
    const dialog = screen.getByRole('dialog', { name: 'Importa la scheda da testo' });
    await user.type(within(dialog).getByLabelText('Testo della scheda'), 'GIORNO 1');
    await user.click(within(dialog).getByRole('button', { name: 'Importa' }));

    expect(await within(dialog).findByText(/Nessun esercizio importato/)).toBeInTheDocument();
    expect(within(dialog).getByText('Riga 3:')).toBeInTheDocument();
    expect(within(dialog).getByText("Croci 3 12 1'")).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/workout/admin/parse-text')?.body).toEqual({ text: 'GIORNO 1' });
    expect(screen.queryByDisplayValue('Panca piana')).not.toBeInTheDocument();
  });

  it('fills the editor with the imported days, to be checked and saved', async () => {
    mockApi({
      'GET /workout/admin/plan/:id': { exercises: [] },
      'POST /workout/admin/parse-text': { days: [parsedDay], errors: [] },
    });
    const user = userEvent.setup();
    renderWithProviders(<WorkoutPlanPanel userId={7} userName="Mario" />);
    await user.click(await screen.findByRole('button', { name: 'Importa da testo' }));
    await user.type(screen.getByLabelText('Testo della scheda'), 'GIORNO 1 | Petto');
    await user.click(screen.getByRole('button', { name: 'Importa' }));

    expect(await screen.findByDisplayValue('Panca piana')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Giorno 1 - Petto')).toBeInTheDocument();
    expect(screen.getByText('Modifiche non salvate')).toBeInTheDocument();
  });
});
