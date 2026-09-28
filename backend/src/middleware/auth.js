import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isUsingDevStore } from '../config/db.js';
import * as devStore from '../dev/devUserStore.js';

const findUserById = async (id) => {
  if (isUsingDevStore()) {
    const user = devStore.findById(id);
    return user ? { ...user, toPublicJSON: () => devStore.toPublicJSON(user) } : null;
  }
  return User.findById(id).select('-password -twoFactorSecret -smsCode');
};

export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Non autorisé - token manquant' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findUserById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Utilisateur non trouvé ou désactivé' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await findUserById(decoded.id);
    }
  } catch {
    // ignore
  }
  next();
};

export const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
