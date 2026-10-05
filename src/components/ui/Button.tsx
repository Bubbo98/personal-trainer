import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Spinner from './Spinner';

const VARIANTS = {
  primary: 'bg-gray-900 text-white hover:bg-gray-800 border border-gray-900',
  secondary: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200',
  danger: 'bg-red-600 text-white hover:bg-red-700 border border-red-600',
  ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent',
} as const;

const SIZES = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
} as const;

const SPINNER_COLOR: Record<keyof typeof VARIANTS, string> = {
  primary: 'border-white',
  secondary: 'border-gray-700',
  danger: 'border-white',
  ghost: 'border-gray-700',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  'data-autofocus'?: boolean;
}

const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={`inline-flex items-center justify-center rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    {...rest}
  >
    {loading ? <Spinner size="sm" className={SPINNER_COLOR[variant]} /> : icon}
    {children}
  </button>
);

export default Button;
