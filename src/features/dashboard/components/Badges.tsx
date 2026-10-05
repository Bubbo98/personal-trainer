import { useTranslation } from 'react-i18next';
import type { Badge } from './badge';

const COLORS = {
  warn: { dot: 'bg-orange-500', ping: 'bg-orange-400' },
  alert: { dot: 'bg-red-500', ping: 'bg-red-400' },
} as const;

/** Pulsing dot that draws the eye to a section needing action. */
export const BadgeDot = ({ badge, className = '' }: { badge: Badge; className?: string }) => {
  const { t } = useTranslation('dashboard');
  if (!badge) return null;
  const colors = COLORS[badge];
  return (
    <span className={`absolute flex w-3 h-3 ${className}`}>
      <span className={`absolute inline-flex w-full h-full rounded-full opacity-75 motion-safe:animate-ping ${colors.ping}`} />
      <span className={`relative inline-flex w-3 h-3 rounded-full border-2 border-white ${colors.dot}`} />
      <span className="sr-only">{t(`badges.${badge}`)}</span>
    </span>
  );
};

/**
 * Sub-sections of a section, as tiles rather than a thin segmented control,
 * so it's obvious there are several pages to explore.
 */
export function SubTabs<T extends string>({
  items,
  active,
  onChange,
  label,
}: {
  items: { id: T; label: string; badge?: Badge }[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className={`grid gap-2 sm:gap-3 mb-6 ${items.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {items.map((item) => {
        const selected = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(item.id)}
            className={`relative flex items-center justify-center px-2 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
              selected
                ? 'bg-gray-900 border-gray-900 text-white shadow-md'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400 shadow-sm'
            }`}
          >
            <span>{item.label}</span>
            <BadgeDot badge={item.badge ?? null} className="-top-1 -right-1" />
          </button>
        );
      })}
    </div>
  );
}
