import { useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiEdit, FiPlay, FiPlus, FiTrash2 } from 'react-icons/fi';
import Button from '../../../components/ui/Button';
import { useConfirm } from '../../../components/ui/ConfirmDialog';
import { inputClass } from '../../../components/ui/Field';
import Modal from '../../../components/ui/Modal';
import { ErrorState, LoadingState } from '../../../components/ui/States';
import { useToast } from '../../../components/ui/Toast';
import { adminApi } from '../../../lib/api';
import { useErrorMessage } from '../../../lib/errors';
import { formatDate, formatDuration } from '../../../lib/format';
import Pagination from '../components/Pagination';
import SearchInput from '../components/SearchInput';
import { adminKeys, useVideoPage } from '../queries';
import { MUSCLE_GROUPS, type AdminVideo, type CreateVideoInput, type VideoInput } from '../types';
import ThumbnailUploader from './ThumbnailUploader';
import { CreateVideoModal, EditVideoModal } from './VideoForms';

/** Fewer cards per page on small screens. */
const pageSize = () => (window.innerWidth < 768 ? 6 : window.innerWidth < 1024 ? 12 : 21);

const PreviewModal = ({ video, onClose }: { video: AdminVideo; onClose: () => void }) => {
  const { t } = useTranslation('admin');
  const preview = useQuery({
    queryKey: ['admin', 'videos', 'preview', video.id],
    queryFn: ({ signal }) => adminApi.get<{ video: AdminVideo }>(`/admin/videos/${video.id}/preview`, signal).then((d) => d.video),
    staleTime: 30 * 60_000,
  });
  return (
    <Modal title={video.title} onClose={onClose} size="xl" variant="media">
      <div className="bg-black">
        {preview.isPending ? (
          <LoadingState />
        ) : preview.data?.signedUrl ? (
          <video controls autoPlay playsInline className="w-full max-h-[70vh]" src={preview.data.signedUrl} />
        ) : (
          <p className="aspect-video flex items-center justify-center text-gray-300 px-6 text-center">{t('videos.previewFailed')}</p>
        )}
      </div>
      <div className="px-5 py-4">
        {video.description && <p className="text-gray-700 mb-2 whitespace-pre-wrap">{video.description}</p>}
        <p className="text-sm text-gray-500 flex gap-4">
          <span>{formatDuration(video.duration)}</span>
          <span>{t(`categories.${video.category as 'palestra'}`, { defaultValue: video.category })}</span>
        </p>
      </div>
    </Modal>
  );
};

