import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

export const inputClass =
  'w-full bg-white px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500';

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
}

/** Label + control + hint/error, wired with ids for screen readers. */
function FieldShell({
  id,
  label,
  hint,
  error,
  className = '',
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="text-xs text-red-600 mt-1" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-xs text-gray-500 mt-1">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, props: FieldProps) => (props.error || props.hint ? `${id}-msg` : undefined);

export const TextField = ({ label, hint, error, className, ...input }: FieldProps & InputHTMLAttributes<HTMLInputElement>) => {
  const id = useId();
  return (
    <FieldShell id={input.id ?? id} label={label} hint={hint} error={error} className={className}>
      <input
        id={input.id ?? id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(input.id ?? id, { label, hint, error })}
        className={inputClass}
        {...input}
      />
    </FieldShell>
  );
};

export const TextAreaField = ({
  label,
  hint,
  error,
  className,
  ...textarea
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const id = useId();
  return (
    <FieldShell id={textarea.id ?? id} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={textarea.id ?? id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(textarea.id ?? id, { label, hint, error })}
        className={inputClass}
        {...textarea}
      />
    </FieldShell>
  );
};

export const SelectField = ({
  label,
  hint,
  error,
  className,
  children,
  ...select
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) => {
  const id = useId();
  return (
    <FieldShell id={select.id ?? id} label={label} hint={hint} error={error} className={className}>
      <select
        id={select.id ?? id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(select.id ?? id, { label, hint, error })}
        className={`${inputClass} appearance-none pr-10 select-arrow`}
        {...select}
      >
        {children}
      </select>
    </FieldShell>
  );
};

export const Checkbox = ({ label, ...input }: { label: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) => (
  <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900" {...input} />
    {label}
  </label>
);
