import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FiX } from 'react-icons/fi';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const;

interface ModalProps {
  title?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZES;
  /** Darker backdrop for video players. */
  variant?: 'default' | 'media';
  /** False while a save is running: Esc, the backdrop and the X do nothing. */
  dismissible?: boolean;
}

// Modals can stack (a technique video over the picker): only the top one handles keys
const stack: string[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';

/** Accessible dialog: Esc and the backdrop close it, focus moves in and back, the page behind doesn't scroll. */
const Modal = ({ title, onClose, children, footer, size = 'md', variant = 'default', dismissible = true }: ModalProps) => {
  const { t } = useTranslation('common');
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);

  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  useEffect(() => {
    stack.push(id);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel)?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === 'Escape') {
        if (dismissibleRef.current) onCloseRef.current();
      } else if (e.key === 'Tab' && panel) {
        // Keep keyboard focus inside the dialog
        const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      stack.splice(stack.indexOf(id), 1);
      if (stack.length === 0) document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [id]);

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${variant === 'media' ? 'bg-black/90' : 'bg-black/60'}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissible) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `${id}-title` : undefined}
        tabIndex={-1}
        className={`relative w-full ${SIZES[size]} max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl outline-none overflow-hidden`}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-100 flex-shrink-0">
          {title ? (
            <h2 id={`${id}-title`} className="font-bold text-gray-900 text-lg leading-snug min-w-0 break-words">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={!dismissible}
            className="p-1 -m-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40"
            aria-label={t('common.close')}
          >
            <FiX className="w-5 h-5" aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap justify-end gap-3 flex-shrink-0">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
