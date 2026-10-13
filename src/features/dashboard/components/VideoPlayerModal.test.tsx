import { fireEvent, screen, waitFor } from '@testing-library/react';
import { mockApi, renderWithProviders } from '../../../test/render';
import { keys, useVideos } from '../queries';
import VideoPlayerModal from './VideoPlayerModal';

const url = (signature: string) => `https://r2.example/bucket/palestra/Squat.MOV?X-Amz-Signature=${signature}`;
const videoList = (signature: string) => ({ videos: [{ id: 1, title: 'Squat', signedUrl: url(signature) }] });

/** The video list is on screen behind the player, as in the dashboard. */
const List = () => {
  useVideos();
  return null;
};

const renderPlayer = async () => {
  const { queryClient } = renderWithProviders(
    <>
      <List />
      <VideoPlayerModal video={{ title: 'Squat', signedUrl: url('old') }} onClose={() => {}} />
    </>,
  );
  await waitFor(() => expect(queryClient.getQueryData(keys.videos)).toBeDefined());
};

const videoElement = () => document.querySelector('video')!;

describe('VideoPlayerModal', () => {
  it('an expired link is replaced by a fresh one, without closing the player', async () => {
    let signature = 'old';
    mockApi({ 'GET /videos': () => videoList(signature) });
    await renderPlayer();
    expect(videoElement()).toHaveAttribute('src', url('old'));

    signature = 'new';
    fireEvent.error(videoElement());

    await waitFor(() => expect(videoElement()).toHaveAttribute('src', url('new')));
    expect(screen.queryByText(/non si carica/)).not.toBeInTheDocument();
  });

  it('gives up after one retry and offers to reload', async () => {
    let signature = 'old';
    mockApi({ 'GET /videos': () => videoList(signature) });
    await renderPlayer();

    signature = 'new';
    fireEvent.error(videoElement());
    await waitFor(() => expect(videoElement()).toHaveAttribute('src', url('new')));
    fireEvent.error(videoElement());

    expect(await screen.findByText('Il video non si carica. Riprova tra qualche istante.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ricarica video' })).toBeInTheDocument();
  });
});
