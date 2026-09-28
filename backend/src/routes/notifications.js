import { Router } from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { isUsingDevStore } from '../config/db.js';
import * as devDataStore from '../dev/devDataStore.js';

const router = Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const { unreadOnly } = req.query;

    if (isUsingDevStore()) {
      const result = devDataStore.getNotifications(req.user._id, unreadOnly === 'true');
      return res.json({ success: true, ...result });
    }

    const filter = { user: req.user._id };
    if (unreadOnly === 'true') filter.isRead = false;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });

    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/read', protect, async (req, res, next) => {
  try {
    if (isUsingDevStore()) {
      const notif = devDataStore.markNotificationRead(req.params.id, req.user._id);
      return res.json({ success: true, notification: notif });
    }

    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );
    res.json({ success: true, notification: notif });
  } catch (err) {
    next(err);
  }
});

router.put('/read-all', protect, async (req, res, next) => {
  try {
    if (isUsingDevStore()) {
      devDataStore.markAllNotificationsRead(req.user._id);
      return res.json({ success: true, message: 'Toutes les notifications marquées comme lues' });
    }

    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'Toutes les notifications marquées comme lues' });
  } catch (err) {
    next(err);
  }
});

export default router;
