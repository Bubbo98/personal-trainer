import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FiChevronDown, FiImage, FiPlus, FiSave, FiTrash2 } from 'react-icons/fi';
import Button from '../../../components/ui/Button';
import { inputClass } from '../../../components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States';
import { useToast } from '../../../components/ui/Toast';
import { adminApi } from '../../../lib/api';
import { useErrorMessage } from '../../../lib/errors';
import { safeExternalUrl } from '../../../lib/urls';
import { newKey } from '../../../lib/keys';
import { useDragSensors } from '../components/useDragSensors';
import { DragHandle, Sortable } from '../components/sortable';
import { adminKeys } from '../queries';
import type { CatalogCategory, CatalogProduct } from '../types';
import { catalogIsValid } from './catalog';

interface ServerCategory {
  id: number;
  name: string;
  products: { id: number; name: string; imageUrl: string | null; productUrl: string }[];
}

const toDraft = (categories: ServerCategory[]): CatalogCategory[] =>
  categories.map((c) => ({
    key: newKey(),
    name: c.name,
    products: c.products.map((p) => ({ key: newKey(), name: p.name, imageUrl: p.imageUrl ?? '', productUrl: p.productUrl })),
  }));

const emptyProduct = (): CatalogProduct => ({ key: newKey(), name: '', imageUrl: '', productUrl: '' });

const reorder = <T extends { key: string }>(items: T[], event: DragEndEvent): T[] => {
  const { active, over } = event;
  if (!over || active.id === over.id) return items;
  const from = items.findIndex((i) => i.key === active.id);
  const to = items.findIndex((i) => i.key === over.id);
  return from === -1 || to === -1 ? items : arrayMove(items, from, to);
};

const smallInput = inputClass.replace('px-4 py-2.5', 'px-3 py-2').replace('rounded-xl', 'rounded-lg') + ' text-sm';

const ProductRow = ({ product, onChange, onRemove }: { product: CatalogProduct; onChange: (product: CatalogProduct) => void; onRemove: () => void }) => {
  const { t } = useTranslation('admin');
  const image = safeExternalUrl(product.imageUrl);
  const badLink = product.productUrl.trim() !== '' && !safeExternalUrl(product.productUrl);
  return (
    <Sortable id={product.key} className="flex items-start gap-2">
      {(handle) => (
        <>
          <DragHandle handle={handle} className="mt-3" />
          <div className="flex-1 border sm:border-0 border-gray-100 rounded-lg p-3 sm:p-0 flex flex-col sm:flex-row sm:items-start gap-2">
            {image ? (
              <img src={image} alt="" className="w-12 h-12 object-contain rounded-lg border border-gray-100 flex-shrink-0 bg-white" />
            ) : (
              <span className="w-12 h-12 flex items-center justify-center rounded-lg border border-dashed border-gray-200 text-gray-300 flex-shrink-0">
                <FiImage className="w-5 h-5" aria-hidden />
              </span>
            )}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input aria-label={t('supplements.productName')} placeholder={t('supplements.productName')} value={product.name} onChange={(e) => onChange({ ...product, name: e.target.value })} className={smallInput} />
              <input aria-label={t('supplements.imageUrl')} placeholder={t('supplements.imageUrl')} value={product.imageUrl} onChange={(e) => onChange({ ...product, imageUrl: e.target.value })} className={smallInput} inputMode="url" />
              <div>
                <input
                  aria-label={t('supplements.productUrl')}
                  placeholder={t('supplements.productUrl')}
                  value={product.productUrl}
                  onChange={(e) => onChange({ ...product, productUrl: e.target.value })}
                  className={`${smallInput} ${badLink ? '!border-red-400' : ''}`}
                  inputMode="url"
                  aria-invalid={badLink || undefined}
                />
                {badLink && <p className="text-xs text-red-600 mt-1">{t('supplements.invalidUrl')}</p>}
              </div>
            </div>
            <button type="button" onClick={onRemove} className="self-start p-2 text-red-400 hover:text-red-600" aria-label={t('supplements.removeProduct')}>
              <FiTrash2 className="w-4 h-4" aria-hidden />
            </button>
          </div>
        </>
      )}
    </Sortable>
  );
};

