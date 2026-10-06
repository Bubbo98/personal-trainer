import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FiAlertTriangle, FiCheck, FiChevronDown, FiEdit2, FiInfo, FiLink, FiPlus, FiScissors, FiTrash2, FiX } from 'react-icons/fi';
import Button from '../../../../components/ui/Button';
import { useConfirm } from '../../../../components/ui/ConfirmDialog';
import { inputClass } from '../../../../components/ui/Field';
import Modal from '../../../../components/ui/Modal';
import { ErrorState, LoadingState } from '../../../../components/ui/States';
import { useToast } from '../../../../components/ui/Toast';
import { adminApi } from '../../../../lib/api';
import { useErrorMessage } from '../../../../lib/errors';
import { formatDuration } from '../../../../lib/format';
import { availableVideos } from './availableVideos';
import { groupDayVideos } from '../../../dashboard/workout';
import { useDragSensors } from '../../components/useDragSensors';
import { DragHandle, Sortable } from '../../components/sortable';
import { adminKeys, useLibrary, useTrainingDays } from '../../queries';
import { MUSCLE_GROUPS, STRETCHING_GROUP, TECHNIQUES_GROUP, VIDEO_CATEGORIES, type AdminVideo, type DayVideo, type TrainingDay } from '../../types';

interface VideoRowProps {
  video: DayVideo;
  techniques: AdminVideo[];
  selecting: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onRemove: () => void;
  onToggleTechnique: (technique: AdminVideo) => void;
}

