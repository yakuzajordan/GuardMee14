import { Router } from 'express';
import Incident from '../models/Incident.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Alert from '../models/Alert.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { uploadMedia } from '../services/cloudinary.js';
import { calculateCredibility } from '../services/credibility.js';
import { sendPushToUser } from '../services/fcm.js';
import { AppError } from '../middleware/errorHandler.js';
import { isUsingDevStore } from '../config/db.js';
import * as devDataStore from '../dev/devDataStore.js';

const router = Router();

const parseCoords = (body) => {
  const lng = parseFloat(body.longitude ?? body.lng);
  const lat = parseFloat(body.latitude ?? body.lat);
  if (isNaN(lng) || isNaN(lat)) return null;
  return [lng, lat];
};

/**
 * @swagger
 * /api/incidents:
 *   post:
 *     summary: Créer un signalement
 *     tags: [Incidents]
 */
router.post('/', optionalAuth, upload.array('media', 5), async (req, res, next) => {
  try {
    const { type, description, isAnonymous, address, offlineId } = req.body;
    const coords = parseCoords(req.body);

    if (!type || !description) throw new AppError('Type et description requis', 400);
    if (!coords) throw new AppError('Coordonnées GPS requises', 400);

    const mediaFiles = [];
    if (req.files?.length) {
      for (const file of req.files) {
        const uploaded = await uploadMedia(file);
        mediaFiles.push({
          ...uploaded,
          metadata: {
            latitude: coords[1],
            longitude: coords[0],
            capturedAt: new Date(),
          },
        });
      }
    }

    let reporter = null;
    if (req.user && !isAnonymous) reporter = req.user;

    if (isUsingDevStore()) {
      const incident = devDataStore.createIncident({
        type,
        description,
        coordinates: coords,
        address,
        isAnonymous: isAnonymous === 'true' || isAnonymous === true,
        offlineId,
        media: mediaFiles,
      }, reporter);
      req.app.get('io')?.emit('incident:new', incident);
      return res.status(201).json({ success: true, incident });
    }

    const incidentData = {
      type,
      description,
      location: { type: 'Point', coordinates: coords, address },
      riskCategory: Incident.categorizeRisk(type),
      urgency: Incident.urgencyFromType(type),
      isAnonymous: isAnonymous === 'true' || isAnonymous === true,
      reporter: reporter?._id,
      media: mediaFiles,
      offlineId,
      syncedAt: offlineId ? new Date() : undefined,
    };

    incidentData.credibilityScore = calculateCredibility(incidentData, reporter);

    const incident = await Incident.create(incidentData);
    await incident.populate('reporter', 'name credibilityScore');

    const io = req.app.get('io');
    io?.emit('incident:new', incident);

    if (io) {
      const nearbyUsers = await User.find({
        'defaultLocation.coordinates': {
          $near: {
            $geometry: { type: 'Point', coordinates: coords },
            $maxDistance: 10000,
          },
        },
        'preferences.pushNotifications': true,
        isActive: true,
      }).limit(100);

      for (const u of nearbyUsers) {
        if (u._id.equals(reporter?._id)) continue;
        const notif = await Notification.create({
          user: u._id,
          type: 'incident_proche',
          title: 'Incident signalé à proximité',
          message: `${type.replace('_', ' ')} signalé près de chez vous`,
          data: { incidentId: incident._id },
        });
        io.to(`user:${u._id}`).emit('notification', notif);
        await sendPushToUser(u, {
          title: 'Incident signalé à proximité',
          body: `${type.replace('_', ' ')} signalé près de chez vous`,
          data: { incidentId: String(incident._id), link: '/carte' },
        });
      }
    }

    res.status(201).json({ success: true, incident });
  } catch (err) {
    next(err);
  }
});

