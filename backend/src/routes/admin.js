import { Router } from 'express';
import User from '../models/User.js';
import Incident from '../models/Incident.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';
import { AppError } from '../middleware/errorHandler.js';
import { isUsingDevStore } from '../config/db.js';
import * as devDataStore from '../dev/devDataStore.js';

const router = Router();

const aiRules = {
  autoClassify: true,
  minCredibilityForAutoValidate: 80,
  blockedKeywords: ['fake', 'test', 'blague'],
  urgencyBoost: { incendie: 2, agression: 1 },
};

// Seed public (uniquement si aucun admin n'existe)
router.post('/seed', async (req, res, next) => {
  try {
    const demoAccounts = {
      admin: { email: 'admin@guardmee.cm', password: 'Admin@123' },
      agent: { email: 'agent@guardmee.cm', password: 'Agent@123' },
    };

    if (isUsingDevStore()) {
      return res.json({ success: true, message: 'Mode local actif - données de démo prêtes', accounts: demoAccounts });
    }

    const existing = await User.findOne({ role: 'admin' });
    if (existing) {
      return res.json({ success: true, message: 'Données déjà initialisées' });
    }

    await User.create({
      name: 'Administrateur',
      email: 'admin@guardmee.cm',
      phone: '+237670000001',
      password: 'Admin@123',
      role: 'admin',
      isPhoneVerified: true,
      isEmailVerified: true,
    });

    await User.create({
      name: 'Agent Sécurité',
      email: 'agent@guardmee.cm',
      phone: '+237670000002',
      password: 'Agent@123',
      role: 'agent',
      isPhoneVerified: true,
    });

    res.json({ success: true, message: 'Comptes de démo créés', accounts: demoAccounts });
  } catch (err) {
    next(err);
  }
});

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', async (req, res, next) => {
  try {
    if (isUsingDevStore()) {
      return res.json({ success: true, stats: devDataStore.getAdminStats() });
    }

    const { period = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    const [byType, byStatus, byUrgency, totalUsers, recentIncidents] = await Promise.all([
      Incident.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Incident.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Incident.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$urgency', count: { $sum: 1 } } },
      ]),
      User.countDocuments(),
      Incident.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const hotZones = await Incident.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $in: ['valide', 'en_cours'] } } },
      {
        $group: {
          _id: {
            lat: { $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 2] },
            lng: { $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 2] },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const criticalHours = await Incident.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      success: true,
      stats: {
        byType,
        byStatus,
        byUrgency,
        totalUsers,
        recentIncidents,
        hotZones,
        criticalHours,
        totalIncidents: byType.reduce((s, t) => s + t.count, 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    if (isUsingDevStore()) {
      const demoUsers = [
        { _id: 'usr-admin', name: 'Administrateur', email: 'admin@guardmee.cm', phone: '+237670000001', role: 'admin', isActive: true, credibilityScore: 100 },
        { _id: 'usr-agent', name: 'Agent Sécurité', email: 'agent@guardmee.cm', phone: '+237670000002', role: 'agent', isActive: true, credibilityScore: 90 },
      ];
      return res.json({ success: true, users: demoUsers, total: demoUsers.length });
    }

    const { role, page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('-password -twoFactorSecret')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);
    res.json({ success: true, users, total });
  } catch (err) {
    next(err);
  }
});

router.put('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;
    const validRoles = ['citoyen', 'moderateur', 'agent', 'admin'];
    if (!validRoles.includes(role)) throw new AppError('Rôle invalide', 400);

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) throw new AppError('Utilisateur non trouvé', 404);
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
});

router.put('/users/:id/status', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true }
    );
    if (!user) throw new AppError('Utilisateur non trouvé', 404);
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
});

router.get('/ai-rules', (req, res) => {
  res.json({ success: true, rules: aiRules });
});

router.put('/ai-rules', (req, res) => {
  Object.assign(aiRules, req.body);
  res.json({ success: true, rules: aiRules });
});

export default router;
