import { useState } from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/render';
import Modal from './Modal';
import Button from './Button';
import { useConfirm } from './ConfirmDialog';
import { useToast } from './Toast';

describe('Modal', () => {
  const Harness = ({ dismissible = true }: { dismissible?: boolean }) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>open</button>
        {open && (
          <Modal title="Titolo" onClose={() => setOpen(false)} dismissible={dismissible}>
            <button>inside</button>
          </Modal>
        )}
      </>
    );
  };

  it('is a labelled dialog that closes with Esc and gives focus back', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);
    const opener = screen.getByRole('button', { name: 'open' });
    await user.click(opener);

    expect(screen.getByRole('dialog', { name: 'Titolo' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('closes on backdrop click and with the X button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);
    await user.click(screen.getByText('open'));
    await user.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByText('open'));
    await user.pointer({ keys: '[MouseLeft]', target: screen.getByRole('dialog').parentElement! });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cannot be dismissed while busy', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness dismissible={false} />);
    await user.click(screen.getByText('open'));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chiudi' })).toBeDisabled();
  });

  it('keeps Tab focus inside', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);
    await user.click(screen.getByText('open'));
    await user.tab(); // X
    await user.tab(); // inside
    await user.tab(); // wraps to X
    expect(screen.getByRole('button', { name: 'Chiudi' })).toHaveFocus();
  });
});

describe('useConfirm', () => {
  const Harness = ({ onAnswer }: { onAnswer: (answer: boolean) => void }) => {
    const confirm = useConfirm();
    return (
      <button onClick={async () => onAnswer(await confirm({ title: 'Eliminare?', message: 'Non si torna indietro', danger: true }))}>
        ask
      </button>
    );
  };

  it.each([
    ['Conferma', true],
    ['Annulla', false],
  ])('resolves %s → %s', async (label, expected) => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    renderWithProviders(<Harness onAnswer={onAnswer} />);
    await user.click(screen.getByText('ask'));
    expect(screen.getByRole('dialog', { name: 'Eliminare?' })).toHaveTextContent('Non si torna indietro');
    await user.click(screen.getByRole('button', { name: label }));
    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(expected));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('counts Esc as cancel', async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    renderWithProviders(<Harness onAnswer={onAnswer} />);
    await user.click(screen.getByText('ask'));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(false));
  });
});

describe('useToast', () => {
  it('shows messages and hides them after a while', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const Harness = () => {
      const toast = useToast();
      return <button onClick={() => toast.error('Salvataggio fallito')}>fail</button>;
    };
    renderWithProviders(<Harness />);
    await user.click(screen.getByText('fail'));
    expect(screen.getByRole('alert')).toHaveTextContent('Salvataggio fallito');
    await act(() => vi.advanceTimersByTimeAsync(8000));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('Button', () => {
  it('is disabled and busy while loading', () => {
    renderWithProviders(<Button loading>Salva</Button>);
    const button = screen.getByRole('button', { name: 'Salva' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
