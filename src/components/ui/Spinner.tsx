const SIZES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-[3px]',
} as const;

interface SpinnerProps {
  size?: keyof typeof SIZES;
  className?: string;
}

const Spinner = ({ size = 'md', className = 'border-gray-900' }: SpinnerProps) => (
  <span
    aria-hidden="true"
    className={`inline-block animate-spin rounded-full border-b-transparent border-l-transparent ${SIZES[size]} ${className}`}
  />
);

export default Spinner;
