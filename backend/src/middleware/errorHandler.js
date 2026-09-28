export const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err.message);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join('. ') });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'champ';
    return res.status(400).json({
      success: false,
      message: `Un compte existe déjà avec ce ${field === 'email' ? 'email' : field === 'phone' ? 'téléphone' : field}`,
    });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Erreur serveur interne',
    ...(process.env.DEV_MODE === 'true' && { stack: err.stack }),
  });
};

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}