/** The video library: search, filters, uploads, photos. */
const VideosPage = () => {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const confirm = useConfirm();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const [limit] = useState(pageSize);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const search = useDeferredValue(searchInput.trim());
  const [muscleGroup, setMuscleGroup] = useState('');
  const [missingThumbnail, setMissingThumbnail] = useState(false);
  const [modal, setModal] = useState<{ type: 'create' } | { type: 'edit' | 'preview'; video: AdminVideo } | null>(null);

  const videos = useVideoPage({ page, limit, search, muscleGroup, missingThumbnail });
  const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.videos });

  const create = useMutation({
    mutationFn: (input: CreateVideoInput) => adminApi.post('/admin/videos', input),
    onSuccess: () => {
      setModal(null);
      setPage(1);
      refresh();
      toast.success(t('videos.created'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: number; input: VideoInput }) => adminApi.put(`/admin/videos/${id}`, input),
    onSuccess: () => {
      setModal(null);
      refresh();
      toast.success(t('videos.updated'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = async (video: AdminVideo) => {
    if (!(await confirm({ title: t('videos.deleteTitle', { title: video.title }), message: t('videos.deleteMessage'), confirmLabel: t('actions.delete'), danger: true }))) return;
    try {
      await adminApi.delete(`/admin/videos/${video.id}`);
      refresh();
      toast.success(t('videos.deleted'));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  // A new photo: patch the cached pages right away, then refresh the counts
  const thumbnailChanged = (videoId: number, thumbnailKey: string) => {
    queryClient.setQueriesData<{ videos: AdminVideo[] }>({ queryKey: adminKeys.videos }, (data) =>
      data?.videos ? { ...data, videos: data.videos.map((v) => (v.id === videoId ? { ...v, thumbnailKey } : v)) } : data,
    );
    setModal((m) => (m && m.type !== 'create' && m.video.id === videoId ? { ...m, video: { ...m.video, thumbnailKey } } : m));
    queryClient.invalidateQueries({ queryKey: adminKeys.videos, refetchType: 'none' });
  };

  const filtering = Boolean(search || muscleGroup || missingThumbnail);
  const data = videos.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">{t('videos.title')}</h2>
        <Button onClick={() => setModal({ type: 'create' })} icon={<FiPlus className="w-4 h-4" aria-hidden />}>
          {t('videos.newVideo')}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        <SearchInput
          label={t('videos.searchLabel')}
          placeholder={t('videos.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
          className="w-full sm:flex-1 sm:min-w-[200px] sm:max-w-md"
        />
        <label className="w-full sm:w-auto">
          <span className="sr-only">{t('videos.muscleFilterLabel')}</span>
          <select
            value={muscleGroup}
            onChange={(e) => {
              setMuscleGroup(e.target.value);
              setPage(1);
            }}
            className={`${inputClass} appearance-none pr-10 select-arrow text-sm sm:w-auto`}
          >
            <option value="">{t('videos.allMuscleGroups')}</option>
            <option value="__none__">{t('videos.noMuscleGroup')}</option>
            {MUSCLE_GROUPS.map((group) => (
              <option key={group} value={group}>
                {t(`muscleGroups.${group}`)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          aria-pressed={missingThumbnail}
          onClick={() => {
            setMissingThumbnail(!missingThumbnail);
            setPage(1);
          }}
          className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            missingThumbnail
              ? 'bg-gray-900 text-white border-gray-900'
              : data?.missingThumbnailCount
                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                : 'bg-white text-gray-500 border-gray-200'
          }`}
        >
          {t('videos.missingThumbnails', { count: data?.missingThumbnailCount ?? 0 })}
        </button>
        {data && (
          <p className="text-sm text-gray-500 sm:ml-auto" aria-live="polite">
            {t('videos.count', { count: data.totalCount })}
          </p>
        )}
      </div>

      {videos.isPending ? (
        <LoadingState />
      ) : videos.isError ? (
        <ErrorState message={errorMessage(videos.error)} onRetry={() => videos.refetch()} />
      ) : data!.videos.length === 0 ? (
        <p className="text-center py-12 text-gray-500">{filtering ? t('videos.noResults') : t('videos.emptyTitle')}</p>
      ) : (
        <ul className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity ${videos.isPlaceholderData ? 'opacity-60' : ''}`}>
          {data!.videos.map((video) => (
            <li key={video.id} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
              <div className="p-2 pb-0">
                <ThumbnailUploader video={video} onChange={(key) => thumbnailChanged(video.id, key)} />
              </div>
              <div className="p-3 sm:p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1 line-clamp-2">{video.title}</h3>
                {video.description && <p className="text-sm text-gray-600 line-clamp-2 whitespace-pre-wrap mb-2">{video.description}</p>}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                  <span>{t(`categories.${video.category as 'palestra'}`, { defaultValue: video.category })}</span>
                  <span>{formatDuration(video.duration)}</span>
                </div>
                {video.muscleGroup && (
                  <span className="self-start mb-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {t(`muscleGroups.${video.muscleGroup as 'Tecniche'}`, { defaultValue: video.muscleGroup })}
                  </span>
                )}
                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                  <span>{t('videos.clients', { count: video.userCount ?? 0 })}</span>
                  <span>{t('videos.createdOn', { date: formatDate(video.createdAt) })}</span>
                </div>
                <p className="hidden sm:block text-xs text-gray-500 bg-gray-100 rounded p-2 mb-3 break-all">
                  <strong>{t('videos.file')}:</strong> {video.filePath}
                </p>
                <div className="mt-auto grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setModal({ type: 'preview', video })} className="bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 flex justify-center" aria-label={`${t('videos.preview')}: ${video.title}`}>
                    <FiPlay className="w-4 h-4" aria-hidden />
                  </button>
                  <button type="button" onClick={() => setModal({ type: 'edit', video })} className="bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 flex justify-center" aria-label={`${t('videos.edit')}: ${video.title}`}>
                    <FiEdit className="w-4 h-4" aria-hidden />
                  </button>
                  <button type="button" onClick={() => remove(video)} className="bg-red-600 text-white py-2.5 rounded-xl hover:bg-red-700 flex justify-center" aria-label={`${t('videos.delete')}: ${video.title}`}>
                    <FiTrash2 className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && (data.totalPages ?? 1) > 1 && (
        <div className="rounded-xl overflow-hidden shadow">
          <Pagination page={page} pages={data.totalPages ?? 1} total={data.totalCount} onChange={setPage} />
        </div>
      )}

      {modal?.type === 'create' && <CreateVideoModal saving={create.isPending} onSubmit={(input) => create.mutate(input)} onClose={() => setModal(null)} />}
      {modal?.type === 'edit' && (
        <EditVideoModal
          video={modal.video}
          saving={update.isPending}
          onSubmit={(input) => update.mutate({ id: modal.video.id, input })}
          onThumbnail={(key) => thumbnailChanged(modal.video.id, key)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'preview' && <PreviewModal video={modal.video} onClose={() => setModal(null)} />}
    </div>
  );
};

export default VideosPage;
