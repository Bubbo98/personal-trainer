import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiMenu } from 'react-icons/fi';

type HandleProps = Record<string, unknown>;

/**
 * A sortable item: `children` receives the drag-handle props to spread on a
 * DragHandle, so only the handle starts a drag (inputs stay usable).
 */
export function Sortable({
  id,
  className = '',
  children,
}: {
  id: string | number;
  className?: string;
  children: (handle: HandleProps) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className={className}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

export const DragHandle = ({ handle, className = '' }: { handle: HandleProps; className?: string }) => {
  const { t } = useTranslation('admin');
  return (
    <button
      type="button"
      {...handle}
      aria-label={t('actions.dragToReorder')}
      style={{ touchAction: 'none' }}
      className={`flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 ${className}`}
    >
      <FiMenu className="w-4 h-4" aria-hidden />
    </button>
  );
};
