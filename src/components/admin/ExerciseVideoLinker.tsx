import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiChevronDown, FiChevronUp, FiX, FiPlus, FiCheck, FiLoader, FiLink, FiInfo } from 'react-icons/fi';
import { apiCall, numberMatchScore } from '../../utils/adminUtils';

type IconType = React.ComponentType<{ className?: string }>;
const icon = (Icon: unknown, className: string) => React.createElement(Icon as IconType, { className });

interface Technique {
  id: number;
  title: string;
}

interface LinkVideo {
  assignmentId: number | null;
  videoId: number;
  title: string;
  /** Day the video sits in (a link may use another day's video); unset for library videos. */
  dayNumber?: number;
  techniques: Technique[];
}

interface Suggestion extends LinkVideo {
  confidence: 'sure' | 'maybe';
  fromLibrary: boolean;
}

interface LinkExercise {
  id: number;
  name: string;
  sets: string;
  reps: string;
  links: LinkVideo[];
  suggestions: Suggestion[];
}

interface LinkDay {
  dayNumber: number;
  dayName: string;
  exercises: LinkExercise[];
  extras: LinkVideo[];
}

// A video shown under an exercise in the editor. 'saved' = already linked in
// the DB; 'sure' / 'maybe' = proposed automatically; 'manual' = added by hand.
type ItemStatus = 'saved' | 'sure' | 'maybe' | 'manual';
interface DraftItem extends LinkVideo {
  status: ItemStatus;
  fromLibrary: boolean;
}

interface LibraryVideo {
  id: number;
  title: string;
  muscleGroup?: string | null;
}

/** Where a video chip lives: under an exercise, or in a day's other videos. */
type Slot = { kind: 'exercise'; id: number } | { kind: 'extra'; id: number };
const slotKey = (slot: Slot) => `${slot.kind}-${slot.id}`;

interface Props {
  userId: number;
  /** Called after saving, since library videos may have been added to the days. */
  onSaved?: () => void;
  /** Tells the parent whether the user has a plan (the editor is empty without one). */
  onLoaded?: (hasExercises: boolean) => void;
}

const CHIP_STYLES: Record<ItemStatus, string> = {
  saved: 'bg-gray-100 border-gray-300 text-gray-800',
  manual: 'bg-gray-100 border-gray-300 text-gray-800',
  sure: 'bg-green-50 border-green-300 text-green-800',
  maybe: 'bg-amber-50 border-amber-300 text-amber-800',
};

/** Exercise status: green when all its videos are confirmed, amber when one needs a check, red when it has none. */
function exerciseStatus(items: DraftItem[]): 'ok' | 'check' | 'missing' {
  if (items.length === 0) return 'missing';
  return items.some((i) => i.status === 'maybe') ? 'check' : 'ok';
}

const STATUS_DOT: Record<ReturnType<typeof exerciseStatus>, string> = {
  ok: 'bg-green-500',
  check: 'bg-amber-400',
  missing: 'bg-red-500',
};

