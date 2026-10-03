import React, { useState, useEffect, useCallback } from 'react';
import { FiShoppingBag, FiExternalLink } from 'react-icons/fi';
import { apiCall } from '../../utils/dashboardUtils';

interface Product {
  id: number;
  name: string;
  imageUrl: string | null;
  productUrl: string;
}

interface Category {
  id: number;
  name: string;
  products: Product[];
}

const IntegrazioneTab: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiCall('/integration/products');
      setCategories(res.data?.categories || []);
    } catch (err) {
      console.error('Failed to load integration catalog:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const allProducts = categories.flatMap((cat) =>
    cat.products.map((p) => ({ ...p, categoryId: cat.id, categoryName: cat.name }))
  );

  const visibleProducts = selectedCategory
    ? allProducts.filter((p) => p.categoryId === selectedCategory)
    : allProducts;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-9 w-28 bg-gray-200 rounded-full" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
              <div className="aspect-square bg-gray-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-9 bg-gray-200 rounded-lg mt-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        {React.createElement(FiShoppingBag as React.ComponentType<{ className?: string }>, { className: 'w-8 h-8 text-gray-900' })}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Integrazione</h2>
          <p className="text-gray-600">Gli integratori che consiglio, divisi per categoria</p>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          <p className="font-medium mb-1">Nessun prodotto disponibile</p>
          <p className="text-sm">Il tuo personal trainer non ha ancora aggiunto prodotti consigliati.</p>
        </div>
      ) : (
        <>
          {/* Category pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Tutti ({allProducts.length})
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category.name} ({category.products.length})
              </button>
            ))}
          </div>

          {/* Products grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {visibleProducts.map((product) => (
              <a
                key={product.id}
                href={product.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="relative aspect-square bg-gray-100">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-contain p-3"
                    />
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                  </h3>
                  {selectedCategory === null && (
                    <p className="text-xs text-gray-500 font-medium mt-1">{product.categoryName}</p>
                  )}
                  <div className="mt-3 flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium">
                    {React.createElement(FiExternalLink as React.ComponentType<{ className?: string }>, { className: 'w-4 h-4' })}
                    Acquista
                  </div>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default IntegrazioneTab;
