import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { currentLanguage, type Language } from '../../i18n';
import { formatDate } from '../../lib/format';
import { usePageMeta } from '../../lib/usePageMeta';
import { renderInline } from './inline';
import type { Block, LegalDoc, Tone } from './types';

const TONES: Record<Tone, string> = {
  gray: 'bg-gray-50 border-gray-200',
  blue: 'bg-blue-50 border-blue-200',
  green: 'bg-green-50 border-green-200',
  amber: 'bg-amber-50 border-amber-200',
  red: 'bg-red-50 border-red-200',
  purple: 'bg-purple-50 border-purple-200',
};

function BlockView({ block }: { block: Block }) {
  if ('p' in block) return <p className={`leading-relaxed ${block.muted ? 'text-gray-600' : 'text-gray-800'}`}>{renderInline(block.p)}</p>;
  if ('h3' in block) return <h3 className="text-lg font-semibold text-gray-900 pt-2">{block.h3}</h3>;
  if ('h4' in block) return <h4 className="font-semibold text-gray-900 pt-1">{block.h4}</h4>;
  if ('list' in block) {
    const ListTag = block.ordered ? 'ol' : 'ul';
    return (
      <ListTag className={`space-y-1.5 pl-6 text-gray-800 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
        {block.list.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ListTag>
    );
  }
  if ('table' in block) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              {block.table.head.map((cell) => (
                <th key={cell} scope="col" className="border border-gray-300 px-4 py-2 text-left font-semibold">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.table.rows.map((row, i) => (
              <tr key={i} className={i % 2 ? 'bg-gray-50' : undefined}>
                {row.map((cell, j) => (
                  <td key={j} className={`border border-gray-300 px-4 py-2 align-top ${j === 0 && block.table.head[0] === 'Cookie' ? 'font-mono text-xs' : ''}`}>
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if ('box' in block) {
    return (
      <div className={`border rounded-lg p-5 space-y-3 ${TONES[block.tone ?? 'gray']}`}>
        {block.title && <p className="font-semibold text-gray-900">{block.title}</p>}
        <Blocks blocks={block.box} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {block.grid.map((item) => (
        <div key={item.title} className={`border rounded-lg p-4 space-y-2 ${TONES[item.tone ?? 'gray']}`}>
          <h3 className="font-semibold text-gray-900">{item.title}</h3>
          <Blocks blocks={item.blocks} />
        </div>
      ))}
    </div>
  );
}

const Blocks = ({ blocks }: { blocks: Block[] }) => (
  <>
    {blocks.map((block, i) => (
      <Fragment key={i}>
        <BlockView block={block} />
      </Fragment>
    ))}
  </>
);

/** A legal page in the active language (Italian is the binding text). */
const LegalPage = ({ docs, path }: { docs: Record<Language, LegalDoc>; path: string }) => {
  const { t } = useTranslation('common');
  const doc = docs[currentLanguage()];
  usePageMeta({ title: `${doc.title} | Personal Trainer Joshua`, description: doc.subtitle, path });

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-28 sm:pt-40 px-6 lg:px-16 pb-16">
        <article className="max-w-4xl mx-auto">
          <header className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{doc.title}</h1>
            <p className="text-gray-600 text-lg">{doc.subtitle}</p>
            <p className="text-sm text-gray-500 mt-2">{t('legal.updated', { date: formatDate(doc.updated, 'long') })}</p>
            {doc.notice && <p className="mt-4 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-4 py-3">{doc.notice}</p>}
          </header>
          <div className="space-y-10">
            {doc.sections.map((section) => (
              <section key={section.title} className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
                <Blocks blocks={section.blocks} />
              </section>
            ))}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPage;
