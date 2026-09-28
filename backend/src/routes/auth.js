import { Router } from 'express';
import User from '../models/User.js';
import { protect, generateToken } from '../middleware/auth.js';
import { sendSMS, generateSMSCode, formatCameroonPhone } from '../services/sms.js';
import { generate2FASecret, verify2FAToken } from '../services/twoFactor.js';
import { verifyFirebaseToken, isFirebaseAdminConfigured } from '../config/firebase.js';
import { isUsingDevStore } from '../config/db.js';
import * as devStore from '../dev/devUserStore.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Inscription utilisateur
 *     tags: [Auth]
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password, authProvider = 'local' } = req.body;
    if (!name) throw new AppError('Le nom est requis', 400);
    if (!email && !phone) throw new AppError('Email ou téléphone requis', 400);
    if (!password) throw new AppError('Mot de passe requis', 400);

    const formattedPhone = phone ? formatCameroonPhone(phone) : null;
    if (phone && !formattedPhone) {
      throw new AppError('Numéro camerounais invalide (+237 6XX XXX XXX)', 400);
    }

    if (isUsingDevStore()) {
      if (email && devStore.findByEmail(email)) throw new AppError('Email déjà utilisé', 400);
      if (formattedPhone && devStore.findByPhone(formattedPhone)) {
        throw new AppError('Téléphone déjà utilisé', 400);
      }
      const user = await devStore.createUser({
        name, email, phone: formattedPhone, password, authProvider,
      });
      if (formattedPhone) {
        console.log(`[SMS DEV] Code de vérification pour ${formattedPhone}: (mode local, ignoré)`);
      }
      const token = generateToken(user._id);
      return res.status(201).json({
        success: true,
        message: 'Inscription réussie',
        token,
        user: devStore.toPublicJSON(user),
        requiresPhoneVerification: false,
      });
    }

    if (email && await User.findOne({ email })) {
      throw new AppError('Email déjà utilisé', 400);
    }
    if (formattedPhone && await User.findOne({ phone: formattedPhone })) {
      throw new AppError('Téléphone déjà utilisé', 400);
    }

    const user = await User.create({
      name,
      email: email || undefined,
      phone: formattedPhone || undefined,
      password: password || undefined,
      authProvider,
    });

    if (formattedPhone) {
      const code = generateSMSCode();
      user.smsCode = code;
      user.smsCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      await sendSMS(formattedPhone, `GuardMee - Code de vérification: ${code}`);
    }

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      token,
      user: user.toPublicJSON(),
      requiresPhoneVerification: !!formattedPhone,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connexion
 *     tags: [Auth]
 */
router.post('/login', async (req, res, next) => {
  try {
    const { identifier, password, twoFactorCode } = req.body;
    if (!identifier || !password) throw new AppError('Identifiants requis', 400);

    const phone = formatCameroonPhone(identifier);

    if (isUsingDevStore()) {
      const user = devStore.findByIdentifier(identifier.toLowerCase())
        || (phone ? devStore.findByPhone(phone) : null);
      if (!user || !user.password) throw new AppError('Identifiants incorrects', 401);
      const valid = await devStore.comparePassword(user, password);
      if (!valid) throw new AppError('Identifiants incorrects', 401);
      if (!user.isActive) throw new AppError('Compte désactivé', 403);
      return res.json({
        success: true,
        token: generateToken(user._id),
        user: devStore.toPublicJSON(user),
      });
    }

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { phone: phone || identifier }],
    }).select('+password +twoFactorSecret');

    if (!user || !user.password) throw new AppError('Identifiants incorrects', 401);
    const valid = await user.comparePassword(password);
    if (!valid) throw new AppError('Identifiants incorrects', 401);
    if (!user.isActive) throw new AppError('Compte désactivé', 403);

    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return res.json({ success: true, requires2FA: true, message: 'Code 2FA requis' });
      }
      if (!verify2FAToken(user.twoFactorSecret, twoFactorCode)) {
        throw new AppError('Code 2FA invalide', 401);
      }
    }

    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      token: generateToken(user._id),
      user: user.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/verify-sms', protect, async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id).select('+smsCode +smsCodeExpires');
    if (!user.smsCode || user.smsCodeExpires < new Date()) {
      throw new AppError('Code expiré, demandez un nouveau code', 400);
    }
    if (user.smsCode !== code) throw new AppError('Code incorrect', 400);

    user.isPhoneVerified = true;
    user.smsCode = undefined;
    user.smsCodeExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Téléphone vérifié', user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
});

