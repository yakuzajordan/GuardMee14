export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Non autorisé' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Accès refusé. Rôle requis: ${roles.join(', ')}`,
    });
  }
  next();
};
