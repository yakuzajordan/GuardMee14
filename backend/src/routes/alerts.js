import { Router } from 'express';
import Alert from '../models/Alert.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';
import { sendSMS } from '../services/sms.js';
import { sendPushToUser } from '../services/fcm.js';
import { AppError } from '../middleware/errorHandler.js';
import { isUsingDevStore } from '../config/db.js';
import * as devDataStore from '../dev/devDataStore.js';

const router = Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const { lat, lng, active = true } = req.query;

    if (isUsingDevStore()) {
      const alerts = devDataStore.getAlerts({ active: active === 'true' });
      return res.json({ success: true, alerts });
    }

    const filter = {};
    if (active === 'true') filter.isActive = true;

    let alerts;
    if (lat && lng) {
      alerts = await Alert.find({
        ...filter,
        targetArea: {
          $near: {
            $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            $maxDistance: 50000,
          },
        },
      }).populate('incident').sort({ createdAt: -1 }).limit(50);
    } else {
      alerts = await Alert.find(filter).populate('incident').sort({ createdAt: -1 }).limit(50);
    }

    res.json({ success: true, alerts });
  } catch (err) {
    next(err);
  }
});

router.post('/', protect, authorize('agent', 'admin', 'moderateur'), async (req, res, next) => {
  try {
    const { incidentId, title, message, severity, coordinates, radius, channels } = req.body;
    if (!title || !message || !coordinates) {
      throw new AppError('Titre, message et coordonnées requis', 400);
    }

    if (isUsingDevStore()) {
      const alert = devDataStore.createAlert(req.body, req.user);
      req.app.get('io')?.emit('alert:new', alert);
      return res.status(201).json({ success: true, alert });
    }

    const alert = await Alert.create({
      incident: incidentId,
      title,
      message,
      severity: severity || 'attention',
      targetArea: { type: 'Point', coordinates, radius: radius || 5000 },
      createdBy: req.user._id,
      channels: channels || { push: true },
    });

    const io = req.app.get('io');
    const nearbyUsers = await User.find({
      'defaultLocation.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates },
          $maxDistance: radius || 5000,
        },
      },
      isActive: true,
    });

    let recipientCount = 0;
    for (const user of nearbyUsers) {
      if (channels?.push !== false && user.preferences?.pushNotifications) {
        const notif = await Notification.create({
          user: user._id,
          type: 'alerte_zone',
          title,
          message,
          data: { alertId: alert._id, incidentId },
        });
        io?.to(`user:${user._id}`).emit('notification', notif);
        await sendPushToUser(user, {
          title,
          body: message,
          data: { alertId: String(alert._id), link: '/carte' },
        });
        recipientCount++;
      }
      if (channels?.sms && user.preferences?.smsAlerts && user.phone) {
        await sendSMS(user.phone, `GuardMee: ${title} - ${message.substring(0, 100)}`);
      }
    }

    alert.recipientCount = recipientCount;
    await alert.save();

    io?.emit('alert:new', alert);
    if (channels?.securityChannel) {
      io?.to('security').emit('alert:security', alert);
    }

    res.status(201).json({ success: true, alert });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/deactivate', protect, authorize('agent', 'admin'), async (req, res, next) => {
  try {
    if (isUsingDevStore()) {
      const alert = devDataStore.deactivateAlert(req.params.id);
      if (!alert) throw new AppError('Alerte non trouvée', 404);
      req.app.get('io')?.emit('alert:deactivated', alert);
      return res.json({ success: true, alert });
    }

    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!alert) throw new AppError('Alerte non trouvée', 404);
    req.app.get('io')?.emit('alert:deactivated', alert);
    res.json({ success: true, alert });
  } catch (err) {
    next(err);
  }
});

export default router;
