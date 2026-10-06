import { useTranslation } from 'react-i18next';
import { pageItems } from './pageItems';

const buttonClass = 'px-3 py-1 text-sm border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed';

const Pagination = ({ page, pages, total, onChange }: { page: number; pages: number; total: number; onChange: (page: number) => void }) => {
  const { t } = useTranslation('admin');
  if (pages <= 1) return null;
  return (
    <nav aria-label={t('pagination.label')} className="bg-gray-50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-gray-200">
      <p className="text-sm text-gray-700">{t('pagination.summary', { page, pages, total })}</p>
      <div className="flex items-center gap-1 flex-wrap justify-center">
        <button type="button" onClick={() => onChange(1)} disabled={page === 1} aria-label={t('pagination.first')} className={`${buttonClass} bg-white border-gray-300 text-gray-500 hover:bg-gray-50`}>
          «
        </button>
        <button type="button" onClick={() => onChange(page - 1)} disabled={page === 1} className={`${buttonClass} bg-white border-gray-300 text-gray-700 hover:bg-gray-50`}>
          ‹ {t('pagination.previous')}
        </button>
        {pageItems(page, pages).map((item, i) =>
          item === 'gap' ? (
            <span key={`gap-${i}`} className="px-2 text-sm text-gray-400" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              aria-current={page === item ? 'page' : undefined}
              aria-label={t('pagination.page', { page: item })}
              className={`${buttonClass} ${page === item ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              {item}
            </button>
          ),
        )}
        <button type="button" onClick={() => onChange(page + 1)} disabled={page === pages} className={`${buttonClass} bg-white border-gray-300 text-gray-700 hover:bg-gray-50`}>
          {t('pagination.next')} ›
        </button>
        <button type="button" onClick={() => onChange(pages)} disabled={page === pages} aria-label={t('pagination.last')} className={`${buttonClass} bg-white border-gray-300 text-gray-500 hover:bg-gray-50`}>
          »
        </button>
      </div>
    </nav>
  );
};

export default Pagination;