router.post('/resend-sms', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+smsCode +smsCodeExpires');
    if (!user.phone) throw new AppError('Aucun téléphone associé', 400);

    const code = generateSMSCode();
    user.smsCode = code;
    user.smsCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await sendSMS(user.phone, `GuardMee - Code de vérification: ${code}`);

    res.json({ success: true, message: 'Code renvoyé' });
  } catch (err) {
    next(err);
  }
});

router.post('/2fa/enable', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    const secret = generate2FASecret(user.email || user.phone);
    user.twoFactorSecret = secret.base32;
    await user.save();

    res.json({
      success: true,
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      message: 'Scannez le QR code avec votre application 2FA',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/2fa/confirm', protect, async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    if (!verify2FAToken(user.twoFactorSecret, code)) {
      throw new AppError('Code 2FA invalide', 400);
    }
    user.twoFactorEnabled = true;
    await user.save();
    res.json({ success: true, message: '2FA activé' });
  } catch (err) {
    next(err);
  }
});

router.post('/2fa/disable', protect, async (req, res, next) => {
  try {
    const { code, password } = req.body;
    const user = await User.findById(req.user._id).select('+password +twoFactorSecret');
    if (!await user.comparePassword(password)) throw new AppError('Mot de passe incorrect', 401);
    if (!verify2FAToken(user.twoFactorSecret, code)) throw new AppError('Code 2FA invalide', 400);

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();
    res.json({ success: true, message: '2FA désactivé' });
  } catch (err) {
    next(err);
  }
});

router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: req.user.toPublicJSON() });
});

router.put('/profile', protect, async (req, res, next) => {
  try {
    const { name, avatar, defaultLocation, alertRadius, preferences } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (avatar) user.avatar = avatar;
    if (alertRadius) user.alertRadius = alertRadius;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    if (defaultLocation) {
      user.defaultLocation = {
        type: 'Point',
        coordinates: defaultLocation.coordinates,
        address: defaultLocation.address,
      };
    }

    await user.save();
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/auth/firebase:
 *   post:
 *     summary: Connexion via Firebase (Google, email, téléphone)
 *     tags: [Auth]
 */
router.post('/firebase', async (req, res, next) => {
  try {
    const { idToken, name, phone } = req.body;
    if (!idToken) throw new AppError('Token Firebase requis', 400);
    if (!isFirebaseAdminConfigured()) {
      throw new AppError('Firebase Admin non configuré côté serveur', 503);
    }

    const decoded = await verifyFirebaseToken(idToken);
    const { uid, email, phone_number: firebasePhone, name: fbName, picture } = decoded;

    let user = await User.findOne({ firebaseUid: uid });
    if (!user && email) user = await User.findOne({ email: email.toLowerCase() });
    if (!user && phone) {
      const formatted = formatCameroonPhone(phone);
      if (formatted) user = await User.findOne({ phone: formatted });
    }

    const provider = decoded.firebase?.sign_in_provider || 'firebase';
    const authProviderMap = {
      'google.com': 'google',
      phone: 'phone',
      password: 'firebase',
    };

    if (!user) {
      const formattedPhone = phone
        ? formatCameroonPhone(phone)
        : firebasePhone
          ? formatCameroonPhone(firebasePhone.replace('+', ''))
          : null;

      user = await User.create({
        name: name || fbName || email?.split('@')[0] || 'Utilisateur',
        email: email || undefined,
        phone: formattedPhone || undefined,
        firebaseUid: uid,
        providerId: uid,
        authProvider: authProviderMap[provider] || 'firebase',
        avatar: picture || '',
        isEmailVerified: decoded.email_verified || false,
        isPhoneVerified: provider === 'phone',
      });
    } else {
      user.firebaseUid = uid;
      user.lastLogin = new Date();
      if (picture && !user.avatar) user.avatar = picture;
      if (name) user.name = name;
      await user.save();
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: user.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
});

router.put('/fcm-token', protect, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) throw new AppError('Token FCM requis', 400);

    const user = await User.findById(req.user._id);
    if (!user.fcmTokens.includes(token)) {
      user.fcmTokens.push(token);
      if (user.fcmTokens.length > 10) user.fcmTokens = user.fcmTokens.slice(-10);
      await user.save();
    }

    res.json({ success: true, message: 'Token FCM enregistré' });
  } catch (err) {
    next(err);
  }
});

router.post('/social', async (req, res, next) => {
  try {
    const { provider, providerId, name, email, phone } = req.body;
    if (!['facebook', 'whatsapp'].includes(provider)) {
      throw new AppError('Fournisseur non supporté', 400);
    }

    let user = await User.findOne({ authProvider: provider, providerId });
    if (!user && email) user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: name || 'Utilisateur',
        email,
        phone: phone ? formatCameroonPhone(phone) : undefined,
        authProvider: provider,
        providerId,
        isEmailVerified: !!email,
      });
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: user.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
