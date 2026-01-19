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
  FiMenu
} from 'react-icons/fi';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
}

interface Props {
  userId: number;
  onUpdate?: () => void;
}

// Sortable video item component
const SortableVideoItem: React.FC<{
  video: TrainingDayVideo;
  onRemove: () => void;
}> = ({ video, onRemove }) => {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between"
    >
      <div className="flex items-center space-x-3 flex-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          {React.createElement(FiMenu as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
        </button>
        <div className="flex-1">
          <h5 className="font-medium text-gray-900 text-sm">{video.title}</h5>
          <div className="text-xs text-gray-500 space-x-2">
            <span className="capitalize">{video.category}</span>
            <span>•</span>
            <span>{formatDuration(video.duration)}</span>
          </div>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      >
        {React.createElement(FiTrash2 as React.ComponentType<{ className?: string }>, { className: "w-4 h-4" })}
      </button>
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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
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

  // Add new training day
  const handleAddDay = async () => {
    const nextDayNumber = trainingDays.length > 0
      ? Math.max(...trainingDays.map(d => d.dayNumber)) + 1
      : 1;

    try {
      await apiCall(`/training-days/users/${userId}/training-days`, {
        method: 'POST',
        body: JSON.stringify({
          dayNumber: nextDayNumber,
          dayName: `Giorno ${nextDayNumber}`
        })
      });

      await loadTrainingDays();
      if (onUpdate) onUpdate();
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
      if (onUpdate) onUpdate();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore nell\'assegnazione del video';
      alert(`Errore nell'assegnazione del video: ${errorMessage}`);
      console.error('Assign video error:', error);
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

  // Get available videos for a day (not already assigned)
  const getAvailableVideos = (dayId: number) => {
    const day = trainingDays.find(d => d.id === dayId);
    if (!day) return [];

    const assignedVideoIds = new Set(day.videos.map(v => v.id));
    const available = allVideos.filter(v => !assignedVideoIds.has(v.id));

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Giorni di Allenamento</h3>
          <p className="text-sm text-gray-600 mt-1">
            Organizza i video in giorni customizzabili
          </p>
        </div>
        <button
          onClick={handleAddDay}
          disabled={loading}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {React.createElement(FiPlus as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
          <span>Aggiungi Giorno</span>
        </button>
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
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                          className="flex-1 px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
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

                  <button
                    onClick={() => handleDeleteDay(day.id)}
                    className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                                onRemove={() => handleRemoveVideo(day.id, video.id)}
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
                            }}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            {React.createElement(FiX as React.ComponentType<{ className?: string }>, { className: "w-5 h-5" })}
                          </button>
                        </div>

                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            {React.createElement(FiSearch as React.ComponentType<{ className?: string }>, { className: "w-4 h-4 text-gray-400" })}
                          </div>
                          <input
                            type="text"
                            placeholder="Cerca video..."
                            value={videoSearchTerm}
                            onChange={(e) => setVideoSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800"
                          />
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
                                className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-3 transition-colors"
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
                        className="w-full mt-2 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
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
  );
};

export default TrainingDaysManager;
