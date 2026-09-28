import { Router } from 'express';
import Incident from '../models/Incident.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Alert from '../models/Alert.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';
import { calculateCredibility, updateUserCredibility } from '../services/credibility.js';
import { AppError } from '../middleware/errorHandler.js';
import { isUsingDevStore } from '../config/db.js';
import * as devDataStore from '../dev/devDataStore.js';

const router = Router();

router.use(protect);
router.use(authorize('moderateur', 'agent', 'admin'));

/**
 * @swagger
 * /api/moderation/pending:
 *   get:
 *     summary: Signalements en attente
 *     tags: [Moderation]
 */
router.get('/pending', async (req, res, next) => {
  try {
    const { urgency, type, page = 1, limit = 20 } = req.query;

    if (isUsingDevStore()) {
      const result = devDataStore.getPendingIncidents({ urgency, type, page, limit });
      return res.json({ success: true, ...result });
    }

    const filter = { status: { $in: ['en_attente', 'info_requise'] } };
    if (urgency) filter.urgency = urgency;
    if (type) filter.type = type;

    const incidents = await Incident.find(filter)
      .populate('reporter', 'name credibilityScore isPhoneVerified')
      .sort({ urgency: -1, createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Incident.countDocuments(filter);
    res.json({ success: true, incidents, total });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/validate', async (req, res, next) => {
  try {
    if (isUsingDevStore()) {
      const incident = devDataStore.updateIncident(req.params.id, {
        status: 'valide',
        moderatedBy: req.user._id,
        moderatedAt: new Date(),
        validatedAt: new Date(),
        moderationNotes: req.body.notes,
      });
      if (!incident) throw new AppError('Incident non trouvé', 404);
      req.app.get('io')?.emit('incident:validated', incident);
      return res.json({ success: true, incident });
    }

    const incident = await Incident.findById(req.params.id).populate('reporter');
    if (!incident) throw new AppError('Incident non trouvé', 404);

    incident.status = 'valide';
    incident.moderatedBy = req.user._id;
    incident.moderatedAt = new Date();
    incident.validatedAt = new Date();
    incident.credibilityScore = calculateCredibility(incident, incident.reporter);
    if (req.body.notes) incident.moderationNotes = req.body.notes;
    await incident.save();

    if (incident.reporter) {
      await updateUserCredibility(incident.reporter._id, 5, User);
      const notif = await Notification.create({
        user: incident.reporter._id,
        type: 'moderation',
        title: 'Signalement validé',
        message: 'Votre signalement a été validé par un modérateur',
        data: { incidentId: incident._id },
      });
      req.app.get('io')?.to(`user:${incident.reporter._id}`).emit('notification', notif);
    }

    const alert = await Alert.create({
      incident: incident._id,
      title: `Alerte: ${incident.type}`,
      message: incident.description.substring(0, 200),
      severity: incident.urgency === 'critique' ? 'critique' : 'urgence',
      targetArea: {
        type: 'Point',
        coordinates: incident.location.coordinates,
        radius: 5000,
      },
      createdBy: req.user._id,
      channels: { push: true, securityChannel: true },
    });

    req.app.get('io')?.emit('incident:validated', incident);
    req.app.get('io')?.emit('alert:new', alert);

    res.json({ success: true, incident, alert });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;

    if (isUsingDevStore()) {
      const incident = devDataStore.updateIncident(req.params.id, {
        status: 'rejete',
        moderatedBy: req.user._id,
        moderatedAt: new Date(),
        moderationNotes: reason,
      });
      if (!incident) throw new AppError('Incident non trouvé', 404);
      return res.json({ success: true, incident });
    }

    const incident = await Incident.findById(req.params.id);
    if (!incident) throw new AppError('Incident non trouvé', 404);

    incident.status = 'rejete';
    incident.moderatedBy = req.user._id;
    incident.moderatedAt = new Date();
    incident.moderationNotes = reason;
    await incident.save();

    if (incident.reporter) {
      await updateUserCredibility(incident.reporter, -10, User);
      const notif = await Notification.create({
        user: incident.reporter,
        type: 'moderation',
        title: 'Signalement rejeté',
        message: reason || 'Votre signalement a été rejeté',
        data: { incidentId: incident._id },
      });
      req.app.get('io')?.to(`user:${incident.reporter}`).emit('notification', notif);
    }

    res.json({ success: true, incident });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/request-info', async (req, res, next) => {
  try {
    const { message } = req.body;
    const incident = await Incident.findById(req.params.id);
    if (!incident) throw new AppError('Incident non trouvé', 404);

    incident.status = 'info_requise';
    incident.moderationNotes = message;
    incident.moderatedBy = req.user._id;
    await incident.save();

    if (incident.reporter) {
      const notif = await Notification.create({
        user: incident.reporter,
        type: 'moderation',
        title: 'Informations supplémentaires requises',
        message: message || 'Veuillez fournir plus de détails',
        data: { incidentId: incident._id },
      });
      req.app.get('io')?.to(`user:${incident.reporter}`).emit('notification', notif);
    }

    res.json({ success: true, incident });
  } catch (err) {
    next(err);
  }
});

export default router;
