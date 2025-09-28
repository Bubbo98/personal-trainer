import React from 'react';
import { useTranslation } from 'react-i18next';
import { Category } from '../../types/dashboard';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2 mb-8">
      <button
        onClick={() => onSelectCategory(null)}
        className={`px-4 py-2 rounded-full font-medium transition-colors ${
          selectedCategory === null
            ? 'bg-gray-900 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        {t('dashboard.allCategories')} ({categories.reduce((sum, cat) => sum + cat.videoCount, 0)})
      </button>

      {categories.map((category) => (
        <button
          key={category.name}
          onClick={() => onSelectCategory(category.name)}
          className={`px-4 py-2 rounded-full font-medium transition-colors capitalize ${
            selectedCategory === category.name
              ? 'bg-gray-900 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {category.name} ({category.videoCount})
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;