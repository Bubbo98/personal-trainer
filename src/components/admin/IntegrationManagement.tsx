import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiTrash2, FiSave, FiChevronDown, FiChevronUp, FiMenu, FiImage } from 'react-icons/fi';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { apiCall } from '../../utils/adminUtils';

interface Product {
  _key: string;
  id?: number;
  name: string;
  imageUrl: string;
  productUrl: string;
}

interface Category {
  _key: string;
  id?: number;
  name: string;
  products: Product[];
}

let keySeq = 0;
const genKey = (): string => `k-${Date.now()}-${keySeq++}`;

const EMPTY_PRODUCT = (): Product => ({ _key: genKey(), name: '', imageUrl: '', productUrl: '' });

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';

// Sortable product row — drag handle reorders the product within its category
const SortableProductRow: React.FC<{
  product: Product;
  onChange: (field: keyof Product, value: string) => void;
  onRemove: () => void;
}> = ({ product, onChange, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product._key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2">
      <button
        {...attributes}
        {...listeners}
        type="button"
        style={{ touchAction: 'none' }}
        className="flex-shrink-0 mt-2 sm:mt-3 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        {React.createElement(FiMenu as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
      </button>

      <div className="flex-1 border sm:border-0 border-gray-100 rounded-lg sm:rounded-none p-3 sm:p-0 flex flex-col sm:flex-row sm:items-center gap-2">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className="w-12 h-12 object-contain rounded-lg border border-gray-100 flex-shrink-0 bg-white" />
        ) : (
          <div className="w-12 h-12 flex items-center justify-center rounded-lg border border-dashed border-gray-200 text-gray-300 flex-shrink-0">
            {React.createElement(FiImage as React.ComponentType<{ className?: string }>, { className: 'w-5 h-5' })}
          </div>
        )}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="block sm:hidden text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Nome prodotto</label>
            <input value={product.name} onChange={(e) => onChange('name', e.target.value)} placeholder="Nome prodotto" className={inputClass} />
          </div>
          <div>
            <label className="block sm:hidden text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">URL immagine</label>
            <input value={product.imageUrl} onChange={(e) => onChange('imageUrl', e.target.value)} placeholder="URL immagine" className={inputClass} />
          </div>
          <div>
            <label className="block sm:hidden text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Link prodotto</label>
            <input value={product.productUrl} onChange={(e) => onChange('productUrl', e.target.value)} placeholder="Link prodotto (acquisto)" className={inputClass} />
          </div>
        </div>
        <button onClick={onRemove} className="flex-shrink-0 self-start sm:self-center flex items-center justify-center p-2 text-red-400 hover:text-red-600 transition-colors">
          {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
        </button>
      </div>
    </div>
  );
};

const IntegrationManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [successMsg, setSuccessMsg] = useState('');

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiCall('/integration/admin/products');
      const loaded: { id: number; name: string; products: { id: number; name: string; imageUrl: string | null; productUrl: string }[] }[] =
        res.data?.categories || [];

      const withKeys: Category[] = loaded.map((cat) => ({
        _key: genKey(),
        id: cat.id,
        name: cat.name,
        products: cat.products.map((p) => ({
          _key: genKey(),
          id: p.id,
          name: p.name,
          imageUrl: p.imageUrl || '',
          productUrl: p.productUrl,
        })),
      }));

      setCategories(withKeys);
      const exp: Record<string, boolean> = {};
      withKeys.forEach((c) => (exp[c._key] = true));
      setExpandedCategories(exp);
    } catch (err) {
      console.error('Failed to load integration catalog:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiCall('/integration/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          categories: categories.map((c) => ({
            name: c.name,
            products: c.products.map((p) => ({ name: p.name, imageUrl: p.imageUrl, productUrl: p.productUrl })),
          })),
        }),
      });
      showSuccess('Catalogo salvato con successo!');
      loadCatalog();
    } catch (err: any) {
      alert(err.message || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    const newCat: Category = { _key: genKey(), name: '', products: [EMPTY_PRODUCT()] };
    setCategories((prev) => [...prev, newCat]);
    setExpandedCategories((prev) => ({ ...prev, [newCat._key]: true }));
  };

  const removeCategory = (catKey: string) => {
    setCategories((prev) => prev.filter((c) => c._key !== catKey));
  };

  const updateCategoryName = (catKey: string, name: string) => {
    setCategories((prev) => prev.map((c) => (c._key === catKey ? { ...c, name } : c)));
  };

  const addProduct = (catKey: string) => {
    setCategories((prev) =>
      prev.map((c) => (c._key === catKey ? { ...c, products: [...c.products, EMPTY_PRODUCT()] } : c))
    );
  };

  const removeProduct = (catKey: string, productKey: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c._key === catKey ? { ...c, products: c.products.filter((p) => p._key !== productKey) } : c
      )
    );
  };

  const updateProduct = (catKey: string, productKey: string, field: keyof Product, value: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c._key === catKey
          ? { ...c, products: c.products.map((p) => (p._key === productKey ? { ...p, [field]: value } : p)) }
          : c
      )
    );
  };

  // ── Drag & drop ─────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCategories((prev) => {
      const oldIndex = prev.findIndex((c) => c._key === active.id);
      const newIndex = prev.findIndex((c) => c._key === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleProductDragEnd = (event: DragEndEvent, catKey: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCategories((prev) =>
      prev.map((c) => {
        if (c._key !== catKey) return c;
        const oldIndex = c.products.findIndex((p) => p._key === active.id);
        const newIndex = c.products.findIndex((p) => p._key === over.id);
        if (oldIndex === -1 || newIndex === -1) return c;
        return { ...c, products: arrayMove(c.products, oldIndex, newIndex) };
      })
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          {successMsg}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={addCategory}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm"
        >
          {React.createElement(FiPlus as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
          Aggiungi Categoria
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm disabled:opacity-50 ml-auto"
        >
          {React.createElement(FiSave as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
          {saving ? 'Salvataggio...' : 'Salva Catalogo'}
        </button>
      </div>

      {categories.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          <p className="font-medium mb-1">Nessuna categoria</p>
          <p className="text-sm">Aggiungi la prima categoria per iniziare a popolare il catalogo.</p>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
        <SortableContext items={categories.map((c) => c._key)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {categories.map((category) => (
              <SortableCategoryBlock
                key={category._key}
                category={category}
                expanded={expandedCategories[category._key] !== false}
                onToggleExpand={() =>
                  setExpandedCategories((prev) => ({ ...prev, [category._key]: !prev[category._key] }))
                }
                onNameChange={(name) => updateCategoryName(category._key, name)}
                onRemove={() => removeCategory(category._key)}
                onAddProduct={() => addProduct(category._key)}
                sensors={sensors}
                onProductDragEnd={(event) => handleProductDragEnd(event, category._key)}
                onProductChange={(productKey, field, value) => updateProduct(category._key, productKey, field, value)}
                onProductRemove={(productKey) => removeProduct(category._key, productKey)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

// Sortable category block — drag handle reorders the category itself
const SortableCategoryBlock: React.FC<{
  category: Category;
  expanded: boolean;
  onToggleExpand: () => void;
  onNameChange: (name: string) => void;
  onRemove: () => void;
  onAddProduct: () => void;
  sensors: ReturnType<typeof useSensors>;
  onProductDragEnd: (event: DragEndEvent) => void;
  onProductChange: (productKey: string, field: keyof Product, value: string) => void;
  onProductRemove: (productKey: string) => void;
}> = ({ category, expanded, onToggleExpand, onNameChange, onRemove, onAddProduct, sensors, onProductDragEnd, onProductChange, onProductRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category._key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-3 bg-gray-50 px-4 py-3">
        <button
          {...attributes}
          {...listeners}
          type="button"
          style={{ touchAction: 'none' }}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          {React.createElement(FiMenu as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
        </button>
        <button onClick={onToggleExpand} className="text-gray-500 hover:text-gray-900 transition-colors">
          {expanded
            ? React.createElement(FiChevronUp as React.ComponentType<{ className?: string }>, { className: 'w-5 h-5' })
            : React.createElement(FiChevronDown as React.ComponentType<{ className?: string }>, { className: 'w-5 h-5' })}
        </button>
        <input
          value={category.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Nome categoria"
          className="flex-1 font-semibold text-gray-900 bg-transparent border-0 outline-none focus:ring-0 p-0"
        />
        <span className="text-xs text-gray-400">{category.products.length} prodotti</span>
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 transition-colors">
          {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onProductDragEnd}>
            <SortableContext items={category.products.map((p) => p._key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {category.products.map((product) => (
                  <SortableProductRow
                    key={product._key}
                    product={product}
                    onChange={(field, value) => onProductChange(product._key, field, value)}
                    onRemove={() => onProductRemove(product._key)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <button
            onClick={onAddProduct}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mt-2"
          >
            {React.createElement(FiPlus as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
            Aggiungi prodotto
          </button>
        </div>
      )}
    </div>
  );
};

export default IntegrationManagement;
