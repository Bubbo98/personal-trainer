import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import Button from './Button';

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  /** Red confirm button, for deletions. */
  danger?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/** Promise-based confirmation dialog, replacing window.confirm. */
export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation('common');
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((answer: boolean) => void) | undefined>(undefined);

  const confirm = useCallback<Confirm>(
    (opts) =>
      new Promise<boolean>((resolve) => {
        resolveRef.current?.(false); // a dialog already open counts as cancelled
        resolveRef.current = resolve;
        setOptions(opts);
      }),
    [],
  );

  const answer = (value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = undefined;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <Modal
          title={options.title}
          size="sm"
          onClose={() => answer(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => answer(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant={options.danger ? 'danger' : 'primary'} onClick={() => answer(true)} data-autofocus>
                {options.confirmLabel ?? t('common.confirm')}
              </Button>
            </>
          }
        >
          {options.message && <div className="px-5 py-4 text-gray-600 text-sm whitespace-pre-line">{options.message}</div>}
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm needs a <ConfirmProvider>');
  return confirm;
}
