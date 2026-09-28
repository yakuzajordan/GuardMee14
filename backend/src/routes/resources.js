import { Router } from 'express';
import Resource from '../models/Resource.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';
import { AppError } from '../middleware/errorHandler.js';
import { isUsingDevStore } from '../config/db.js';
import * as devDataStore from '../dev/devDataStore.js';

const router = Router();

router.get('/', protect, authorize('agent', 'admin'), async (req, res, next) => {
  try {
    const { status, type } = req.query;

    if (isUsingDevStore()) {
      const resources = devDataStore.getResources({ status, type });
      return res.json({ success: true, resources });
    }

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const resources = await Resource.find(filter)
      .populate('assignedIncident')
      .populate('managedBy', 'name');
    res.json({ success: true, resources });
  } catch (err) {
    next(err);
  }
});

router.post('/', protect, authorize('agent', 'admin'), async (req, res, next) => {
  try {
    const { name, type, description, coordinates, address, capacity, contactPhone, metadata } = req.body;
    if (!name || !type || !coordinates) {
      throw new AppError('Nom, type et coordonnées requis', 400);
    }

    if (isUsingDevStore()) {
      const resource = devDataStore.createResource(req.body, req.user);
      req.app.get('io')?.emit('resource:update', resource);
      return res.status(201).json({ success: true, resource });
    }

    const resource = await Resource.create({
      name,
      type,
      description,
      location: { type: 'Point', coordinates, address },
      capacity,
      contactPhone,
      metadata,
      managedBy: req.user._id,
    });

    req.app.get('io')?.emit('resource:update', resource);
    res.status(201).json({ success: true, resource });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/assign', protect, authorize('agent', 'admin'), async (req, res, next) => {
  try {
    if (isUsingDevStore()) {
      const resource = devDataStore.updateResource(req.params.id, {
        assignedIncident: req.body.incidentId,
        status: 'en_mission',
      });
      if (!resource) throw new AppError('Ressource non trouvée', 404);
      req.app.get('io')?.emit('resource:update', resource);
      return res.json({ success: true, resource });
    }

    const { incidentId } = req.body;
    const resource = await Resource.findById(req.params.id);
    if (!resource) throw new AppError('Ressource non trouvée', 404);

    resource.assignedIncident = incidentId;
    resource.status = 'en_mission';
    await resource.save();

    req.app.get('io')?.emit('resource:update', resource);
    res.json({ success: true, resource });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/status', protect, authorize('agent', 'admin'), async (req, res, next) => {
  try {
    if (isUsingDevStore()) {
      const resource = devDataStore.updateResource(req.params.id, { status: req.body.status });
      if (!resource) throw new AppError('Ressource non trouvée', 404);
      req.app.get('io')?.emit('resource:update', resource);
      return res.json({ success: true, resource });
    }

    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!resource) throw new AppError('Ressource non trouvée', 404);
    req.app.get('io')?.emit('resource:update', resource);
    res.json({ success: true, resource });
  } catch (err) {
    next(err);
  }
});

export default router;
