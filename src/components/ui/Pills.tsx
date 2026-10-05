import type { ReactNode } from 'react';

export interface PillOption<T> {
  value: T;
  label: ReactNode;
  count?: number;
}

/** Single-choice filter rendered as rounded chips (categories…). */
function Pills<T extends string | number | null>({
  options,
  value,
  onChange,
  label,
  className = 'mb-6',
}: {
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group. */
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              active ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {option.label}
            {option.count !== undefined && <span className="ml-1 opacity-70">({option.count})</span>}
          </button>
        );
      })}
    </div>
  );
}

export default Pills;
