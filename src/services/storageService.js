import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../config/firebase';

export const uploadIncidentMedia = async (file, incidentId) => {
  if (!isFirebaseConfigured() || !storage) {
    return {
      url: URL.createObjectURL(file),
      publicId: `local_${Date.now()}`,
      type: file.type.startsWith('video') ? 'video' : 'image',
      thumbnail: null,
      dev: true,
    };
  }

  const ext = file.name.split('.').pop();
  const path = `incidents/${incidentId}/${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);

  return {
    url,
    publicId: path,
    type: file.type.startsWith('video') ? 'video' : 'image',
    thumbnail: file.type.startsWith('video') ? null : url,
  };
};

export const uploadMultipleMedia = async (files, incidentId) => {
  const results = [];
  for (const file of files) {
    const result = await uploadIncidentMedia(file, incidentId);
    if (result) results.push(result);
  }
  return results;
};