const CategoryBlock = ({ category, onChange, onRemove }: { category: CatalogCategory; onChange: (category: CatalogCategory) => void; onRemove: () => void }) => {
  const { t } = useTranslation('admin');
  const sensors = useDragSensors();
  const [open, setOpen] = useState(true);
  return (
    <Sortable id={category.key} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {(handle) => (
        <>
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-3">
            <DragHandle handle={handle} />
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? t('actions.collapse') : t('actions.expand')} className="text-gray-500 hover:text-gray-900">
              <FiChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            <input
              aria-label={t('supplements.categoryName')}
              placeholder={t('supplements.categoryName')}
              value={category.name}
              onChange={(e) => onChange({ ...category, name: e.target.value })}
              className="flex-1 min-w-0 font-semibold text-gray-900 bg-transparent border-0 outline-none focus:ring-0 p-0"
            />
            <span className="text-xs text-gray-400 whitespace-nowrap">{t('supplements.productCount', { count: category.products.length })}</span>
            <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600" aria-label={t('supplements.removeCategory')}>
              <FiTrash2 className="w-4 h-4" aria-hidden />
            </button>
          </div>
          {open && (
            <div className="p-4 space-y-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => onChange({ ...category, products: reorder(category.products, event) })}>
                <SortableContext items={category.products.map((p) => p.key)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {category.products.map((product) => (
                      <ProductRow
                        key={product.key}
                        product={product}
                        onChange={(updated) => onChange({ ...category, products: category.products.map((p) => (p.key === product.key ? updated : p)) })}
                        onRemove={() => onChange({ ...category, products: category.products.filter((p) => p.key !== product.key) })}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <button
                type="button"
                onClick={() => onChange({ ...category, products: [...category.products, emptyProduct()] })}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mt-2"
              >
                <FiPlus className="w-4 h-4" aria-hidden />
                {t('supplements.addProduct')}
              </button>
            </div>
          )}
        </>
      )}
    </Sortable>
  );
};

const CatalogEditor = ({ initial }: { initial: CatalogCategory[] }) => {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const sensors = useDragSensors();
  const [categories, setCategories] = useState(initial);

  const save = useMutation({
    mutationFn: () =>
      adminApi.post('/integration/admin/products', {
        categories: categories.map((c) => ({
          name: c.name.trim(),
          products: c.products.map((p) => ({ name: p.name.trim(), imageUrl: p.imageUrl.trim(), productUrl: p.productUrl.trim() })),
        })),
      }),
    onSuccess: () => {
      toast.success(t('supplements.saved'));
      queryClient.invalidateQueries({ queryKey: adminKeys.catalog });
      queryClient.invalidateQueries({ queryKey: ['client', 'products'] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const submit = () => {
    if (!catalogIsValid(categories)) {
      toast.error(t('supplements.missingFields'));
      return;
    }
    save.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => setCategories((list) => [...list, { key: newKey(), name: '', products: [emptyProduct()] }])} icon={<FiPlus className="w-4 h-4" aria-hidden />}>
          {t('supplements.addCategory')}
        </Button>
        <Button onClick={submit} loading={save.isPending} className="ml-auto" icon={<FiSave className="w-4 h-4" aria-hidden />}>
          {t('supplements.save')}
        </Button>
      </div>

      {categories.length === 0 && <EmptyState title={t('supplements.emptyTitle')} message={t('supplements.emptyMessage')} />}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => setCategories((list) => reorder(list, event))}>
        <SortableContext items={categories.map((c) => c.key)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {categories.map((category) => (
              <CategoryBlock
                key={category.key}
                category={category}
                onChange={(updated) => setCategories((list) => list.map((c) => (c.key === category.key ? updated : c)))}
                onRemove={() => setCategories((list) => list.filter((c) => c.key !== category.key))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

/** The supplements catalog the clients see in "More". */
const SupplementsPage = () => {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const catalog = useQuery({
    queryKey: adminKeys.catalog,
    queryFn: ({ signal }) => adminApi.get<{ categories: ServerCategory[] }>('/integration/admin/products', signal).then((d) => toDraft(d.categories)),
    staleTime: Infinity,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t('supplements.title')}</h2>
        <p className="text-sm text-gray-500">{t('supplements.hint')}</p>
      </div>
      {catalog.isPending ? (
        <LoadingState />
      ) : catalog.isError ? (
        <ErrorState message={errorMessage(catalog.error)} onRetry={() => catalog.refetch()} />
      ) : (
        <CatalogEditor initial={catalog.data} />
      )}
    </div>
  );
};

export default SupplementsPage;