const VideoRow = ({ video, techniques, selecting, selected, onToggleSelect, onRemove, onToggleTechnique }: VideoRowProps) => {
  const { t } = useTranslation('admin');
  const [panel, setPanel] = useState(false);
  const [search, setSearch] = useState('');
  const assigned = new Set(video.techniques.map((x) => x.id));
  const options = techniques.filter((x) => x.title.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <Sortable id={video.id} className={`bg-gray-50 border rounded-xl overflow-hidden ${selecting && selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
      {(handle) => (
        <>
          <div className="p-3 flex items-center gap-2">
            {selecting ? (
              <input
                type="checkbox"
                checked={selected}
                onChange={onToggleSelect}
                aria-label={t('days.select', { title: video.title })}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            ) : (
              <DragHandle handle={handle} />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{video.title}</p>
              <p className="text-xs text-gray-500">
                {t(`categories.${video.category as 'palestra'}`, { defaultValue: video.category })} • {formatDuration(video.duration)}
              </p>
              {video.techniques.length > 0 && !panel && (
                <ul className="flex flex-wrap gap-1 mt-1">
                  {video.techniques.map((tech) => (
                    <li key={tech.id} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 text-xs font-medium">
                      <FiInfo className="w-3 h-3" aria-hidden />
                      <span className="truncate max-w-[120px]">{tech.title}</span>
                      <button
                        type="button"
                        onClick={() => onToggleTechnique({ id: tech.id, title: tech.title } as AdminVideo)}
                        aria-label={t('days.removeTechnique', { title: tech.title })}
                        className="text-blue-400 hover:text-red-500"
                      >
                        <FiX className="w-3 h-3" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              aria-expanded={panel}
              onClick={() => {
                setPanel(!panel);
                setSearch('');
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${panel ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <FiInfo className="w-3 h-3" aria-hidden />
              {video.techniques.length ? t('days.techniqueCount', { count: video.techniques.length }) : t('days.technique')}
            </button>
            <button type="button" onClick={onRemove} aria-label={t('days.removeVideo')} className="p-2 text-red-600 hover:bg-red-50 rounded-xl">
              <FiTrash2 className="w-4 h-4" aria-hidden />
            </button>
          </div>
          {panel && (
            <div className="border-t border-gray-200 p-3 space-y-2 bg-white">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('days.addTechnique')}</p>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('days.searchTechnique')}
                aria-label={t('days.searchTechnique')}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="max-h-40 overflow-y-auto space-y-1">
                {options.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">{techniques.length === 0 ? t('days.noTechniques') : t('days.noResults')}</p>
                ) : (
                  options.map((tech) => (
                    <button
                      key={tech.id}
                      type="button"
                      aria-pressed={assigned.has(tech.id)}
                      onClick={() => onToggleTechnique(tech)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between ${assigned.has(tech.id) ? 'bg-blue-100 text-blue-800 font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      <span>{tech.title}</span>
                      {assigned.has(tech.id) && <FiCheck className="w-3 h-3 text-blue-600" aria-hidden />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Sortable>
  );
};

/**
 * Training days as plain video lists: order, groups (supersets), techniques.
 * Needed for clients whose plan has no parsed exercises.
 */
const TrainingDaysEditor = ({ userId, onChanged }: { userId: number; onChanged?: () => void }) => {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const confirm = useConfirm();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const sensors = useDragSensors();
  const days = useTrainingDays(userId);
  const library = useLibrary();
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  const [filters, setFilters] = useState({ search: '', category: '', muscleGroup: '' });
  const [selecting, setSelecting] = useState<{ dayId: number; ids: Set<number> } | null>(null);
  const [stretching, setStretching] = useState<{ dayId: number; name: string; ids: Set<number>; search: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const base = `/training-days/users/${userId}/training-days`;
  const key = adminKeys.days(userId);
  const techniques = useMemo(() => (library.data ?? []).filter((v) => v.muscleGroup === TECHNIQUES_GROUP), [library.data]);
  const stretchingVideos = useMemo(() => (library.data ?? []).filter((v) => v.muscleGroup === STRETCHING_GROUP), [library.data]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: adminKeys.links(userId) });
    queryClient.invalidateQueries({ queryKey: adminKeys.userVideos(userId) });
    onChanged?.();
  };

  /** Optimistic change: the cache updates now, the server follows; a failure reloads. */
  const optimistic = async (update: (days: TrainingDay[]) => TrainingDay[], request: () => Promise<unknown>) => {
    queryClient.setQueryData<TrainingDay[]>(key, (current) => (current ? update(current) : current));
    try {
      await request();
      await refresh();
    } catch (error) {
      toast.error(`${errorMessage(error)}\n${t('days.failed')}`);
      await refresh();
    }
  };

  /** Server-first change with a busy marker. */
  const run = async (marker: string, request: () => Promise<unknown>) => {
    setBusy(marker);
    try {
      await request();
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  if (days.isPending) return <LoadingState />;
  if (days.isError) return <ErrorState message={errorMessage(days.error)} onRetry={() => days.refetch()} />;

  const list = days.data;
  const nameOf = (day: TrainingDay) => day.dayName || t('days.dayFallback', { number: day.dayNumber });
  const mapDay = (dayId: number, fn: (day: TrainingDay) => TrainingDay) => (all: TrainingDay[]) => all.map((d) => (d.id === dayId ? fn(d) : d));

  const addDay = () =>
    run('add-day', async () => {
      const number = list.length ? Math.max(...list.map((d) => d.dayNumber)) + 1 : 1;
      const name = t('days.dayFallback', { number });
      const { id } = await adminApi.post<{ id: number }>(base, { dayNumber: number, dayName: name });
      setOpen((s) => new Set(s).add(id));
      if (stretchingVideos.length) setStretching({ dayId: id, name, ids: new Set(), search: '' });
    });

  const resetAll = async () => {
    if (!(await confirm({ title: t('days.resetTitle'), message: t('days.resetMessage'), danger: true, confirmLabel: t('days.resetAll') }))) return;
    run('reset', () => Promise.all(list.map((d) => adminApi.delete(`${base}/${d.id}`))));
  };

  const clearDay = async (day: TrainingDay) => {
    if (!(await confirm({ title: t('days.clearTitle', { name: nameOf(day) }), message: t('days.clearMessage'), danger: true, confirmLabel: t('actions.confirm') }))) return;
    run(`clear-${day.id}`, () => Promise.all(day.videos.map((v) => adminApi.delete(`${base}/${day.id}/videos/${v.id}`))));
  };

  const deleteDay = async (day: TrainingDay) => {
    if (!(await confirm({ title: t('days.deleteTitle', { name: nameOf(day) }), message: t('days.deleteMessage'), danger: true, confirmLabel: t('actions.delete') }))) return;
    optimistic((all) => all.filter((d) => d.id !== day.id), () => adminApi.delete(`${base}/${day.id}`));
  };

  const rename = (dayId: number, name: string) => {
    setRenaming(null);
    optimistic(mapDay(dayId, (d) => ({ ...d, dayName: name })), () => adminApi.put(`${base}/${dayId}`, { dayName: name }));
  };

  const reorder = (day: TrainingDay, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = day.videos.findIndex((v) => v.id === active.id);
    const to = day.videos.findIndex((v) => v.id === over.id);
    if (from === -1 || to === -1) return;
    const videos = arrayMove(day.videos, from, to);
    optimistic(mapDay(day.id, (d) => ({ ...d, videos })), () =>
      adminApi.put(`${base}/${day.id}/videos/reorder`, { videoOrders: videos.map((v, index) => ({ videoId: v.id, orderIndex: index })) }),
    );
  };

  const toggleTechnique = (day: TrainingDay, video: DayVideo, technique: AdminVideo) => {
    const has = video.techniques.some((x) => x.id === technique.id);
    optimistic(
      mapDay(day.id, (d) => ({
        ...d,
        videos: d.videos.map((v) =>
          v.id === video.id ? { ...v, techniques: has ? v.techniques.filter((x) => x.id !== technique.id) : [...v.techniques, { id: technique.id, title: technique.title }] } : v,
        ),
      })),
      () => (has ? adminApi.delete(`${base}/${day.id}/videos/${video.id}/techniques/${technique.id}`) : adminApi.post(`${base}/${day.id}/videos/${video.id}/techniques/${technique.id}`)),
    );
  };

  const group = (day: TrainingDay, label: string) => {
    if (!selecting || selecting.ids.size < 2) return;
    const assignmentIds = [...selecting.ids];
    setSelecting(null);
    optimistic(
      mapDay(day.id, (d) => ({ ...d, videos: d.videos.map((v) => (assignmentIds.includes(v.assignmentId) ? { ...v, groupId: -1, groupLabel: label } : v)) })),
      () => adminApi.put(`${base}/${day.id}/videos/group`, { assignmentIds, groupLabel: label }),
    );
  };

  const ungroup = (day: TrainingDay, groupId: number) =>
    optimistic(
      mapDay(day.id, (d) => ({ ...d, videos: d.videos.map((v) => (v.groupId === groupId ? { ...v, groupId: null, groupLabel: null } : v)) })),
      () => adminApi.delete(`${base}/${day.id}/videos/group/${groupId}`),
    );

  const removeVideo = (day: TrainingDay, video: DayVideo) =>
    optimistic(mapDay(day.id, (d) => ({ ...d, videos: d.videos.filter((v) => v.id !== video.id) })), () => adminApi.delete(`${base}/${day.id}/videos/${video.id}`));

  const assign = (day: TrainingDay, video: AdminVideo) =>
    run(`assign-${video.id}`, async () => {
      await adminApi.post(`${base}/${day.id}/videos/${video.id}`);
      setAdding(null);
      setFilters({ search: '', category: '', muscleGroup: '' });
    });

  const confirmStretching = () => {
    if (!stretching) return;
    const { dayId, ids } = stretching;
    setStretching(null);
    run(`stretching-${dayId}`, () => Promise.all([...ids].map((id) => adminApi.post(`${base}/${dayId}/videos/${id}`))));
  };

  const row = (day: TrainingDay, video: DayVideo) => (
    <VideoRow
      key={video.id}
      video={video}
      techniques={techniques}
      selecting={selecting?.dayId === day.id}
      selected={Boolean(selecting?.ids.has(video.assignmentId))}
      onToggleSelect={() =>
        setSelecting((s) => {
          if (!s) return s;
          const ids = new Set(s.ids);
          if (ids.has(video.assignmentId)) ids.delete(video.assignmentId);
          else ids.add(video.assignmentId);
          return { ...s, ids };
        })
      }
      onRemove={() => removeVideo(day, video)}
      onToggleTechnique={(tech) => toggleTechnique(day, video, tech)}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{t('days.title')}</h3>
          <p className="text-sm text-gray-600 mt-1">{t('days.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          {list.length > 0 && (
            <Button variant="danger" onClick={resetAll} loading={busy === 'reset'} icon={<FiAlertTriangle className="w-5 h-5" aria-hidden />}>
              {t('days.resetAll')}
            </Button>
          )}
          <Button onClick={addDay} loading={busy === 'add-day'} icon={<FiPlus className="w-5 h-5" aria-hidden />} className="!bg-green-600 !border-green-600 hover:!bg-green-700">
            {busy === 'add-day' ? t('days.adding') : t('days.add')}
          </Button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500 border-2 border-dashed border-gray-300">
          <p className="mb-4">{t('days.emptyTitle')}</p>
          <button type="button" onClick={addDay} disabled={busy === 'add-day'} className="text-green-600 hover:text-green-700 font-medium disabled:opacity-50">
            + {t('days.createFirst')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((day) => {
            const expanded = open.has(day.id);
            const isSelecting = selecting?.dayId === day.id;
            const available = adding === day.id ? availableVideos(library.data ?? [], day, filters) : [];
            return (
              <section key={day.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 flex items-center gap-2">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-label={expanded ? t('actions.collapse') : t('actions.expand')}
                    onClick={() =>
                      setOpen((s) => {
                        const next = new Set(s);
                        if (next.has(day.id)) next.delete(day.id);
                        else next.add(day.id);
                        return next;
                      })
                    }
                    className="p-2 hover:bg-gray-100 rounded-xl"
                  >
                    <FiChevronDown className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
                  </button>
                  {renaming?.id === day.id ? (
                    <form
                      className="flex items-center gap-2 flex-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        rename(day.id, renaming.name.trim() || nameOf(day));
                      }}
                    >
                      <input autoFocus value={renaming.name} onChange={(e) => setRenaming({ id: day.id, name: e.target.value })} aria-label={t('days.dayName')} className={`${inputClass} py-2`} />
                      <button type="submit" className="p-2 text-green-600 hover:bg-green-50 rounded-lg" aria-label={t('actions.save')}>
                        <FiCheck className="w-5 h-5" aria-hidden />
                      </button>
                      <button type="button" onClick={() => setRenaming(null)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" aria-label={t('actions.cancel')}>
                        <FiX className="w-5 h-5" aria-hidden />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <h4 className="text-lg font-semibold text-gray-900 truncate">{nameOf(day)}</h4>
                      <button type="button" onClick={() => setRenaming({ id: day.id, name: nameOf(day) })} className="p-1 text-gray-400 hover:text-gray-600" aria-label={t('days.rename')}>
                        <FiEdit2 className="w-4 h-4" aria-hidden />
                      </button>
                      <span className="text-sm text-gray-500 whitespace-nowrap">{t('days.videoCount', { count: day.videos.length })}</span>
                    </div>
                  )}
                  {day.videos.length > 0 && (
                    <button type="button" onClick={() => clearDay(day)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl" aria-label={t('days.clear')} title={t('days.clear')}>
                      <FiAlertTriangle className="w-5 h-5" aria-hidden />
                    </button>
                  )}
                  <button type="button" onClick={() => deleteDay(day)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl" aria-label={t('days.delete')} title={t('days.delete')}>
                    <FiTrash2 className="w-5 h-5" aria-hidden />
                  </button>
                </div>

                {expanded && (
                  <div className="px-4 pb-4 space-y-4">
                    {day.videos.length > 0 && (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => reorder(day, event)}>
                        <SortableContext items={day.videos.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2">
                            {groupDayVideos(day.videos).map((item) =>
                              item.type === 'videos' ? (
                                item.videos.map((v) => row(day, v))
                              ) : (
                                <div key={item.key} className="border-2 border-blue-300 rounded-xl overflow-hidden">
                                  <div className="bg-blue-50 px-3 py-1.5 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 uppercase tracking-wide">
                                      <FiLink className="w-3.5 h-3.5" aria-hidden />
                                      {item.label || 'Superset'}
                                    </span>
                                    {!isSelecting && (
                                      <button
                                        type="button"
                                        onClick={() => ungroup(day, item.videos[0].groupId!)}
                                        className="flex items-center gap-1 text-xs text-blue-500 hover:text-red-600"
                                      >
                                        <FiScissors className="w-3 h-3" aria-hidden />
                                        {t('days.ungroup')}
                                      </button>
                                    )}
                                  </div>
                                  <div className="p-2 space-y-1.5 bg-blue-50/30">{item.videos.map((v) => row(day, v))}</div>
                                </div>
                              ),
                            )}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}

                    {isSelecting ? (
                      <div className="border-t border-blue-200 pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-700 font-medium">{t('days.selected', { count: selecting.ids.size })}</span>
                          <button type="button" onClick={() => setSelecting(null)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">
                            {t('actions.cancel')}
                          </button>
                        </div>
                        {techniques.length === 0 ? (
                          <p className="text-xs text-gray-400">{t('days.noTechniques')}</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {techniques.map((tech) => (
                              <button
                                key={tech.id}
                                type="button"
                                onClick={() => group(day, tech.title)}
                                disabled={selecting.ids.size < 2}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {tech.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : adding === day.id ? (
                      <div className="border-t border-gray-200 pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-gray-900">{t('days.addVideo')}</h5>
                          <button type="button" onClick={() => setAdding(null)} className="text-gray-600 hover:text-gray-800" aria-label={t('actions.cancel')}>
                            <FiX className="w-5 h-5" aria-hidden />
                          </button>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="search"
                            autoFocus
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                            placeholder={t('days.searchPlaceholder')}
                            aria-label={t('days.searchPlaceholder')}
                            className={`${inputClass} py-2 flex-1`}
                          />
                          <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} className={`${inputClass} py-2 sm:w-auto appearance-none pr-10 select-arrow text-sm`} aria-label={t('videos.form.category')}>
                            <option value="">{t('days.allCategories')}</option>
                            {VIDEO_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {t(`categories.${c}`)}
                              </option>
                            ))}
                          </select>
                          <select value={filters.muscleGroup} onChange={(e) => setFilters((f) => ({ ...f, muscleGroup: e.target.value }))} className={`${inputClass} py-2 sm:w-auto appearance-none pr-10 select-arrow text-sm`} aria-label={t('videos.form.muscleGroup')}>
                            <option value="">{t('days.allGroups')}</option>
                            {MUSCLE_GROUPS.map((g) => (
                              <option key={g} value={g}>
                                {t(`muscleGroups.${g}`)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {available.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">{filters.search ? t('days.noVideos') : t('days.allAssigned')}</p>
                          ) : (
                            available.map((video) => (
                              <button
                                key={video.id}
                                type="button"
                                onClick={() => assign(day, video)}
                                disabled={busy === `assign-${video.id}`}
                                className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-3 disabled:opacity-60"
                              >
                                <span className="block font-medium text-gray-900 text-sm">{video.title}</span>
                                <span className="block text-xs text-gray-500 mt-1">
                                  {t(`categories.${video.category as 'palestra'}`, { defaultValue: video.category })} • {formatDuration(video.duration)}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAdding(day.id);
                            setFilters({ search: '', category: '', muscleGroup: '' });
                          }}
                          className="flex-1 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-gray-400 hover:text-gray-700"
                        >
                          + {t('days.addVideo')}
                        </button>
                        {day.videos.length >= 2 && (
                          <button
                            type="button"
                            onClick={() => setSelecting({ dayId: day.id, ids: new Set() })}
                            className="flex items-center gap-1.5 px-3 py-2.5 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 hover:border-blue-400 text-sm font-medium"
                          >
                            <FiLink className="w-4 h-4" aria-hidden />
                            {t('days.group')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {stretching && (
        <Modal
          title={t('days.stretchingTitle', { name: stretching.name })}
          onClose={() => setStretching(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setStretching(null)}>
                {t('days.skip')}
              </Button>
              <Button onClick={confirmStretching} disabled={stretching.ids.size === 0}>
                {stretching.ids.size ? t('days.addSelected', { count: stretching.ids.size }) : t('days.addSelectedNone')}
              </Button>
            </>
          }
        >
          <div className="p-4 space-y-3">
            <p className="text-sm text-gray-500">{t('days.stretchingHint')}</p>
            <input
              type="search"
              value={stretching.search}
              onChange={(e) => setStretching({ ...stretching, search: e.target.value })}
              placeholder={t('days.searchPlaceholder')}
              aria-label={t('days.searchPlaceholder')}
              className={inputClass}
            />
            <div className="space-y-2">
              {availableVideos(stretchingVideos, { id: 0, dayNumber: 0, dayName: null, videos: [] }, { search: stretching.search, category: '', muscleGroup: '' }).map((video) => (
                <label
                  key={video.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${stretching.ids.has(video.id) ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <input
                    type="checkbox"
                    checked={stretching.ids.has(video.id)}
                    onChange={() => {
                      const ids = new Set(stretching.ids);
                      if (ids.has(video.id)) ids.delete(video.id);
                      else ids.add(video.id);
                      setStretching({ ...stretching, ids });
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-900">{video.title}</span>
                </label>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TrainingDaysEditor;