router.post('/sync', protect, async (req, res, next) => {
  try {
    const { incidents } = req.body;
    if (!Array.isArray(incidents)) throw new AppError('Format invalide', 400);

    const synced = [];
    for (const item of incidents) {
      const existing = item.offlineId
        ? await Incident.findOne({ offlineId: item.offlineId })
        : null;
      if (existing) {
        synced.push(existing);
        continue;
      }
      const coords = item.coordinates || [item.longitude, item.latitude];
      const incident = await Incident.create({
        ...item,
        location: { type: 'Point', coordinates: coords, address: item.address },
        reporter: req.user._id,
        riskCategory: Incident.categorizeRisk(item.type),
        urgency: Incident.urgencyFromType(item.type),
        syncedAt: new Date(),
      });
      synced.push(incident);
    }

    res.json({ success: true, incidents: synced });
  } catch (err) {
    next(err);
  }
});

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      type, status, urgency, lat, lng, radius = 50000,
      from, to, page = 1, limit = 50,
    } = req.query;

    if (isUsingDevStore()) {
      const result = devDataStore.getIncidents({ type, status, urgency, page, limit });
      return res.json({ success: true, ...result });
    }

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    else filter.status = { $in: ['valide', 'en_cours'] };
    if (urgency) filter.urgency = urgency;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    let query = Incident.find(filter);

    if (lat && lng) {
      query = Incident.find({
        ...filter,
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            $maxDistance: parseInt(radius),
          },
        },
      });
    }

    const incidents = await query
      .populate('reporter', 'name credibilityScore')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Incident.countDocuments(filter);

    res.json({
      success: true,
      incidents,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/heatmap', async (req, res, next) => {
  try {
    if (isUsingDevStore()) {
      const points = devDataStore.getHeatmapPoints();
      return res.json({ success: true, points });
    }

    const { from, to } = req.query;
    const match = { status: { $in: ['valide', 'en_cours'] } };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const points = await Incident.aggregate([
      { $match: match },
      {
        $project: {
          lat: { $arrayElemAt: ['$location.coordinates', 1] },
          lng: { $arrayElemAt: ['$location.coordinates', 0] },
          weight: {
            $switch: {
              branches: [
                { case: { $eq: ['$urgency', 'critique'] }, then: 4 },
                { case: { $eq: ['$urgency', 'eleve'] }, then: 3 },
                { case: { $eq: ['$urgency', 'moyen'] }, then: 2 },
              ],
              default: 1,
            },
          },
        },
      },
    ]);

    res.json({ success: true, points });
  } catch (err) {
    next(err);
  }
});

router.get('/mine', protect, async (req, res, next) => {
  try {
    if (isUsingDevStore()) {
      const incidents = devDataStore.getUserIncidents(req.user._id);
      return res.json({ success: true, incidents });
    }

    const incidents = await Incident.find({ reporter: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ success: true, incidents });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (isUsingDevStore()) {
      const incident = devDataStore.getIncidentById(req.params.id);
      if (!incident) throw new AppError('Incident non trouvé', 404);
      return res.json({ success: true, incident });
    }

    const incident = await Incident.findById(req.params.id)
      .populate('reporter', 'name credibilityScore')
      .populate('moderatedBy', 'name')
      .populate('assignedAgent', 'name phone');
    if (!incident) throw new AppError('Incident non trouvé', 404);
    res.json({ success: true, incident });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/intervention', protect, async (req, res, next) => {
  try {
    if (isUsingDevStore()) {
      const { status, notes, teamId } = req.body;
      const incident = devDataStore.updateIncident(req.params.id, {
        intervention: { status, notes, teamId, startedAt: new Date() },
        status: status === 'terminee' ? 'resolu' : 'en_cours',
        assignedAgent: req.user._id,
      });
      if (!incident) throw new AppError('Incident non trouvé', 404);
      req.app.get('io')?.emit('incident:update', incident);
      return res.json({ success: true, incident });
    }

    const incident = await Incident.findById(req.params.id);
    if (!incident) throw new AppError('Incident non trouvé', 404);

    const { status, notes, teamId } = req.body;
    incident.intervention = {
      ...incident.intervention,
      status: status || incident.intervention?.status,
      notes: notes || incident.intervention?.notes,
      teamId: teamId || incident.intervention?.teamId,
      startedAt: incident.intervention?.startedAt || new Date(),
    };
    if (status === 'terminee') {
      incident.status = 'resolu';
      incident.resolvedAt = new Date();
    } else {
      incident.status = 'en_cours';
    }
    incident.assignedAgent = req.user._id;
    await incident.save();

    req.app.get('io')?.emit('incident:update', incident);
    res.json({ success: true, incident });
  } catch (err) {
    next(err);
  }
});

export default router;
