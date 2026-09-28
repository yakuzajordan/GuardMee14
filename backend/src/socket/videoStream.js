import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import Incident from '../models/Incident.js';
import Notification from '../models/Notification.js';
import {
  createStream, appendChunk, finalizeStream, cancelStream,
} from '../services/videoStream.js';
import { analyzeVideoContent, routeToService } from '../services/aiVision.js';
import { calculateCredibility } from '../services/credibility.js';
import { isUsingDevStore } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads/live');

export const registerVideoStreamHandlers = (io, socket) => {
  socket.on('video_stream_start', (data) => {
    if (!socket.user) {
      socket.emit('video_stream_error', { message: 'Authentification requise' });
      return;
    }
    if (!data?.consent) {
      socket.emit('video_stream_error', { message: 'Consentement requis pour le streaming' });
      return;
    }

    const streamId = data.streamId || `${socket.user._id}_${Date.now()}`;
    createStream(streamId, {
      userId: socket.user._id,
      userName: socket.user.name,
      coordinates: data.coordinates,
      address: data.address,
      type: data.type,
      description: data.description,
      isAnonymous: data.isAnonymous,
      consent: true,
      consentAt: new Date(),
    });

    socket.join(`stream:${streamId}`);
    socket.emit('video_stream_ready', { streamId });
    console.log(`Flux vidéo démarré: ${streamId} (${socket.user.name})`);
  });

  socket.on('video_chunk', (data) => {
    try {
      if (!data?.streamId || !data?.chunk) return;
      appendChunk(data.streamId, data.chunk);
      socket.to('security').emit('video_chunk_received', {
        streamId: data.streamId,
        index: data.index,
      });
    } catch (err) {
      socket.emit('video_stream_error', { message: err.message });
      cancelStream(data.streamId);
    }
  });

  socket.on('video_stream_end', async (data) => {
    if (!socket.user) return;

    try {
      const { streamId, snapshot } = data;
      if (!streamId) throw new Error('streamId manquant');

      const { uploaded, metadata } = await finalizeStream(streamId);

      const analyse_ia = await analyzeVideoContent({
        snapshotBase64: snapshot,
        userType: metadata.type,
        userDescription: metadata.description,
      });

      const routedService = routeToService(analyse_ia.type_detecte);
      const coords = metadata.coordinates || [3.848, 11.5021]; // [lat, lng]
      const incidentType = Incident.schema.path('type').enumValues.includes(analyse_ia.type_detecte)
        ? analyse_ia.type_detecte
        : (metadata.type || 'accident');

      if (isUsingDevStore()) {
        socket.emit('live_stream_result', {
          success: true,
          analyse_ia,
          routedService,
          message: `✅ Votre vidéo a été analysée et transmise aux ${routedService.label}`,
          videoUrl: uploaded.url,
          devMode: true,
        });
        io.to(routedService.channel).emit('alerte_service', {
          type: incidentType,
          gravite: analyse_ia.gravite,
          description: analyse_ia.description,
          localisation: { coordinates: coords, address: metadata.address },
          videoUrl: uploaded.url,
          routedService,
          streamId,
          isLive: true,
        });
        return;
      }

      const incidentData = {
        type: incidentType,
        description: metadata.description || analyse_ia.description,
        location: {
          type: 'Point',
          coordinates: [coords[1], coords[0]],
          address: metadata.address,
        },
        urgency: analyse_ia.gravite,
        riskCategory: Incident.categorizeRisk(incidentType),
        reporter: metadata.isAnonymous ? undefined : metadata.userId,
        isAnonymous: metadata.isAnonymous,
        isLiveStream: true,
        analyse_ia,
        routedService: {
          code: routedService.code,
          label: routedService.label,
          notifiedAt: new Date(),
        },
        media: [{
          url: uploaded.url,
          publicId: uploaded.publicId,
          type: 'video',
          metadata: {
            latitude: coords[0],
            longitude: coords[1],
            capturedAt: new Date(),
            liveStream: true,
          },
        }],
        status: 'en_attente',
      };

      incidentData.credibilityScore = calculateCredibility(incidentData, socket.user);

      const incident = await Incident.create(incidentData);
      await incident.populate('reporter', 'name');

      io.emit('incident:new', incident);
      io.to(routedService.channel).emit('alerte_service', {
        incidentId: incident._id,
        type: incident.type,
        gravite: analyse_ia.gravite,
        description: analyse_ia.description,
        localisation: incident.location,
        videoUrl: uploaded.url,
        routedService,
        analyse_ia,
        isLive: true,
      });
      io.to('security').emit('alerte_service', {
        incidentId: incident._id,
        type: incident.type,
        gravite: analyse_ia.gravite,
        description: analyse_ia.description,
        localisation: incident.location,
        videoUrl: uploaded.url,
        routedService,
      });

      if (!metadata.isAnonymous) {
        const notif = await Notification.create({
          user: metadata.userId,
          type: 'intervention',
          title: `Transmis aux ${routedService.label}`,
          message: analyse_ia.description,
          data: { incidentId: incident._id, link: '/dashboard' },
        });
        socket.emit('notification', notif);
      }

      socket.emit('live_stream_result', {
        success: true,
        incidentId: incident._id,
        analyse_ia,
        routedService,
        message: `✅ Votre vidéo a été analysée et transmise aux ${routedService.label}`,
        videoUrl: uploaded.url,
      });

      console.log(`Flux finalisé → incident ${incident._id}, routé vers ${routedService.label}`);
    } catch (err) {
      console.error('Erreur video_stream_end:', err);
      socket.emit('video_stream_error', { message: err.message || 'Erreur traitement vidéo' });
      if (data?.streamId) cancelStream(data.streamId);
    }
  });

  socket.on('video_stream_cancel', (data) => {
    if (data?.streamId) {
      cancelStream(data.streamId);
      socket.emit('video_stream_cancelled', { streamId: data.streamId });
    }
  });

  socket.on('join:service', (channel) => {
    if (socket.user && ['agent', 'admin', 'moderateur'].includes(socket.user.role)) {
      socket.join(channel);
      if (channel === 'security') socket.join('security');
    }
  });
};

export const ensureUploadDir = async () => {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
};
