import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiChevronDown, FiChevronUp, FiX, FiPlus, FiCheck, FiLoader, FiLink } from 'react-icons/fi';
import { apiCall, numberMatchScore } from '../../utils/adminUtils';

type IconType = React.ComponentType<{ className?: string }>;
const icon = (Icon: unknown, className: string) => React.createElement(Icon as IconType, { className });

interface LinkVideo {
  assignmentId: number | null;
  videoId: number;
  title: string;
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
}

interface Props {
  userId: number;
  /** Called after saving, since library videos may have been added to the days. */
  onSaved?: () => void;
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

const ExerciseVideoLinker: React.FC<Props> = ({ userId, onSaved }) => {
  const [days, setDays] = useState<LinkDay[]>([]);
  const [draft, setDraft] = useState<Record<number, DraftItem[]>>({});
  const [library, setLibrary] = useState<LibraryVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [linksRes, videosRes] = await Promise.all([
        apiCall(`/workout/admin/links/${userId}`),
        apiCall('/admin/videos'),
      ]);
      const loadedDays: LinkDay[] = linksRes.data.days || [];
      setDays(loadedDays);
      setLibrary((videosRes.data.videos || []).map((v: LibraryVideo) => ({ id: v.id, title: v.title })));

      // Saved links win; exercises without links start from the suggestions
      const initial: Record<number, DraftItem[]> = {};
      let hasSuggestions = false;
      for (const day of loadedDays) {
        for (const ex of day.exercises) {
          if (ex.links.length > 0) {
            initial[ex.id] = ex.links.map((l) => ({ ...l, status: 'saved', fromLibrary: false }));
          } else {
            initial[ex.id] = ex.suggestions.map((s) => ({
              assignmentId: s.assignmentId, videoId: s.videoId, title: s.title, status: s.confidence, fromLibrary: s.fromLibrary,
            }));
            if (ex.suggestions.length > 0) hasSuggestions = true;
          }
        }
      }
      setDraft(initial);
      // Unsaved suggestions mean there's something to save
      setDirty(hasSuggestions);
    } catch (err) {
      console.error('Failed to load exercise links:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const allExercises = useMemo(() => days.flatMap((d) => d.exercises), [days]);

  const counts = useMemo(() => {
    const c = { ok: 0, check: 0, missing: 0 };
    for (const ex of allExercises) c[exerciseStatus(draft[ex.id] || [])]++;
    return c;
  }, [allExercises, draft]);

  const updateItems = (exerciseId: number, update: (items: DraftItem[]) => DraftItem[]) => {
    setDraft((prev) => ({ ...prev, [exerciseId]: update(prev[exerciseId] || []) }));
    setDirty(true);
    setMessage(null);
  };

  const removeItem = (exerciseId: number, index: number) =>
    updateItems(exerciseId, (items) => items.filter((_, i) => i !== index));

  const confirmItem = (exerciseId: number, index: number) =>
    updateItems(exerciseId, (items) => items.map((it, i) => (i === index ? { ...it, status: 'manual' } : it)));

  const addItem = (exerciseId: number, video: LinkVideo, fromLibrary: boolean) => {
    updateItems(exerciseId, (items) =>
      items.some((it) => it.videoId === video.videoId) ? items : [...items, { ...video, status: 'manual', fromLibrary }]
    );
    setPickerFor(null);
    setPickerQuery('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const links = allExercises.map((ex) => ({
        exerciseId: ex.id,
        videos: (draft[ex.id] || []).map((it) => ({ assignmentId: it.assignmentId, videoId: it.videoId })),
      }));
      const res = await apiCall(`/workout/admin/links/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ links }),
      });
      const added = res.data?.addedVideos || 0;
      setMessage(added > 0 ? `Salvato! ${added} video aggiunti ai giorni dalla libreria.` : 'Abbinamenti salvati!');
      await load();
      onSaved?.();
    } catch (err: any) {
      alert(err.message || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  /** Picker options: the day's videos not yet used first, then the library. */
  const pickerOptions = (day: LinkDay, exerciseId: number) => {
    const used = new Set((draft[exerciseId] || []).map((it) => it.videoId));
    const query = pickerQuery.trim().toLowerCase();
    const matches = (title: string) => !query || title.toLowerCase().includes(query);

    // Videos of the day = extras + anything linked/suggested anywhere in the day
    const dayVideos = new Map<number, LinkVideo>();
    for (const v of day.extras) dayVideos.set(v.videoId, v);
    for (const ex of day.exercises) {
      for (const v of [...ex.links, ...ex.suggestions]) if (v.assignmentId) dayVideos.set(v.videoId, v);
    }
    const fromDay = Array.from(dayVideos.values()).filter((v) => !used.has(v.videoId) && matches(v.title));

    let fromLibrary: LinkVideo[] = query
      ? library
          .filter((v) => !used.has(v.id) && !dayVideos.has(v.id) && matches(v.title))
          .map((v) => ({ assignmentId: null, videoId: v.id, title: v.title }))
      : [];
    if (/^\d+$/.test(query)) {
      fromLibrary = [...fromLibrary].sort((a, b) => numberMatchScore(a.title, query) - numberMatchScore(b.title, query));
    }
    return { fromDay, fromLibrary: fromLibrary.slice(0, 8) };
  };

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
          {dirty && (
            <div className="px-4 py-2.5 bg-blue-50 text-blue-800 text-sm">
              Ho proposto io gli abbinamenti: controlla quelli <span className="font-semibold text-amber-700">gialli</span> e
              gli esercizi <span className="font-semibold text-red-700">senza video</span>, poi premi Salva.
            </div>
          )}

          <div className="p-4 space-y-5">
            {days.map((day) => (
              <div key={day.dayNumber}>
                <h4 className="text-sm font-bold text-gray-900 mb-2">{day.dayName}</h4>
                <div className="space-y-2">
                  {day.exercises.map((ex) => {
                    const items = draft[ex.id] || [];
                    const status = exerciseStatus(items);
                    const options = pickerFor === ex.id ? pickerOptions(day, ex.id) : null;
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
                              {items.map((it, i) => (
                                <span key={`${it.videoId}-${i}`} className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full border text-xs ${CHIP_STYLES[it.status]}`}>
                                  <span className="max-w-[260px] truncate">{it.title}</span>
                                  {it.fromLibrary && !it.assignmentId && (
                                    <span className="text-[10px] font-semibold uppercase opacity-70">· libreria</span>
                                  )}
                                  {it.status === 'maybe' && (
                                    <button onClick={() => confirmItem(ex.id, i)} title="Conferma" className="p-0.5 rounded-full hover:bg-amber-200">
                                      {icon(FiCheck, 'w-3.5 h-3.5')}
                                    </button>
                                  )}
                                  <button onClick={() => removeItem(ex.id, i)} title="Rimuovi" className="p-0.5 rounded-full hover:bg-black/10">
                                    {icon(FiX, 'w-3.5 h-3.5')}
                                  </button>
                                </span>
                              ))}
                              <button
                                onClick={() => { setPickerFor(pickerFor === ex.id ? null : ex.id); setPickerQuery(''); }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-xs text-gray-500 hover:text-gray-900 hover:border-gray-500"
                              >
                                {icon(FiPlus, 'w-3.5 h-3.5')} video
                              </button>
                            </div>

                            {options && (
                              <div className="mt-2 border border-gray-200 rounded-lg p-2 bg-gray-50">
                                <input
                                  autoFocus
                                  value={pickerQuery}
                                  onChange={(e) => setPickerQuery(e.target.value)}
                                  placeholder="Cerca un video (nome o numero macchina)…"
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                                />
                                <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
                                  {options.fromDay.map((v) => (
                                    <button key={`d-${v.videoId}`} onClick={() => addItem(ex.id, v, false)}
                                      className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-white flex justify-between gap-2">
                                      <span className="truncate">{v.title}</span>
                                      <span className="text-[10px] uppercase text-gray-400 flex-shrink-0">nel giorno</span>
                                    </button>
                                  ))}
                                  {options.fromLibrary.map((v) => (
                                    <button key={`l-${v.videoId}`} onClick={() => addItem(ex.id, v, true)}
                                      className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-white flex justify-between gap-2">
                                      <span className="truncate">{v.title}</span>
                                      <span className="text-[10px] uppercase text-gray-400 flex-shrink-0">libreria</span>
                                    </button>
                                  ))}
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

                {day.extras.length > 0 && (
                  <p className="mt-2 text-xs text-gray-400">
                    Video del giorno senza esercizio: {day.extras.map((v) => v.title).join(' · ')}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="sticky bottom-0 flex items-center justify-end gap-3 px-4 py-3 bg-white border-t border-gray-200">
            {message && <span className="text-sm text-green-700">{message}</span>}
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
