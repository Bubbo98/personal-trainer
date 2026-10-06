import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FiUpload } from 'react-icons/fi';
import Button from '../../../components/ui/Button';
import { SelectField, TextAreaField, TextField, inputClass } from '../../../components/ui/Field';
import Modal from '../../../components/ui/Modal';
import { Alert } from '../../../components/ui/States';
import { adminApi } from '../../../lib/api';
import { useErrorMessage } from '../../../lib/errors';
import { formatDuration, formatFileSize } from '../../../lib/format';
import { MUSCLE_GROUPS, VIDEO_CATEGORIES, type AdminVideo, type CreateVideoInput, type VideoInput } from '../types';
import ThumbnailUploader from './ThumbnailUploader';
import { putFile, videoDuration } from './upload';

const MuscleGroupSelect = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const { t } = useTranslation('admin');
  return (
    <SelectField label={t('videos.form.muscleGroup')} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t('videos.form.none')}</option>
      {MUSCLE_GROUPS.map((group) => (
        <option key={group} value={group}>
          {t(`muscleGroups.${group}`)}
        </option>
      ))}
    </SelectField>
  );
};

/** New video: upload the file to R2 first, then save its details. */
export const CreateVideoModal = ({ saving, onSubmit, onClose }: { saving: boolean; onSubmit: (input: CreateVideoInput) => void; onClose: () => void }) => {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const [form, setForm] = useState<CreateVideoInput>({ title: '', description: '', filePath: '', duration: 0, category: '', muscleGroup: '' });
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof CreateVideoInput>(key: K, value: CreateVideoInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const uploading = progress !== null;

  const choose = async (chosen: File | undefined) => {
    setError(null);
    if (!chosen) return;
    if (!chosen.type.startsWith('video/')) {
      setError(t('videos.form.onlyVideos'));
      return;
    }
    setFile(chosen);
    set('filePath', '');
    const seconds = await videoDuration(chosen);
    if (seconds) set('duration', seconds);
  };

  const upload = async () => {
    if (!file || !form.category) return;
    setError(null);
    setProgress(0);
    try {
      const { uploadUrl, filePath } = await adminApi.post<{ uploadUrl: string; filePath: string }>('/admin/videos/upload-url', {
        fileName: file.name,
        fileType: file.type,
        category: form.category,
      });
      await putFile(uploadUrl, file, file.type, setProgress);
      set('filePath', filePath);
    } catch (err) {
      setError(errorMessage(err, t('videos.form.uploadFailed')));
    } finally {
      setProgress(null);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.filePath) {
      setError(t('videos.form.uploadFirst'));
      return;
    }
    onSubmit({ ...form, title: form.title.trim(), description: form.description.trim() });
  };

  return (
    <Modal title={t('videos.form.createTitle')} onClose={onClose} dismissible={!uploading && !saving}>
      <form onSubmit={submit} className="px-5 py-4 space-y-4">
        <TextField label={t('videos.form.videoTitle')} required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder={t('videos.form.titlePlaceholder')} data-autofocus />
        <TextAreaField label={t('videos.form.description')} rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder={t('videos.form.descriptionPlaceholder')} />
        <SelectField
          label={t('videos.form.category')}
          required
          value={form.category}
          disabled={uploading || Boolean(form.filePath)}
          onChange={(e) => set('category', e.target.value as CreateVideoInput['category'])}
        >
          <option value="">{t('videos.form.chooseCategory')}</option>
          {VIDEO_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t(`categories.${category}`)}
            </option>
          ))}
        </SelectField>
        <MuscleGroupSelect value={form.muscleGroup} onChange={(value) => set('muscleGroup', value)} />

        <div className="space-y-2">
          <label htmlFor="video-file" className="block text-sm font-medium text-gray-700">
            {t('videos.form.file')}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="video-file"
              type="file"
              accept="video/*"
              disabled={uploading || !form.category}
              onChange={(e) => choose(e.target.files?.[0])}
              className="flex-1 min-w-0 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
            {file && !form.filePath && (
              <Button variant="secondary" size="sm" onClick={upload} loading={uploading} icon={<FiUpload className="w-4 h-4" aria-hidden />}>
                {t('videos.form.upload')}
              </Button>
            )}
          </div>
          {!form.category && <p className="text-xs text-orange-600">{t('videos.form.chooseCategoryFirst')}</p>}
          {file && <p className="text-sm text-gray-600">{t('videos.form.selectedFile', { name: file.name, size: formatFileSize(file.size) })}</p>}
          {uploading && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('videos.form.uploading')}</span>
                <span className="font-semibold text-blue-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5" role="progressbar" aria-valuenow={progress ?? 0} aria-valuemin={0} aria-valuemax={100}>
                <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {form.filePath && <Alert kind="success">{t('videos.form.uploaded', { path: form.filePath })}</Alert>}
        </div>

        <div className="grid grid-cols-2 gap-4 items-start">
          <TextField
            label={t('videos.form.duration')}
            hint={t('videos.form.durationHint')}
            type="number"
            min={0}
            required
            value={form.duration}
            onChange={(e) => set('duration', Math.max(0, Number(e.target.value) || 0))}
          />
          <p className="text-xs text-gray-500 pt-7">{t('videos.form.photoAfterCreate')}</p>
        </div>

        {error && <Alert kind="error">{error}</Alert>}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={uploading || saving}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" fullWidth loading={saving} disabled={uploading}>
            {t('videos.form.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

/** Edit title, description, muscle group and photo of a video. */
export const EditVideoModal = ({
  video,
  saving,
  onSubmit,
  onThumbnail,
  onClose,
}: {
  video: AdminVideo;
  saving: boolean;
  onSubmit: (input: VideoInput) => void;
  onThumbnail: (key: string) => void;
  onClose: () => void;
}) => {
  const { t } = useTranslation('admin');
  const [form, setForm] = useState<VideoInput>({ title: video.title, description: video.description ?? '', muscleGroup: video.muscleGroup ?? '' });

  return (
    <Modal title={t('videos.form.editTitle')} onClose={onClose} dismissible={!saving}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ ...form, title: form.title.trim(), description: form.description.trim() });
        }}
        className="px-5 py-4 space-y-4"
      >
        <TextField label={t('videos.form.videoTitle')} required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} data-autofocus />
        <TextAreaField label={t('videos.form.description')} rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-1.5">{t('videos.form.photo')}</p>
          <ThumbnailUploader video={video} onChange={onThumbnail} />
          <p className="text-xs text-gray-400 mt-1">{t('videos.form.photoSavesNow')}</p>
        </div>
        <MuscleGroupSelect value={form.muscleGroup} onChange={(muscleGroup) => setForm((f) => ({ ...f, muscleGroup }))} />
        <div className={`${inputClass} bg-gray-50 text-xs text-gray-500 space-y-0.5 break-all`}>
          <p>{t('videos.form.fileInfo', { path: video.filePath })}</p>
          <p>{t('videos.form.categoryInfo', { category: t(`categories.${video.category as 'palestra'}`, { defaultValue: video.category }) })}</p>
          <p>{t('videos.form.durationInfo', { duration: formatDuration(video.duration) })}</p>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={saving}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" fullWidth loading={saving}>
            {t('actions.saveChanges')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
