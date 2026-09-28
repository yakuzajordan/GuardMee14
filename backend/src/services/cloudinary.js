import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const bufferToStream = (buffer) => {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
};

export const uploadMedia = async (file, options = {}) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    const isVideo = file.mimetype?.startsWith('video');
    return {
      url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      publicId: `dev_${Date.now()}`,
      type: isVideo ? 'video' : 'image',
      thumbnail: null,
      dev: true,
    };
  }

  return new Promise((resolve, reject) => {
    const isVideo = file.mimetype?.startsWith('video');
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'guardmee/incidents',
        resource_type: isVideo ? 'video' : 'image',
        ...(isVideo && { eager: [{ width: 400, crop: 'scale', format: 'jpg' }] }),
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          type: isVideo ? 'video' : 'image',
          thumbnail: isVideo ? result.eager?.[0]?.secure_url : result.secure_url,
        });
      }
    );
    bufferToStream(file.buffer).pipe(uploadStream);
  });
};

export const deleteMedia = async (publicId, type = 'image') => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || publicId.startsWith('dev_')) return;
  await cloudinary.uploader.destroy(publicId, {
    resource_type: type === 'video' ? 'video' : 'image',
  });
};
