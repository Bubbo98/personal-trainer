import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiExternalLink, FiGift, FiShoppingBag } from 'react-icons/fi';
import { SiInstagram, SiTiktok } from 'react-icons/si';
import Pills from '../../../components/ui/Pills';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/States';
import { useErrorMessage } from '../../../lib/errors';
import { safeExternalUrl } from '../../../lib/urls';
import { SOCIAL } from '../../../config';
import { useProducts } from '../queries';

/** Denise's clients (trainer 2) follow her Instagram; everybody else Joshua's profiles. */
const DENISE_TRAINER_ID = 2;

const Supplements = () => {
  const { t } = useTranslation('dashboard');
  const errorMessage = useErrorMessage();
  const products = useProducts();
  const [categoryId, setCategoryId] = useState<number | null>(null);

  if (products.isPending) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="aspect-[3/4]" />
        ))}
      </div>
    );
  }
  if (products.isError) return <ErrorState message={errorMessage(products.error)} onRetry={() => products.refetch()} />;

  const categories = products.data;
  const all = categories.flatMap((c) => c.products.map((p) => ({ ...p, categoryId: c.id, categoryName: c.name })));
  const visible = categoryId === null ? all : all.filter((p) => p.categoryId === categoryId);

  if (all.length === 0) return <EmptyState title={t('supplements.emptyTitle')} message={t('supplements.emptyMessage')} />;

  return (
    <>
      <Pills
        label={t('supplements.categoriesLabel')}
        className="mb-8"
        value={categoryId}
        onChange={setCategoryId}
        options={[
          { value: null, label: t('videos.allCategories'), count: all.length },
          ...categories.map((c) => ({ value: c.id, label: c.name, count: c.products.length })),
        ]}
      />
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-5">
        {visible.map((product) => {
          const href = safeExternalUrl(product.productUrl);
          const image = safeExternalUrl(product.imageUrl);
          return (
            <li key={product.id}>
              <a
                href={href ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="h-full flex flex-col bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="relative aspect-square bg-gray-100">
                  {image && <img src={image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-contain p-3" />}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                  {categoryId === null && <p className="text-xs text-gray-500 font-medium mt-1">{product.categoryName}</p>}
                  <span className="mt-auto pt-3">
                    <span className="flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium">
                      <FiExternalLink className="w-4 h-4" aria-hidden />
                      {t('supplements.buy')}
                    </span>
                  </span>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
};

/** "More": referral banner, the trainer's socials and the supplements catalog. */
const MoreSection = ({ hasPlan, trainerId }: { hasPlan: boolean; trainerId?: number | null }) => {
  const { t } = useTranslation('dashboard');

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        {hasPlan && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 shadow-lg flex items-center gap-4">
            <FiGift className="w-12 h-12 text-white flex-shrink-0" aria-hidden />
            <div>
              <h2 className="text-xl font-bold text-white mb-2">{t('more.referralTitle')}</h2>
              <p className="text-blue-50">{t('more.referralMessage')}</p>
            </div>
          </div>
        )}

        {trainerId === DENISE_TRAINER_ID ? (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-5 shadow-lg flex items-center gap-4">
            <SiInstagram className="w-10 h-10 text-white flex-shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-lg">{t('more.followInstagram')}</p>
              <p className="text-purple-100 text-sm">{t('more.followMessage')}</p>
            </div>
            <a
              href={SOCIAL.deniseInstagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 bg-white text-purple-600 font-semibold px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors text-sm"
            >
              {SOCIAL.deniseInstagramHandle}
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <a
              href={SOCIAL.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Instagram ${SOCIAL.instagramHandle}`}
              className="flex items-center justify-center sm:justify-start gap-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 shadow-lg hover:opacity-90 transition-opacity"
            >
              <SiInstagram className="w-7 h-7 sm:w-8 sm:h-8 text-white flex-shrink-0" aria-hidden />
              <span className="hidden sm:block min-w-0">
                <span className="block text-white font-semibold text-sm leading-tight">Instagram</span>
                <span className="block text-purple-100 text-xs truncate">{SOCIAL.instagramHandle}</span>
              </span>
            </a>
            <a
              href={SOCIAL.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`TikTok ${SOCIAL.tiktokHandle}`}
              className="flex items-center justify-center sm:justify-start gap-3 bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl p-4 shadow-lg hover:opacity-90 transition-opacity"
            >
              <SiTiktok className="w-7 h-7 sm:w-8 sm:h-8 text-white flex-shrink-0" aria-hidden />
              <span className="hidden sm:block min-w-0">
                <span className="block text-white font-semibold text-sm leading-tight">TikTok</span>
                <span className="block text-gray-300 text-xs truncate">{SOCIAL.tiktokHandle}</span>
              </span>
            </a>
          </div>
        )}
      </div>

      <section className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <FiShoppingBag className="w-8 h-8 text-gray-900 flex-shrink-0" aria-hidden />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('supplements.title')}</h2>
            <p className="text-gray-600">{t('supplements.subtitle')}</p>
          </div>
        </div>
        <Supplements />
      </section>
    </div>
  );
};

export default MoreSection;
