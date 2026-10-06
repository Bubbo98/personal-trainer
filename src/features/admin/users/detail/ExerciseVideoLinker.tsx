import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiCheck, FiChevronDown, FiInfo, FiLink, FiPlus, FiX } from 'react-icons/fi';
import Button from '../../../../components/ui/Button';
import { useConfirm } from '../../../../components/ui/ConfirmDialog';
import Spinner from '../../../../components/ui/Spinner';
import { ErrorState } from '../../../../components/ui/States';
import { useToast } from '../../../../components/ui/Toast';
import { adminApi } from '../../../../lib/api';
import { useErrorMessage } from '../../../../lib/errors';
import { numberMatchScore } from '../../../../lib/search';
import { adminKeys, useLibrary, useLinks } from '../../queries';
import { STRETCHING_GROUP, TECHNIQUES_GROUP, type AdminVideo } from '../../types';
import {
  addItem,
  confirmAll,
  confirmItem,
  exerciseStatus,
  hasProposals,
  initialDraft,
  removeItem,
  removedCount,
  slotKey,
  toggleTechnique,
  toPayload,
  videosInDay,
  type Draft,
  type DraftItem,
  type LinkDay,
  type LinkVideo,
  type Slot,
} from './linker';

const CHIP_STYLES: Record<DraftItem['status'], string> = {
  saved: 'bg-gray-100 border-gray-300 text-gray-800',
  manual: 'bg-gray-100 border-gray-300 text-gray-800',
  sure: 'bg-green-50 border-green-300 text-green-800',
  maybe: 'bg-amber-50 border-amber-300 text-amber-800',
};

const STATUS_DOT = { ok: 'bg-green-500', check: 'bg-amber-400', missing: 'bg-red-500' } as const;

/** Library titles matching a query (numeric queries ranked by machine number). */
function searchLibrary(library: AdminVideo[], query: string, exclude: Set<number>, filter?: (v: AdminVideo) => boolean) {
  const term = query.trim().toLowerCase();
  let list = library.filter((v) => !exclude.has(v.id) && (!filter || filter(v)) && (!term || v.title.toLowerCase().includes(term)));
  if (/^\d+$/.test(term)) list = [...list].sort((a, b) => numberMatchScore(a.title, term) - numberMatchScore(b.title, term));
  return list;
}

const Option = ({ title, tag, onClick }: { title: string; tag: string; onClick: () => void }) => (
  <button type="button" onClick={onClick} className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-white flex justify-between gap-2">
    <span className="truncate">{title}</span>
    <span className="text-[10px] uppercase text-gray-400 flex-shrink-0">{tag}</span>
  </button>
);

