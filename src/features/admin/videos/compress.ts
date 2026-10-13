/**
 * Shrinks a video in the admin's browser before upload: phones record exercise clips at
 * 1080p 60 fps ~16 Mbps (~100 MB a minute), too heavy to stream in a gym on 4G.
 * Same settings as the files already in R2: short side max 1080 px, 30 fps, ~4 Mbps H.264
 * in MP4 (~25 MB a minute). Uses the device's hardware encoder (WebCodecs).
 */

const MAX_SHORT_SIDE = 1080;
const FRAME_RATE = 30;
const BITRATE = 4_000_000;
/** Files already at or below this are uploaded as they are. */
const LIGHT_ENOUGH_BITRATE = 6_000_000;

/**
 * The compressed file (MP4, same base name), or null when the original should be uploaded:
 * already light, or the browser can't compress it (no WebCodecs, unsupported codec, error).
 */
export async function compressVideo(file: File, onProgress?: (percent: number) => void): Promise<File | null> {
  try {
    const { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, Quality, canEncodeVideo } = await import('mediabunny');
    if (!(await canEncodeVideo('avc'))) return null;

    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track) return null;
    const [width, height, stats] = await Promise.all([track.getDisplayWidth(), track.getDisplayHeight(), track.computePacketStats(200)]);
    const shortSide = Math.min(width, height);
    if (shortSide <= MAX_SHORT_SIDE && stats.averageBitrate <= LIGHT_ENOUGH_BITRATE && stats.averagePacketRate <= FRAME_RATE + 1) return null;

    // Only the short side is set (the other follows the aspect ratio, rotation included)
    const size = shortSide <= MAX_SHORT_SIDE ? {} : width < height ? { width: MAX_SHORT_SIDE } : { height: MAX_SHORT_SIDE };
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
    const conversion = await Conversion.init({
      input,
      output,
      video: { ...size, frameRate: FRAME_RATE, codec: 'avc', quality: new Quality({ bitrate: BITRATE, bitrateMode: 'variable' }) },
      showWarnings: false,
    });
    // Never lose the sound or the picture: then the original goes up instead
    if (!conversion.isValid || conversion.discardedTracks.length) return null;

    conversion.onProgress = (progress) => onProgress?.(Math.round(progress * 100));
    await conversion.execute();
    const buffer = output.target.buffer;
    if (!buffer || buffer.byteLength >= file.size) return null;

    const name = `${file.name.replace(/\.[^.]+$/, '')}.mp4`;
    return new File([buffer], name, { type: 'video/mp4' });
  } catch (err) {
    console.warn('Video compression skipped:', err);
    return null;
  }
}
