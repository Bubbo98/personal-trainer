import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiCheck, FiTrash2 } from 'react-icons/fi';
import Button from '../../../../components/ui/Button';
import { ErrorState, LoadingState } from '../../../../components/ui/States';
import { useToast } from '../../../../components/ui/Toast';
import { adminApi } from '../../../../lib/api';
import { useErrorMessage } from '../../../../lib/errors';
import { formatDuration } from '../../../../lib/format';
import SearchInput from '../../components/SearchInput';
import { adminKeys, useLibrary, useUserVideos } from '../../queries';
import type { AdminVideo } from '../../types';

const matches = (video: AdminVideo, term: string) =>
  !term || [video.title, video.category, video.description ?? ''].some((v) => v.toLowerCase().includes(term));

const VideoTile = ({ video, assigned, busy, onClick }: { video: AdminVideo; assigned: boolean; busy: boolean; onClick: () => void }) => {
  const { t } = useTranslation('admin');
  return (
    <li className={`bg-white rounded-xl p-4 hover:shadow-md transition-shadow flex flex-col ${assigned ? 'border-2 border-green-200' : 'border border-gray-200'}`}>
      <h4 className="font-semibold text-gray-900 mb-1 flex items-start gap-1">
        {assigned && <FiCheck className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" aria-hidden />}
        {video.title}
      </h4>
      <p className="text-xs text-gray-500 mb-3">
        {t(`categories.${video.category as 'palestra'}`, { defaultValue: video.category })} · {formatDuration(video.duration)}
      </p>
      <Button
        size="sm"
        className={`mt-auto ${assigned ? '' : '!bg-green-600 !border-green-600 hover:!bg-green-700'}`}
        variant={assigned ? 'danger' : 'primary'}
        loading={busy}
        onClick={onClick}
        icon={assigned ? <FiTrash2 className="w-4 h-4" aria-hidden /> : undefined}
      >
        {assigned ? t('userVideos.revoke') : t('userVideos.assign')}
      </Button>
    </li>
  );
};

/** Single videos the client can watch outside the training days. */
const UserVideosPanel = ({ userId }: { userId: number }) => {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const assigned = useUserVideos(userId);
  const library = useLibrary();
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();

  const change = useMutation({
    mutationFn: ({ video, grant }: { video: AdminVideo; grant: boolean }) =>
      grant ? adminApi.post(`/admin/users/${userId}/videos/${video.id}`) : adminApi.delete(`/admin/users/${userId}/videos/${video.id}`),
    onSuccess: (_, { grant }) => {
      toast.success(grant ? t('userVideos.assignedToast') : t('userVideos.revokedToast'));
      queryClient.invalidateQueries({ queryKey: adminKeys.userVideos(userId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.days(userId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.users });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const lists = useMemo(() => {
    const mine = assigned.data ?? [];
    const ids = new Set(mine.map((v) => v.id));
    const others = (library.data ?? []).filter((v) => !ids.has(v.id));
    return { mine: mine.filter((v) => matches(v, term)), others: others.filter((v) => matches(v, term)) };
  }, [assigned.data, library.data, term]);

  if (assigned.isPending || library.isPending) return <LoadingState />;
  if (assigned.isError) return <ErrorState message={errorMessage(assigned.error)} onRetry={() => assigned.refetch()} />;

  const busy = (video: AdminVideo) => change.isPending && change.variables?.video.id === video.id;
  const grid = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <SearchInput label={t('userVideos.searchLabel')} placeholder={t('userVideos.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 max-w-md" />
        {term && <p className="text-sm text-gray-500">{t('userVideos.found', { count: lists.mine.length + lists.others.length })}</p>}
      </div>

      {lists.mine.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('userVideos.assigned', { count: lists.mine.length })}</h3>
          <ul className={grid}>
            {lists.mine.map((video) => (
              <VideoTile key={video.id} video={video} assigned busy={busy(video)} onClick={() => change.mutate({ video, grant: false })} />
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('userVideos.available', { count: lists.others.length })}</h3>
        {lists.others.length === 0 ? (
          <p className="bg-white rounded-xl p-8 text-center text-gray-500">{term ? t('userVideos.noneFound', { query: search }) : t('userVideos.allAssigned')}</p>
        ) : (
          <ul className={grid}>
            {lists.others.map((video) => (
              <VideoTile key={video.id} video={video} assigned={false} busy={busy(video)} onClick={() => change.mutate({ video, grant: true })} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default UserVideosPanel;