const ExerciseVideoLinker: React.FC<Props> = ({ userId, onSaved, onLoaded }) => {
  const [days, setDays] = useState<LinkDay[]>([]);
  const [draft, setDraft] = useState<Record<number, DraftItem[]>>({});
  const [extrasDraft, setExtrasDraft] = useState<Record<number, DraftItem[]>>({});
  const [library, setLibrary] = useState<LibraryVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [stretchingOnly, setStretchingOnly] = useState(true);
  // Technique panel: `${slotKey}-${index}`
  const [techFor, setTechFor] = useState<string | null>(null);
  const [techQuery, setTechQuery] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [linksRes, videosRes] = await Promise.all([
        apiCall(`/workout/admin/links/${userId}`),
        apiCall('/admin/videos'),
      ]);
      const loadedDays: LinkDay[] = linksRes.data.days || [];
      setDays(loadedDays);
      setLibrary((videosRes.data.videos || []).map((v: LibraryVideo) => ({ id: v.id, title: v.title, muscleGroup: v.muscleGroup })));

      // Saved links win; exercises without links start from the suggestions
      const initial: Record<number, DraftItem[]> = {};
      const initialExtras: Record<number, DraftItem[]> = {};
      let hasSuggestions = false;
      for (const day of loadedDays) {
        for (const ex of day.exercises) {
          if (ex.links.length > 0) {
            initial[ex.id] = ex.links.map((l) => ({ ...l, status: 'saved', fromLibrary: false }));
          } else {
            initial[ex.id] = ex.suggestions.map((s) => ({
              assignmentId: s.assignmentId, videoId: s.videoId, title: s.title, dayNumber: s.dayNumber,
              techniques: s.techniques || [], status: s.confidence, fromLibrary: s.fromLibrary,
            }));
            if (ex.suggestions.length > 0) hasSuggestions = true;
          }
        }
        initialExtras[day.dayNumber] = day.extras.map((v) => ({ ...v, status: 'saved', fromLibrary: false }));
      }
      setDraft(initial);
      setExtrasDraft(initialExtras);
      // Unsaved suggestions mean there's something to save
      setDirty(hasSuggestions);
      onLoaded?.(loadedDays.some((d) => d.exercises.length > 0));
    } catch (err) {
      console.error('Failed to load exercise links:', err);
      onLoaded?.(false);
    } finally {
      setLoading(false);
    }
  }, [userId, onLoaded]);

  useEffect(() => {
    load();
  }, [load]);

  const allExercises = useMemo(() => days.flatMap((d) => d.exercises), [days]);
  const techniqueLibrary = useMemo(() => library.filter((v) => v.muscleGroup === 'Tecniche'), [library]);

  const counts = useMemo(() => {
    const c = { ok: 0, check: 0, missing: 0 };
    for (const ex of allExercises) c[exerciseStatus(draft[ex.id] || [])]++;
    return c;
  }, [allExercises, draft]);

  /** Unsaved automatic proposals still in the draft (the banner asks to check them). */
  const hasProposals = useMemo(
    () => Object.values(draft).some((items) => items.some((it) => it.status === 'sure' || it.status === 'maybe')),
    [draft]
  );

  /** Day videos (already in the DB) that the current draft drops: saving removes them from the client's days. */
  const removedCount = useMemo(() => {
    const original = new Set<number>();
    for (const day of days) {
      for (const v of day.extras) if (v.assignmentId) original.add(v.assignmentId);
      for (const ex of day.exercises) {
        for (const v of [...ex.links, ...ex.suggestions]) if (v.assignmentId) original.add(v.assignmentId);
      }
    }
    const kept = new Set<number>();
    for (const items of [...Object.values(draft), ...Object.values(extrasDraft)]) {
      for (const it of items) if (it.assignmentId) kept.add(it.assignmentId);
    }
    return Array.from(original).filter((id) => !kept.has(id)).length;
  }, [days, draft, extrasDraft]);

  const touch = () => {
    setDirty(true);
    setMessage(null);
  };

  const getItems = (slot: Slot) => (slot.kind === 'exercise' ? draft[slot.id] : extrasDraft[slot.id]) || [];

  const updateItems = (slot: Slot, update: (items: DraftItem[]) => DraftItem[]) => {
    const setter = slot.kind === 'exercise' ? setDraft : setExtrasDraft;
    setter((prev) => ({ ...prev, [slot.id]: update(prev[slot.id] || []) }));
    touch();
  };

  const dayOfExercise = (exerciseId: number) => days.find((d) => d.exercises.some((e) => e.id === exerciseId))?.dayNumber;

  /**
   * Removing a video from an exercise keeps it in its day (it shows up under
   * "Altri video del giorno", where it can be deleted); removing it there drops
   * it from the day on save.
   */
  const removeItem = (slot: Slot, index: number) => {
    const item = getItems(slot)[index];
    updateItems(slot, (items) => items.filter((_, i) => i !== index));
    if (slot.kind === 'exercise' && item?.assignmentId) {
      const dayNumber = item.dayNumber ?? dayOfExercise(slot.id);
      if (dayNumber != null) {
        updateItems({ kind: 'extra', id: dayNumber }, (items) =>
          items.some((it) => it.assignmentId === item.assignmentId) ? items : [...items, { ...item, status: 'saved' }]
        );
      }
    }
    setTechFor(null);
  };

  const confirmItem = (slot: Slot, index: number) =>
    updateItems(slot, (items) => items.map((it, i) => (i === index ? { ...it, status: 'manual' } : it)));

  /** Marks every automatic proposal (green and yellow) as checked. */
  const confirmAll = () => {
    setDraft((prev) => {
      const next: Record<number, DraftItem[]> = {};
      for (const [id, items] of Object.entries(prev)) {
        next[Number(id)] = items.map((it) => (it.status === 'sure' || it.status === 'maybe' ? { ...it, status: 'manual' } : it));
      }
      return next;
    });
    touch();
  };

  const closePicker = () => {
    setPickerFor(null);
    setPickerQuery('');
  };

  const addItem = (slot: Slot, video: LinkVideo, fromLibrary: boolean) => {
    // A day video picked for an exercise leaves the day's other videos
    if (slot.kind === 'exercise' && video.assignmentId && video.dayNumber != null) {
      updateItems({ kind: 'extra', id: video.dayNumber }, (items) => items.filter((it) => it.assignmentId !== video.assignmentId));
    }
    updateItems(slot, (items) =>
      items.some((it) => it.videoId === video.videoId) ? items : [...items, { ...video, status: 'manual', fromLibrary }]
    );
    closePicker();
  };

  const toggleTechnique = (slot: Slot, index: number, technique: Technique) =>
    updateItems(slot, (items) => items.map((it, i) => {
      if (i !== index) return it;
      const has = it.techniques.some((t) => t.id === technique.id);
      return { ...it, techniques: has ? it.techniques.filter((t) => t.id !== technique.id) : [...it.techniques, technique] };
    }));

  const handleSave = async () => {
    if (removedCount > 0 && !window.confirm(
      removedCount === 1
        ? '1 video verrà tolto dai giorni del cliente (non lo vedrà più). Continuare?'
        : `${removedCount} video verranno tolti dai giorni del cliente (non li vedrà più). Continuare?`
    )) return;
    const toPayload = (it: DraftItem) => ({ assignmentId: it.assignmentId, videoId: it.videoId, techniqueIds: it.techniques.map((t) => t.id) });
    try {
      setSaving(true);
      const links = allExercises.map((ex) => ({ exerciseId: ex.id, videos: (draft[ex.id] || []).map(toPayload) }));
      const extras = days.map((d) => ({ dayNumber: d.dayNumber, videos: (extrasDraft[d.dayNumber] || []).map(toPayload) }));
      const res = await apiCall(`/workout/admin/links/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ links, extras }),
      });
      const added = res.data?.addedVideos || 0;
      const removed = res.data?.removedVideos || 0;
      const details = [
        added > 0 && `${added} video ${added === 1 ? 'aggiunto' : 'aggiunti'}`,
        removed > 0 && `${removed} ${removed === 1 ? 'tolto' : 'tolti'}`,
      ].filter(Boolean).join(', ');
      setMessage(details ? `Salvato! ${details}.` : 'Salvato!');
      await load();
      onSaved?.();
    } catch (err: any) {
      alert(err.message || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  /** Videos already used in a day, by exercises of that day or as its other videos. */
  const videosInDay = (day: LinkDay) => {
    const used = new Set<number>();
    for (const ex of day.exercises) for (const it of draft[ex.id] || []) used.add(it.videoId);
    for (const it of extrasDraft[day.dayNumber] || []) used.add(it.videoId);
    return used;
  };

  const libraryMatches = (exclude: Set<number>, filter?: (v: LibraryVideo) => boolean) => {
    const query = pickerQuery.trim().toLowerCase();
    let list = library.filter((v) => !exclude.has(v.id) && (!filter || filter(v)) && (!query || v.title.toLowerCase().includes(query)));
    if (/^\d+$/.test(query)) {
      list = [...list].sort((a, b) => numberMatchScore(a.title, query) - numberMatchScore(b.title, query));
    }
    return list;
  };

  /** Exercise picker: the day's other videos first, then the library. */
  const exercisePickerOptions = (day: LinkDay) => {
    const query = pickerQuery.trim().toLowerCase();
    const fromDay = (extrasDraft[day.dayNumber] || []).filter((v) => !query || v.title.toLowerCase().includes(query));
    const fromLibrary = query
      ? libraryMatches(videosInDay(day)).slice(0, 8).map((v) => ({ assignmentId: null, videoId: v.id, title: v.title, techniques: [] }))
      : [];
    return { fromDay, fromLibrary };
  };

  const renderChip = (slot: Slot, it: DraftItem, i: number) => {
    const key = `${slotKey(slot)}-${i}`;
    return (
      <span key={`${it.videoId}-${i}`} className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full border text-xs ${CHIP_STYLES[it.status]}`}>
        <span className="max-w-[260px] truncate">{it.title}</span>
        {it.fromLibrary && !it.assignmentId && (
          <span className="text-[10px] font-semibold uppercase opacity-70">· libreria</span>
        )}
        {it.techniques.map((t) => (
          <span key={t.id} className="bg-blue-100 text-blue-700 rounded px-1.5 text-[10px] font-medium max-w-[120px] truncate">{t.title}</span>
        ))}
        {it.status === 'maybe' && (
          <button onClick={() => confirmItem(slot, i)} title="Conferma" className="p-0.5 rounded-full hover:bg-amber-200">
            {icon(FiCheck, 'w-3.5 h-3.5')}
          </button>
        )}
        <button
          onClick={() => { setTechFor(techFor === key ? null : key); setTechQuery(''); closePicker(); }}
          title="Tecniche"
          className={`p-0.5 rounded-full ${techFor === key ? 'bg-blue-200 text-blue-800' : 'hover:bg-black/10'}`}
        >
          {icon(FiInfo, 'w-3.5 h-3.5')}
        </button>
        <button onClick={() => removeItem(slot, i)} title="Rimuovi" className="p-0.5 rounded-full hover:bg-black/10">
          {icon(FiX, 'w-3.5 h-3.5')}
        </button>
      </span>
    );
  };

  /** Technique panel for the chip of this slot whose panel is open, if any. */
  const renderTechniquePanel = (slot: Slot) => {
    const prefix = `${slotKey(slot)}-`;
    if (!techFor || !techFor.startsWith(prefix)) return null;
    const index = Number(techFor.slice(prefix.length));
    const item = getItems(slot)[index];
    if (!item) return null;
    const query = techQuery.trim().toLowerCase();
    const options = techniqueLibrary.filter((t) => !query || t.title.toLowerCase().includes(query));
    return (
      <div className="mt-2 border border-blue-200 rounded-lg p-2 bg-blue-50/40">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-gray-600">Tecniche per «{item.title}»</span>
          <button onClick={() => setTechFor(null)} className="text-gray-400 hover:text-gray-600">{icon(FiX, 'w-4 h-4')}</button>
        </div>
        <input
          autoFocus
          value={techQuery}
          onChange={(e) => setTechQuery(e.target.value)}
          placeholder="Cerca tecnica…"
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
          {options.length === 0 ? (
            <p className="px-2 py-1 text-xs text-gray-400">
              {techniqueLibrary.length === 0 ? 'Nessun video con gruppo "Tecniche"' : 'Nessun risultato'}
            </p>
          ) : options.map((t) => {
            const active = item.techniques.some((x) => x.id === t.id);
            return (
              <button key={t.id} onClick={() => toggleTechnique(slot, index, { id: t.id, title: t.title })}
                className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center justify-between ${
                  active ? 'bg-blue-100 text-blue-800 font-semibold' : 'hover:bg-white text-gray-700'
                }`}>
                <span>{t.title}</span>
                {active && icon(FiCheck, 'w-3 h-3 text-blue-600')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSearchInput = (placeholder: string) => (
    <input
      autoFocus
      value={pickerQuery}
      onChange={(e) => setPickerQuery(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
    />
  );

  const renderOption = (key: string, title: string, tag: string, onClick: () => void) => (
    <button key={key} onClick={onClick} className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-white flex justify-between gap-2">
      <span className="truncate">{title}</span>
      <span className="text-[10px] uppercase text-gray-400 flex-shrink-0">{tag}</span>
    </button>
  );

  const addButton = (key: string, label: string) => (
    <button
      onClick={() => { setPickerFor(pickerFor === key ? null : key); setPickerQuery(''); setTechFor(null); }}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-xs text-gray-500 hover:text-gray-900 hover:border-gray-500"
    >
      {icon(FiPlus, 'w-3.5 h-3.5')} {label}
    </button>
  );

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex items-center gap-2 text-sm text-gray-500">
        {icon(FiLoader, 'w-4 h-4 animate-spin')} Caricamento abbinamenti esercizi…
      </div>
    );
  }

  if (allExercises.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-sm text-gray-500">
        {icon(FiLink, 'w-4 h-4 inline mr-1.5 -mt-0.5')}
        Nessun esercizio nella scheda: per collegare esercizi e video usa prima <strong>Pesi & Progressi › Estrai dal PDF</strong>.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-6 overflow-hidden">
      {/* Header with summary — click to expand */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {icon(FiLink, 'w-4 h-4 text-gray-500')}
          <span className="font-semibold text-gray-900">Esercizi della scheda ↔ video</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-800">{counts.ok} ok</span>
          {counts.check > 0 && <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800">{counts.check} da verificare</span>}
          {counts.missing > 0 && <span className="px-2 py-1 rounded-full bg-red-100 text-red-800">{counts.missing} senza video</span>}
          {dirty && <span className="px-2 py-1 rounded-full bg-gray-900 text-white">da salvare</span>}
          {icon(expanded ? FiChevronUp : FiChevronDown, 'w-4 h-4 text-gray-400')}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-200">
          {hasProposals && (
            <div className="px-4 py-2.5 bg-blue-50 text-blue-800 text-sm flex flex-wrap items-center justify-between gap-2">
              <span>
                Ho proposto io gli abbinamenti: controlla quelli <span className="font-semibold text-amber-700">gialli</span> e
                gli esercizi <span className="font-semibold text-red-700">senza video</span>, poi premi Salva.
              </span>
              <button
                onClick={confirmAll}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-800 text-xs font-medium hover:bg-blue-100"
              >
                {icon(FiCheck, 'w-3.5 h-3.5')} Conferma tutti
              </button>
            </div>
          )}

          <div className="p-4 space-y-5">
            {days.map((day) => {
              const extraSlot: Slot = { kind: 'extra', id: day.dayNumber };
              const extras = extrasDraft[day.dayNumber] || [];
              const extraPickerKey = slotKey(extraSlot);
              return (
                <div key={day.dayNumber}>
                  <h4 className="text-sm font-bold text-gray-900 mb-2">{day.dayName}</h4>
                  <div className="space-y-2">
                    {day.exercises.map((ex) => {
                      const slot: Slot = { kind: 'exercise', id: ex.id };
                      const items = draft[ex.id] || [];
                      const status = exerciseStatus(items);
                      const options = pickerFor === slotKey(slot) ? exercisePickerOptions(day) : null;
                      return (
                        <div key={ex.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <span className={`mt-1.5 flex-shrink-0 w-2.5 h-2.5 rounded-full ${STATUS_DOT[status]}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 leading-snug">{ex.name}</p>
                              {(ex.sets || ex.reps) && (
                                <p className="text-xs text-gray-400">{[ex.sets && `${ex.sets} serie`, ex.reps && `${ex.reps} reps`].filter(Boolean).join(' · ')}</p>
                              )}

                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {items.map((it, i) => renderChip(slot, it, i))}
                                {addButton(slotKey(slot), 'video')}
                              </div>

                              {renderTechniquePanel(slot)}

                              {options && (
                                <div className="mt-2 border border-gray-200 rounded-lg p-2 bg-gray-50">
                                  {renderSearchInput('Cerca un video (nome o numero macchina)…')}
                                  <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
                                    {options.fromDay.map((v) => renderOption(`d-${v.videoId}`, v.title, 'nel giorno', () => addItem(slot, v, false)))}
                                    {options.fromLibrary.map((v) => renderOption(`l-${v.videoId}`, v.title, 'libreria', () => addItem(slot, v, true)))}
                                    {options.fromDay.length === 0 && options.fromLibrary.length === 0 && (
                                      <p className="px-3 py-1.5 text-xs text-gray-400">
                                        {pickerQuery ? 'Nessun video trovato' : 'Scrivi per cercare nella libreria'}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Videos of the day not tied to an exercise (stretching, warm-up…): the client sees them too */}
                  <div className="mt-2 border border-dashed border-gray-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2">
                      {day.exercises.length > 0 ? 'Altri video del giorno' : 'Video del giorno'}
                      <span className="font-normal text-gray-400"> · stretching, riscaldamento… li vede anche il cliente</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {extras.map((it, i) => renderChip(extraSlot, it, i))}
                      {addButton(extraPickerKey, 'aggiungi')}
                    </div>

                    {renderTechniquePanel(extraSlot)}

                    {pickerFor === extraPickerKey && (() => {
                      const options = libraryMatches(videosInDay(day), stretchingOnly ? (v) => v.muscleGroup === 'Stretching' : undefined)
                        .slice(0, stretchingOnly && !pickerQuery.trim() ? 50 : 8);
                      return (
                        <div className="mt-2 border border-gray-200 rounded-lg p-2 bg-gray-50">
                          <div className="flex gap-1.5 mb-2">
                            {[true, false].map((onlyStretching) => (
                              <button key={String(onlyStretching)} onClick={() => setStretchingOnly(onlyStretching)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                  stretchingOnly === onlyStretching ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'
                                }`}>
                                {onlyStretching ? 'Stretching' : 'Tutta la libreria'}
                              </button>
                            ))}
                          </div>
                          {renderSearchInput(stretchingOnly ? 'Cerca uno stretching…' : 'Cerca un video (nome o numero macchina)…')}
                          <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
                            {options.map((v) => renderOption(`x-${v.id}`, v.title, v.muscleGroup || 'libreria', () =>
                              addItem(extraSlot, { assignmentId: null, videoId: v.id, title: v.title, dayNumber: day.dayNumber, techniques: [] }, true)))}
                            {options.length === 0 && (
                              <p className="px-3 py-1.5 text-xs text-gray-400">
                                {pickerQuery || stretchingOnly ? 'Nessun video trovato' : 'Scrivi per cercare nella libreria'}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 px-4 py-3 bg-white border-t border-gray-200">
            {removedCount > 0 && (
              <span className="text-xs text-red-600">
                {removedCount} video {removedCount === 1 ? 'verrà tolto' : 'verranno tolti'} dai giorni
              </span>
            )}
            {message && <span className="text-sm text-green-700">{message}</span>}
            {hasProposals && (
              <button
                onClick={confirmAll}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {icon(FiCheck, 'w-4 h-4')} Conferma tutti
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                saving || !dirty ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {saving && icon(FiLoader, 'w-4 h-4 animate-spin')}
              {saving ? 'Salvataggio…' : 'Salva abbinamenti'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseVideoLinker;
