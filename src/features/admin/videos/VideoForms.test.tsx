import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ADMIN_TOKEN_KEY } from '../../../lib/api';
import { mockApi, renderWithProviders } from '../../../test/render';
import { compressVideo } from './compress';
import { putFile } from './upload';
import { CreateVideoModal } from './VideoForms';

vi.mock('./compress', () => ({ compressVideo: vi.fn(async () => null) }));

vi.mock('./upload', () => ({
  putFile: vi.fn(async () => {}),
  videoDuration: vi.fn(async () => 42),
}));

const video = new File(['data'], 'panca.mp4', { type: 'video/mp4' });

describe('CreateVideoModal', () => {
  beforeEach(() => {
    localStorage.setItem(ADMIN_TOKEN_KEY, 'admin-token');
    vi.mocked(putFile).mockReset().mockResolvedValue();
    vi.mocked(compressVideo).mockReset().mockResolvedValue(null);
  });

  const fill = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByLabelText(/Titolo/), 'Panca piana');
    await user.selectOptions(screen.getByLabelText(/Categoria/), 'palestra');
    await user.upload(screen.getByLabelText('File video'), video);
  };

  it('uploads the file when saving, then saves the video', async () => {
    const { calls } = mockApi({ 'POST /admin/videos/upload-url': { uploadUrl: 'https://r2.test/put', filePath: 'palestra/panca.mp4' } });
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<CreateVideoModal saving={false} onSubmit={onSubmit} onClose={() => {}} />);
    await fill(user);
    expect(screen.queryByRole('button', { name: /R2/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Crea video' }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(calls[0].body).toEqual({ fileName: 'panca.mp4', fileType: 'video/mp4', category: 'palestra' });
    expect(putFile).toHaveBeenCalledWith('https://r2.test/put', video, 'video/mp4', expect.any(Function));
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Panca piana', description: '', filePath: 'palestra/panca.mp4', duration: 42, category: 'palestra', muscleGroup: '' });
  });

  it('uploads the compressed MP4 in place of the heavy original', async () => {
    const compressed = new File(['small'], 'panca.mp4', { type: 'video/mp4' });
    vi.mocked(compressVideo).mockResolvedValue(compressed);
    const { calls } = mockApi({ 'POST /admin/videos/upload-url': { uploadUrl: 'https://r2.test/put', filePath: 'palestra/panca.mp4' } });
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<CreateVideoModal saving={false} onSubmit={onSubmit} onClose={() => {}} />);
    await user.type(screen.getByLabelText(/Titolo/), 'Panca piana');
    await user.selectOptions(screen.getByLabelText(/Categoria/), 'palestra');
    await user.upload(screen.getByLabelText('File video'), new File(['big'], 'Panca.MOV', { type: 'video/quicktime' }));
    await user.click(screen.getByRole('button', { name: 'Crea video' }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(calls[0].body).toEqual({ fileName: 'panca.mp4', fileType: 'video/mp4', category: 'palestra' });
    expect(putFile).toHaveBeenCalledWith('https://r2.test/put', compressed, 'video/mp4', expect.any(Function));
  });

  it('saves nothing when the upload fails, and retries it on the next save', async () => {
    mockApi({ 'POST /admin/videos/upload-url': { uploadUrl: 'https://r2.test/put', filePath: 'palestra/panca.mp4' } });
    vi.mocked(putFile).mockRejectedValueOnce(new Error('Network error'));
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<CreateVideoModal saving={false} onSubmit={onSubmit} onClose={() => {}} />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Crea video' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Crea video' }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(putFile).toHaveBeenCalledTimes(2);
  });

  it('asks for the file before saving', async () => {
    const { calls } = mockApi({});
    const user = userEvent.setup();
    renderWithProviders(<CreateVideoModal saving={false} onSubmit={vi.fn()} onClose={() => {}} />);
    await user.type(screen.getByLabelText(/Titolo/), 'Panca piana');
    await user.selectOptions(screen.getByLabelText(/Categoria/), 'palestra');
    await user.click(screen.getByRole('button', { name: 'Crea video' }));

    expect(await screen.findByText('Scegli il file del video.')).toBeInTheDocument();
    expect(calls).toEqual([]);
  });
});
