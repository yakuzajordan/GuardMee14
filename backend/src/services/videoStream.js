import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadMedia } from './cloudinary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads/live');

const activeStreams = new Map();

export const createStream = (streamId, metadata) => {
  activeStreams.set(streamId, {
    chunks: [],
    metadata,
    startedAt: new Date(),
    totalBytes: 0,
  });
};

export const appendChunk = (streamId, chunkBase64) => {
  const stream = activeStreams.get(streamId);
  if (!stream) return false;
  const buffer = Buffer.from(chunkBase64, 'base64');
  stream.chunks.push(buffer);
  stream.totalBytes += buffer.length;
  if (stream.totalBytes > 50 * 1024 * 1024) {
    throw new Error('Taille maximale du flux dépassée (50 Mo)');
  }
  return true;
};

export const finalizeStream = async (streamId) => {
  const stream = activeStreams.get(streamId);
  if (!stream) throw new Error('Flux introuvable');

  const videoBuffer = Buffer.concat(stream.chunks);
  activeStreams.delete(streamId);

  if (videoBuffer.length === 0) throw new Error('Aucune donnée vidéo reçue');

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${streamId}_${Date.now()}.webm`;
  const localPath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(localPath, videoBuffer);

  const file = {
    buffer: videoBuffer,
    mimetype: 'video/webm',
    originalname: filename,
  };

  let uploaded;
  try {
    uploaded = await uploadMedia(file);
  } catch {
    uploaded = {
      url: `/uploads/live/${filename}`,
      publicId: filename,
      type: 'video',
      localPath,
      dev: true,
    };
  }

  return {
    videoBuffer,
    localPath,
    filename,
    uploaded,
    metadata: stream.metadata,
    duration: Date.now() - stream.startedAt.getTime(),
  };
};

export const getStream = (streamId) => activeStreams.get(streamId);

export const cancelStream = (streamId) => activeStreams.delete(streamId);
