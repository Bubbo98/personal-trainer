import React, { useState, useEffect, useCallback } from 'react';
import {
  FiPlus,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiCheck,
  FiX,
  FiSearch,
  FiMenu,
  FiInfo,
  FiAlertTriangle,
} from 'react-icons/fi';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { apiCall, formatDuration } from '../../utils/adminUtils';
import { Video } from '../../types/admin';

interface TrainingDay {
  id: number;
  userId: number;
  dayNumber: number;
  dayName: string | null;
  createdAt: string;
  updatedAt: string;
  videos: TrainingDayVideo[];
}

interface TrainingDayVideo extends Video {
  assignmentId: number;
  orderIndex: number;
  addedAt: string;
  techniqueId?: number | null;
  techniqueTitle?: string | null;
  techniqueDescription?: string | null;
  techniqueFilePath?: string | null;
  techniqueThumbnailPath?: string | null;
}

interface Props {
  userId: number;
  onUpdate?: () => void;
}

// Sortable video item component
const SortableVideoItem: React.FC<{
  video: TrainingDayVideo;
  techniqueVideos: Video[];
  onRemove: () => void;
  onSetTechnique: (techniqueId: number | null) => void;
}> = ({ video, techniqueVideos, onRemove, onSetTechnique }) => {
  const [showTechPanel, setShowTechPanel] = useState(false);
  const [techSearch, setTechSearch] = useState('');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const filteredTechniques = techniqueVideos.filter(t =>
    t.title.toLowerCase().includes(techSearch.toLowerCase())
  );

  return (
    <div ref={setNodeRef} style={style} className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-3 flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          style={{ touchAction: 'none' }}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          {React.createElement(FiMenu as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
        </button>
        <div className="flex-1 min-w-0">
          <h5 className="font-medium text-gray-900 text-sm truncate">{video.title}</h5>
          <div className="text-xs text-gray-500 space-x-2">
            <span className="capitalize">{video.category}</span>
            <span>•</span>
            <span>{formatDuration(video.duration)}</span>
          </div>
          {video.techniqueId && !showTechPanel && (
            <div className="flex items-center gap-1 mt-1">
              {React.createElement(FiInfo as React.ComponentType<{ className?: string }>, { className: "w-3 h-3 text-blue-500 flex-shrink-0" })}
              <span className="text-xs text-blue-700 font-medium truncate">{video.techniqueTitle}</span>
              <button
                onClick={() => onSetTechnique(null)}
                className="ml-1 text-gray-400 hover:text-red-500 flex-shrink-0"
              >
                {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-3 h-3" })}
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => { setShowTechPanel(p => !p); setTechSearch(''); }}
          className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
            showTechPanel ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {React.createElement(FiInfo as React.ComponentType<{ className?: string }>, { className: "w-3 h-3" })}
          Tecnica
        </button>
        <button
          onClick={onRemove}
          className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
        </button>
      </div>

      {showTechPanel && (
        <div className="border-t border-gray-200 p-3 space-y-2 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Seleziona tecnica</span>
            <button onClick={() => setShowTechPanel(false)} className="text-gray-400 hover:text-gray-600">
              {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
            </button>
          </div>
          {video.techniqueId && (
            <button
              onClick={() => { onSetTechnique(null); setShowTechPanel(false); }}
              className="w-full text-left text-xs text-red-600 hover:text-red-700 py-1"
            >
              Rimuovi tecnica assegnata
            </button>
          )}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              {React.createElement(FiSearch as React.ComponentType<{ className?: string }>, { className: "w-3.5 h-3.5 text-gray-400" })}
            </div>
            <input
              type="text"
              placeholder="Cerca tecnica..."
              value={techSearch}
              onChange={(e) => setTechSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {filteredTechniques.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">
                {techniqueVideos.length === 0 ? 'Nessun video con gruppo "Tecniche"' : 'Nessun risultato'}
              </p>
            ) : (
              filteredTechniques.map(t => (
                <button
                  key={t.id}
                  onClick={() => { onSetTechnique(t.id); setShowTechPanel(false); }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                    video.techniqueId === t.id
                      ? 'bg-blue-100 text-blue-800 font-semibold'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {t.title}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const TrainingDaysManager: React.FC<Props> = ({ userId, onUpdate }) => {
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([]);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [editingDayId, setEditingDayId] = useState<number | null>(null);
  const [editDayName, setEditDayName] = useState('');
  const [showAddVideo, setShowAddVideo] = useState<number | null>(null);
  const [videoSearchTerm, setVideoSearchTerm] = useState('');
  const [videoMuscleFilter, setVideoMuscleFilter] = useState('');
  const [videoCategoryFilter, setVideoCategoryFilter] = useState('');
  const [stretchingModal, setStretchingModal] = useState<{ dayId: number; dayName: string } | null>(null);
  const [selectedStretchingVideos, setSelectedStretchingVideos] = useState<Set<number>>(new Set());
  const [stretchingSearch, setStretchingSearch] = useState('');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Load training days
  const loadTrainingDays = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiCall(`/training-days/users/${userId}/training-days`);
      setTrainingDays(response.data.trainingDays);
    } catch (error) {
      console.error('Failed to load training days:', error);
      alert('Errore nel caricamento dei giorni di allenamento');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load all available videos
  const loadVideos = useCallback(async () => {
    try {
      const response = await apiCall('/admin/videos');
      setAllVideos(response.data.videos);
    } catch (error) {
      console.error('Failed to load videos:', error);
    }
  }, []);

  useEffect(() => {
    loadTrainingDays();
    loadVideos();
  }, [loadTrainingDays, loadVideos]);

  // Reset all training days
  const handleResetAllDays = async () => {
    if (!window.confirm('Sei sicuro di voler eliminare TUTTI i giorni di allenamento? Questa azione è irreversibile.')) {
      return;
    }
    try {
      await Promise.all(
        trainingDays.map(day =>
          apiCall(`/training-days/users/${userId}/training-days/${day.id}`, { method: 'DELETE' })
        )
      );
      await loadTrainingDays();
      if (onUpdate) onUpdate();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore nel reset';
      alert(`Errore nel reset: ${errorMessage}`);
      console.error('Reset all days error:', error);
    }
  };

  // Clear all videos from a single day (keeps the day)
  const handleClearDay = async (dayId: number) => {
    const day = trainingDays.find(d => d.id === dayId);
    if (!day || day.videos.length === 0) return;
    if (!window.confirm(`Sei sicuro di voler rimuovere tutti i video da "${day.dayName || `Giorno ${day.dayNumber}`}"?`)) {
      return;
    }
    try {
      await Promise.all(
        day.videos.map(video =>
          apiCall(`/training-days/users/${userId}/training-days/${dayId}/videos/${video.id}`, { method: 'DELETE' })
        )
      );
      await loadTrainingDays();
      if (onUpdate) onUpdate();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore nella pulizia del giorno';
      alert(`Errore nella pulizia del giorno: ${errorMessage}`);
      console.error('Clear day error:', error);
    }
  };

  // Confirm stretching video selection after day creation
  const handleConfirmStretching = async () => {
    if (!stretchingModal) return;
    const { dayId } = stretchingModal;
    try {
      if (selectedStretchingVideos.size > 0) {
        await Promise.all(
          Array.from(selectedStretchingVideos).map(videoId =>
            apiCall(`/training-days/users/${userId}/training-days/${dayId}/videos/${videoId}`, { method: 'POST' })
          )
        );
        await loadTrainingDays();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      alert('Errore nell\'aggiunta dei video di stretching');
      console.error('Stretching assign error:', error);
    } finally {
      setStretchingModal(null);
      setSelectedStretchingVideos(new Set());
      setStretchingSearch('');
    }
  };

  // Add new training day
  const handleAddDay = async () => {
    const nextDayNumber = trainingDays.length > 0
      ? Math.max(...trainingDays.map(d => d.dayNumber)) + 1
      : 1;
    const dayName = `Giorno ${nextDayNumber}`;

    try {
      const response = await apiCall(`/training-days/users/${userId}/training-days`, {
        method: 'POST',
        body: JSON.stringify({ dayNumber: nextDayNumber, dayName })
      });

      await loadTrainingDays();
      if (onUpdate) onUpdate();

      const stretchingVideos = allVideos.filter(v => v.muscleGroup === 'Stretching');
      if (stretchingVideos.length > 0) {
        setSelectedStretchingVideos(new Set());
        setStretchingSearch('');
        setStretchingModal({ dayId: response.data.id, dayName });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore nella creazione del giorno';
      alert(`Errore nella creazione del giorno: ${errorMessage}`);
      console.error('Create training day error:', error);
    }
  };

  // Delete training day
  const handleDeleteDay = async (dayId: number) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo giorno di allenamento?')) {
      return;
    }

    try {
      await apiCall(`/training-days/users/${userId}/training-days/${dayId}`, {
        method: 'DELETE'
      });

      await loadTrainingDays();
      if (onUpdate) onUpdate();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore nell\'eliminazione del giorno';
      alert(`Errore nell'eliminazione del giorno: ${errorMessage}`);
      console.error('Delete training day error:', error);
    }
  };

  // Update day name
  const handleUpdateDayName = async (dayId: number) => {
    try {
      await apiCall(`/training-days/users/${userId}/training-days/${dayId}`, {
        method: 'PUT',
        body: JSON.stringify({ dayName: editDayName })
      });

      await loadTrainingDays();
      setEditingDayId(null);
      setEditDayName('');
      if (onUpdate) onUpdate();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore nell\'aggiornamento del nome';
      alert(`Errore nell'aggiornamento del nome: ${errorMessage}`);
      console.error('Update day name error:', error);
    }
  };

  // Assign video to day
  const handleAssignVideo = async (dayId: number, videoId: number) => {
    try {
      await apiCall(`/training-days/users/${userId}/training-days/${dayId}/videos/${videoId}`, {
        method: 'POST'
      });

      await loadTrainingDays();
      setShowAddVideo(null);
      setVideoSearchTerm('');
      setVideoMuscleFilter('');
      setVideoCategoryFilter('');
      if (onUpdate) onUpdate();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore nell\'assegnazione del video';
      alert(`Errore nell'assegnazione del video: ${errorMessage}`);
      console.error('Assign video error:', error);
    }
  };

  // Set or clear technique for a video in a day
  const handleSetTechnique = async (dayId: number, videoId: number, techniqueId: number | null) => {
    try {
      await apiCall(`/training-days/users/${userId}/training-days/${dayId}/videos/${videoId}/technique`, {
        method: 'PUT',
        body: JSON.stringify({ techniqueId }),
      });
      await loadTrainingDays();
    } catch (error) {
      alert('Errore nell\'assegnazione della tecnica');
      console.error('Set technique error:', error);
    }
  };

  // Remove video from day
  const handleRemoveVideo = async (dayId: number, videoId: number) => {
    try {
      await apiCall(`/training-days/users/${userId}/training-days/${dayId}/videos/${videoId}`, {
        method: 'DELETE'
      });

      await loadTrainingDays();
      if (onUpdate) onUpdate();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore nella rimozione del video';
      alert(`Errore nella rimozione del video: ${errorMessage}`);
      console.error('Remove video error:', error);
    }
  };

  // Handle drag end for reordering videos
  const handleDragEnd = async (event: DragEndEvent, dayId: number) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const day = trainingDays.find(d => d.id === dayId);
    if (!day) return;

    const oldIndex = day.videos.findIndex(v => v.id === active.id);
    const newIndex = day.videos.findIndex(v => v.id === over.id);

    const newVideos = arrayMove(day.videos, oldIndex, newIndex);

    // Optimistic update
    setTrainingDays(days =>
      days.map(d =>
        d.id === dayId ? { ...d, videos: newVideos } : d
      )
    );

    // Send to backend
    try {
      const videoOrders = newVideos.map((video, index) => ({
        videoId: video.id,
        orderIndex: index
      }));

      await apiCall(`/training-days/users/${userId}/training-days/${dayId}/videos/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ videoOrders })
      });

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to reorder videos:', error);
      // Reload on error
      await loadTrainingDays();
    }
  };

  // Toggle day expansion
  const toggleDay = (dayId: number) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayId)) {
        newSet.delete(dayId);
      } else {
        newSet.add(dayId);
      }
      return newSet;
    });
  };

  const techniqueVideos = allVideos.filter(v => v.muscleGroup === 'Tecniche');

  const availableMuscleGroups = Array.from(
    new Set(allVideos.map(v => v.muscleGroup).filter(Boolean))
  ).sort() as string[];

  // Get available videos for a day (not already assigned)
  const getAvailableVideos = (dayId: number) => {
    const day = trainingDays.find(d => d.id === dayId);
    if (!day) return [];

    const assignedVideoIds = new Set(day.videos.map(v => v.id));
    let available = allVideos.filter(v => !assignedVideoIds.has(v.id));

    if (videoCategoryFilter) {
      available = available.filter(v => v.category === videoCategoryFilter);
    }

    if (videoMuscleFilter) {
      available = available.filter(v => v.muscleGroup === videoMuscleFilter);
    }

    if (!videoSearchTerm) return available;

    const searchLower = videoSearchTerm.toLowerCase();
    return available.filter(v =>
      v.title.toLowerCase().includes(searchLower) ||
      v.category.toLowerCase().includes(searchLower) ||
      (v.description && v.description.toLowerCase().includes(searchLower))
    );
  };

  if (loading && trainingDays.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Giorni di Allenamento</h3>
          <p className="text-sm text-gray-600 mt-1">
            Organizza i video in giorni customizzabili
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {trainingDays.length > 0 && (
            <button
              onClick={handleResetAllDays}
              disabled={loading}
              className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2.5 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {React.createElement(FiAlertTriangle as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
              <span>Reset tutti</span>
            </button>
          )}
          <button
            onClick={handleAddDay}
            disabled={loading}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {React.createElement(FiPlus as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
            <span>Aggiungi Giorno</span>
          </button>
        </div>
      </div>

      {/* Training Days List */}
      {trainingDays.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500 border-2 border-dashed border-gray-300">
          <p className="mb-4">Nessun giorno di allenamento creato</p>
          <button
            onClick={handleAddDay}
            disabled={loading}
            className="text-green-600 hover:text-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Crea il primo giorno
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {trainingDays.map((day) => {
            const isExpanded = expandedDays.has(day.id);
            const isEditing = editingDayId === day.id;
            const availableVideos = getAvailableVideos(day.id);

            return (
              <div key={day.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Day Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <button
                      onClick={() => toggleDay(day.id)}
                      className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      {isExpanded
                        ? React.createElement(FiChevronUp as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })
                        : React.createElement(FiChevronDown as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })
                      }
                    </button>

                    {isEditing ? (
                      <div className="flex items-center space-x-2 flex-1">
                        <input
                          type="text"
                          value={editDayName}
                          onChange={(e) => setEditDayName(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
                          placeholder="Nome giorno"
                        />
                        <button
                          onClick={() => handleUpdateDayName(day.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        >
                          {React.createElement(FiCheck as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
                        </button>
                        <button
                          onClick={() => {
                            setEditingDayId(null);
                            setEditDayName('');
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {day.dayName || `Giorno ${day.dayNumber}`}
                        </h4>
                        <button
                          onClick={() => {
                            setEditingDayId(day.id);
                            setEditDayName(day.dayName || `Giorno ${day.dayNumber}`);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          {React.createElement(FiEdit2 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
                        </button>
                        <span className="text-sm text-gray-500">
                          {day.videos.length} {day.videos.length === 1 ? 'video' : 'video'}
                        </span>
                      </div>
                    )}
                  </div>

                  {day.videos.length > 0 && (
                    <button
                      onClick={() => handleClearDay(day.id)}
                      disabled={loading}
                      className="ml-2 p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors disabled:opacity-50"
                      title="Rimuovi tutti i video da questo giorno"
                    >
                      {React.createElement(FiAlertTriangle as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteDay(day.id)}
                    disabled={loading}
                    className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                    title="Elimina questo giorno"
                  >
                    {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
                  </button>
                </div>

                {/* Day Content (Expanded) */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4">
                    {/* Videos List */}
                    {day.videos.length > 0 && (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => handleDragEnd(event, day.id)}
                      >
                        <SortableContext
                          items={day.videos.map(v => v.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {day.videos.map((video) => (
                              <SortableVideoItem
                                key={video.id}
                                video={video}
                                techniqueVideos={techniqueVideos}
                                onRemove={() => handleRemoveVideo(day.id, video.id)}
                                onSetTechnique={(techId) => handleSetTechnique(day.id, video.id, techId)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}

                    {/* Add Video Section */}
                    {showAddVideo === day.id ? (
                      <div className="border-t border-gray-200 pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-gray-900">Aggiungi Video</h5>
                          <button
                            onClick={() => {
                              setShowAddVideo(null);
                              setVideoSearchTerm('');
                              setVideoMuscleFilter('');
                              setVideoCategoryFilter('');
                            }}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              {React.createElement(FiSearch as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 text-gray-400" })}
                            </div>
                            <input
                              type="text"
                              placeholder="Cerca per nome..."
                              value={videoSearchTerm}
                              onChange={(e) => setVideoSearchTerm(e.target.value)}
                              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
                            />
                          </div>
                          <select
                            value={videoCategoryFilter}
                            onChange={(e) => setVideoCategoryFilter(e.target.value)}
                            className="py-2.5 pl-3 pr-8 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors text-sm text-gray-700 bg-white"
                          >
                            <option value="">Palestra + Corpo libero</option>
                            <option value="palestra">Palestra</option>
                            <option value="corpoLibero">Corpo libero</option>
                          </select>
                          {availableMuscleGroups.length > 0 && (
                            <select
                              value={videoMuscleFilter}
                              onChange={(e) => setVideoMuscleFilter(e.target.value)}
                              className="py-2.5 pl-3 pr-8 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors text-sm text-gray-700 bg-white"
                            >
                              <option value="">Tutti i gruppi</option>
                              {availableMuscleGroups.map(mg => (
                                <option key={mg} value={mg}>{mg}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {availableVideos.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">
                              {videoSearchTerm ? 'Nessun video trovato' : 'Tutti i video sono già assegnati'}
                            </p>
                          ) : (
                            availableVideos.map((video) => (
                              <button
                                key={video.id}
                                onClick={() => handleAssignVideo(day.id, video.id)}
                                className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-3 transition-colors"
                              >
                                <h6 className="font-medium text-gray-900 text-sm">{video.title}</h6>
                                <div className="text-xs text-gray-500 space-x-2 mt-1">
                                  <span className="capitalize">{video.category}</span>
                                  <span>•</span>
                                  <span>{formatDuration(video.duration)}</span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddVideo(day.id)}
                        className="w-full mt-2 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
                      >
                        + Aggiungi Video
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>

    {/* Stretching Modal */}
      {stretchingModal && (() => {
        const stretchingVideos = allVideos.filter(v => v.muscleGroup === 'Stretching');
        const filtered = stretchingSearch
          ? stretchingVideos.filter(v => v.title.toLowerCase().includes(stretchingSearch.toLowerCase()))
          : stretchingVideos;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Video Stretching — {stretchingModal.dayName}</h3>
                <p className="text-sm text-gray-500 mt-1">Seleziona i video di stretching da aggiungere (opzionale)</p>
              </div>
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  {React.createElement(FiSearch as React.ComponentType<{ className?: string }>, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" })}
                  <input
                    type="text"
                    placeholder="Cerca video..."
                    value={stretchingSearch}
                    onChange={(e) => setStretchingSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filtered.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">Nessun video trovato</p>
                ) : (
                  filtered.map(video => {
                    const selected = selectedStretchingVideos.has(video.id);
                    return (
                      <button
                        key={video.id}
                        onClick={() => {
                          setSelectedStretchingVideos(prev => {
                            const next = new Set(prev);
                            selected ? next.delete(video.id) : next.add(video.id);
                            return next;
                          });
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${
                          selected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 ${
                          selected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                        }`}>
                          {selected && React.createElement(FiCheck as React.ComponentType<{ className?: string }>, { className: "w-3 h-3 text-white" })}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{video.title}</span>
                      </button>
                    );
                  })
                )}
              </div>
              <div className="p-4 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => {
                    setStretchingModal(null);
                    setSelectedStretchingVideos(new Set());
                    setStretchingSearch('');
                  }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Salta
                </button>
                <button
                  onClick={handleConfirmStretching}
                  disabled={selectedStretchingVideos.size === 0}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedStretchingVideos.size > 0
                    ? `Aggiungi ${selectedStretchingVideos.size} video`
                    : 'Aggiungi selezionati'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};

export default TrainingDaysManager;
