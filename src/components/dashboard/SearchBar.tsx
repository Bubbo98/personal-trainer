import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiX } from 'react-icons/fi';

interface SearchBarProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  onClear: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearch,
  onClear
}) => {
  const { t } = useTranslation();

  return (
    <div className="relative mb-6">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {React.createElement(FiSearch as React.ComponentType<{ className?: string }>, { className: "w-5 h-5 text-gray-400" })}
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t('dashboard.searchPlaceholder')}
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent text-gray-900 placeholder-gray-500"
        />
        {searchQuery && (
          <button
            onClick={onClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors"
          >
            {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-5 h-5 text-gray-400" })}
          </button>
        )}
      </div>
      {searchQuery && (
        <div className="mt-2 text-sm text-gray-600">
          {t('dashboard.search')}: "{searchQuery}"
        </div>
      )}
    </div>
  );
};

export default SearchBar;