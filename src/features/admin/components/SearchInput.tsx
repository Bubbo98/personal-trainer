import type { InputHTMLAttributes } from 'react';
import { FiSearch } from 'react-icons/fi';
import { inputClass } from '../../../components/ui/Field';

/** Search box with a magnifier; `label` is its accessible name. */
const SearchInput = ({ label, className = '', ...input }: { label: string } & InputHTMLAttributes<HTMLInputElement>) => (
  <div className={`relative ${className}`} role="search">
    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden />
    <input type="search" aria-label={label} className={`${inputClass} pl-10 py-2`} {...input} />
  </div>
);

export default SearchInput;