const Editor = ({ userId, days, library, onSaved }: { userId: number; days: LinkDay[]; library: AdminVideo[]; onSaved?: () => void }) => {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const confirm = useConfirm();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [draft, setDraftState] = useState<Draft>(() => initialDraft(days));
  // Unsaved suggestions are something to save
  const [dirty, setDirty] = useState(() => hasProposals(initialDraft(days)));
  const [expanded, setExpanded] = useState(true);
  const [picker, setPicker] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [stretchingOnly, setStretchingOnly] = useState(true);
  const [techFor, setTechFor] = useState<string | null>(null);
  const [techQuery, setTechQuery] = useState('');

  const update = (next: Draft) => {
    setDraftState(next);
    setDirty(true);
  };
  const closePicker = () => {
    setPicker(null);
    setQuery('');
  };

  const exercises = useMemo(() => days.flatMap((d) => d.exercises), [days]);
  const techniques = useMemo(() => library.filter((v) => v.muscleGroup === TECHNIQUES_GROUP), [library]);
  const counts = useMemo(() => {
    const c = { ok: 0, check: 0, missing: 0 };
    for (const ex of exercises) c[exerciseStatus(draft.exercises[ex.id] ?? [])]++;
    return c;
  }, [exercises, draft]);
  const proposals = hasProposals(draft);
  const removing = removedCount(days, draft);

  const save = useMutation({
    mutationFn: () => adminApi.put<{ addedVideos?: number; removedVideos?: number }>(`/workout/admin/links/${userId}`, toPayload(days, draft)),
    onSuccess: (result) => {
      const details = [
        result?.addedVideos ? t('linker.added', { count: result.addedVideos }) : null,
        result?.removedVideos ? t('linker.removed', { count: result.removedVideos }) : null,
      ].filter(Boolean);
      toast.success(details.length ? t('linker.savedDetails', { details: details.join(', ') }) : t('linker.saved'));
      queryClient.invalidateQueries({ queryKey: adminKeys.links(userId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.days(userId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.userVideos(userId) });
      onSaved?.();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const submit = async () => {
    if (
      removing > 0 &&
      !(await confirm({ title: t('linker.removeConfirmTitle'), message: t('linker.removeConfirmMessage', { count: removing }), danger: true, confirmLabel: t('actions.confirm') }))
    )
      return;
    save.mutate();
  };

  const chip = (slot: Slot, item: DraftItem, index: number) => {
    const key = `${slotKey(slot)}-${index}`;
    return (
      <li key={`${item.videoId}-${index}`} className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full border text-xs ${CHIP_STYLES[item.status]}`}>
        <span className="max-w-[260px] truncate">{item.title}</span>
        {item.fromLibrary && !item.assignmentId && <span className="text-[10px] font-semibold uppercase opacity-70">· {t('linker.fromLibrary')}</span>}
        {item.techniques.map((tech) => (
          <span key={tech.id} className="bg-blue-100 text-blue-700 rounded px-1.5 text-[10px] font-medium max-w-[120px] truncate">
            {tech.title}
          </span>
        ))}
        {item.status === 'maybe' && (
          <button type="button" onClick={() => update(confirmItem(draft, slot, index))} aria-label={t('linker.confirmLink')} title={t('linker.confirmLink')} className="p-0.5 rounded-full hover:bg-amber-200">
            <FiCheck className="w-3.5 h-3.5" aria-hidden />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setTechFor(techFor === key ? null : key);
            setTechQuery('');
            closePicker();
          }}
          aria-pressed={techFor === key}
          aria-label={t('linker.techniquesFor', { title: item.title })}
          title={t('linker.techniques')}
          className={`p-0.5 rounded-full ${techFor === key ? 'bg-blue-200 text-blue-800' : 'hover:bg-black/10'}`}
        >
          <FiInfo className="w-3.5 h-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => {
            update(removeItem(draft, days, slot, index));
            setTechFor(null);
          }}
          aria-label={`${t('actions.remove')}: ${item.title}`}
          className="p-0.5 rounded-full hover:bg-black/10"
        >
          <FiX className="w-3.5 h-3.5" aria-hidden />
        </button>
      </li>
    );
  };

  const techniquePanel = (slot: Slot) => {
    const prefix = `${slotKey(slot)}-`;
    if (!techFor?.startsWith(prefix)) return null;
    const index = Number(techFor.slice(prefix.length));
    const item = (slot.kind === 'exercise' ? draft.exercises[slot.id] : draft.extras[slot.id])?.[index];
    if (!item) return null;
    const term = techQuery.trim().toLowerCase();
    const options = techniques.filter((v) => !term || v.title.toLowerCase().includes(term));
    return (
      <div className="mt-2 border border-blue-200 rounded-lg p-2 bg-blue-50/40">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-gray-600">{t('linker.techniquesFor', { title: item.title })}</span>
          <button type="button" onClick={() => setTechFor(null)} aria-label={t('actions.cancel')} className="text-gray-400 hover:text-gray-600">
            <FiX className="w-4 h-4" aria-hidden />
          </button>
        </div>
        <input
          autoFocus
          type="search"
          value={techQuery}
          onChange={(e) => setTechQuery(e.target.value)}
          placeholder={t('linker.searchTechnique')}
          aria-label={t('linker.searchTechnique')}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
          {options.length === 0 ? (
            <p className="px-2 py-1 text-xs text-gray-400">{techniques.length === 0 ? t('linker.noTechniqueVideos') : t('linker.noResults')}</p>
          ) : (
            options.map((tech) => {
              const active = item.techniques.some((x) => x.id === tech.id);
              return (
                <button
                  key={tech.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update(toggleTechnique(draft, slot, index, { id: tech.id, title: tech.title }))}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center justify-between ${active ? 'bg-blue-100 text-blue-800 font-semibold' : 'hover:bg-white text-gray-700'}`}
                >
                  <span>{tech.title}</span>
                  {active && <FiCheck className="w-3 h-3 text-blue-600" aria-hidden />}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const addButton = (key: string, label: string) => (
    <li>
      <button
        type="button"
        aria-expanded={picker === key}
        onClick={() => {
          setPicker(picker === key ? null : key);
          setQuery('');
          setTechFor(null);
        }}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-xs text-gray-500 hover:text-gray-900 hover:border-gray-500"
      >
        <FiPlus className="w-3.5 h-3.5" aria-hidden /> {label}
      </button>
    </li>
  );

  const searchBox = (placeholder: string) => (
    <input
      autoFocus
      type="search"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
    />
  );

  const pick = (slot: Slot, video: LinkVideo, fromLibrary: boolean) => {
    update(addItem(draft, slot, video, fromLibrary));
    closePicker();
  };

  return (
    <section className="bg-white border border-gray-200 rounded-xl mb-6 overflow-hidden">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 text-left"
      >
        <h3 className="flex items-center gap-2 font-semibold text-gray-900">
          <FiLink className="w-4 h-4 text-gray-500" aria-hidden />
          {t('linker.title')}
        </h3>
        <span className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-800">{t('linker.ok', { count: counts.ok })}</span>
          {counts.check > 0 && <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800">{t('linker.check', { count: counts.check })}</span>}
          {counts.missing > 0 && <span className="px-2 py-1 rounded-full bg-red-100 text-red-800">{t('linker.missing', { count: counts.missing })}</span>}
          {dirty && <span className="px-2 py-1 rounded-full bg-gray-900 text-white">{t('linker.toSave')}</span>}
          <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-200">
          {proposals && (
            <div className="px-4 py-2.5 bg-blue-50 text-blue-800 text-sm flex flex-wrap items-center justify-between gap-2">
              <span>{t('linker.proposalsBanner')}</span>
              <Button size="sm" variant="secondary" onClick={() => update(confirmAll(draft))} icon={<FiCheck className="w-3.5 h-3.5" aria-hidden />}>
                {t('linker.confirmAll')}
              </Button>
            </div>
          )}

          <div className="p-4 space-y-5">
            {days.map((day) => {
              const extraSlot: Slot = { kind: 'extra', id: day.dayNumber };
              const extraKey = slotKey(extraSlot);
              return (
                <div key={day.dayNumber}>
                  <h4 className="text-sm font-bold text-gray-900 mb-2">{day.dayName}</h4>
                  <div className="space-y-2">
                    {day.exercises.map((ex) => {
                      const slot: Slot = { kind: 'exercise', id: ex.id };
                      const items = draft.exercises[ex.id] ?? [];
                      const status = exerciseStatus(items);
                      const open = picker === slotKey(slot);
                      const term = query.trim().toLowerCase();
                      const fromDay = open ? (draft.extras[day.dayNumber] ?? []).filter((v) => !term || v.title.toLowerCase().includes(term)) : [];
                      const fromLibrary = open && term ? searchLibrary(library, query, videosInDay(draft, day)).slice(0, 8) : [];
                      return (
                        <div key={ex.id} className="border border-gray-200 rounded-lg p-3 flex items-start gap-2">
                          <span className={`mt-1.5 flex-shrink-0 w-2.5 h-2.5 rounded-full ${STATUS_DOT[status]}`} title={t(`linker.${status}`, { count: 1 })} aria-hidden />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 leading-snug">{ex.name}</p>
                            {(ex.sets || ex.reps) && <p className="text-xs text-gray-400">{[ex.sets, ex.reps].filter(Boolean).join(' × ')}</p>}
                            <ul className="flex flex-wrap gap-1.5 mt-2">
                              {items.map((item, i) => chip(slot, item, i))}
                              {addButton(slotKey(slot), t('linker.addVideo'))}
                            </ul>
                            {techniquePanel(slot)}
                            {open && (
                              <div className="mt-2 border border-gray-200 rounded-lg p-2 bg-gray-50">
                                {searchBox(t('linker.searchVideo'))}
                                <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
                                  {fromDay.map((v) => (
                                    <Option key={`d-${v.videoId}`} title={v.title} tag={t('linker.inDay')} onClick={() => pick(slot, v, false)} />
                                  ))}
                                  {fromLibrary.map((v) => (
                                    <Option
                                      key={`l-${v.id}`}
                                      title={v.title}
                                      tag={t('linker.fromLibrary')}
                                      onClick={() => pick(slot, { assignmentId: null, videoId: v.id, title: v.title, techniques: [] }, true)}
                                    />
                                  ))}
                                  {fromDay.length === 0 && fromLibrary.length === 0 && (
                                    <p className="px-3 py-1.5 text-xs text-gray-400">{query ? t('linker.noVideoFound') : t('linker.typeToSearch')}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2 border border-dashed border-gray-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2">
                      {day.exercises.length > 0 ? t('linker.extras') : t('linker.dayVideos')}
                      <span className="font-normal text-gray-400"> · {t('linker.extrasHint')}</span>
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {(draft.extras[day.dayNumber] ?? []).map((item, i) => chip(extraSlot, item, i))}
                      {addButton(extraKey, t('linker.addExtra'))}
                    </ul>
                    {techniquePanel(extraSlot)}
                    {picker === extraKey && (
                      <div className="mt-2 border border-gray-200 rounded-lg p-2 bg-gray-50">
                        <div className="flex gap-1.5 mb-2" role="group">
                          {[true, false].map((only) => (
                            <button
                              key={String(only)}
                              type="button"
                              aria-pressed={stretchingOnly === only}
                              onClick={() => setStretchingOnly(only)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${stretchingOnly === only ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
                            >
                              {only ? t('linker.stretching') : t('linker.wholeLibrary')}
                            </button>
                          ))}
                        </div>
                        {searchBox(stretchingOnly ? t('linker.searchStretching') : t('linker.searchVideo'))}
                        <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
                          {(() => {
                            const options = searchLibrary(library, query, videosInDay(draft, day), stretchingOnly ? (v) => v.muscleGroup === STRETCHING_GROUP : undefined).slice(
                              0,
                              stretchingOnly && !query.trim() ? 50 : 8,
                            );
                            if (options.length === 0 || (!stretchingOnly && !query.trim())) {
                              return <p className="px-3 py-1.5 text-xs text-gray-400">{query || stretchingOnly ? t('linker.noVideoFound') : t('linker.typeToSearch')}</p>;
                            }
                            return options.map((v) => (
                              <Option
                                key={`x-${v.id}`}
                                title={v.title}
                                tag={v.muscleGroup ? t(`muscleGroups.${v.muscleGroup as 'Stretching'}`, { defaultValue: v.muscleGroup }) : t('linker.fromLibrary')}
                                onClick={() => pick(extraSlot, { assignmentId: null, videoId: v.id, title: v.title, dayNumber: day.dayNumber, techniques: [] }, true)}
                              />
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 px-4 py-3 bg-white border-t border-gray-200">
            {removing > 0 && <span className="text-xs text-red-600">{t('linker.willRemove', { count: removing })}</span>}
            {proposals && (
              <Button variant="secondary" onClick={() => update(confirmAll(draft))} icon={<FiCheck className="w-4 h-4" aria-hidden />}>
                {t('linker.confirmAll')}
              </Button>
            )}
            <Button onClick={submit} loading={save.isPending} disabled={!dirty}>
              {t('linker.save')}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};

/** Plan exercises ↔ training-day videos, with automatic proposals to review. */
const ExerciseVideoLinker = ({ userId, onSaved }: { userId: number; onSaved?: () => void }) => {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const links = useLinks(userId);
  const library = useLibrary();

  if (links.isPending || library.isPending) {
    return (
      <p className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex items-center gap-2 text-sm text-gray-500" role="status">
        <Spinner size="sm" /> {t('linker.loading')}
      </p>
    );
  }
  if (links.isError) return <ErrorState message={errorMessage(links.error)} onRetry={() => links.refetch()} />;
  if (!links.data.some((d) => d.exercises.length > 0)) {
    return (
      <p className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-sm text-gray-500 flex items-start gap-2">
        <FiLink className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
        {t('linker.noPlan')}
      </p>
    );
  }
  // A new load (after a save) restarts the draft from the server
  return <Editor key={links.dataUpdatedAt} userId={userId} days={links.data} library={library.data ?? []} onSaved={onSaved} />;
};

export default ExerciseVideoLinker;
