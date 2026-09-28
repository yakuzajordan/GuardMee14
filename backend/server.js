import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config(); // fallback

import { connectDB, isUsingDevStore } from './src/config/db.js';
import { initFirebaseAdmin } from './src/config/firebase.js';
import { swaggerSpec } from './src/config/swagger.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { initSocket } from './src/socket/index.js';

import authRoutes from './src/routes/auth.js';
import incidentRoutes from './src/routes/incidents.js';
import moderationRoutes from './src/routes/moderation.js';
import alertRoutes from './src/routes/alerts.js';
import resourceRoutes from './src/routes/resources.js';
import notificationRoutes from './src/routes/notifications.js';
import adminRoutes from './src/routes/admin.js';
import { ensureUploadDir } from './src/socket/videoStream.js';

const app = express();
const server = createServer(app);

// Configuration CORS flexible pour le développement local
const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  if (process.env.CLIENT_URL && origin.startsWith(process.env.CLIENT_URL)) return true;
  return true; // En développement, autoriser pour éviter les blocages réseau
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
  maxHttpBufferSize: 5 * 1024 * 1024,
});

app.set('io', io);
initSocket(io);
initFirebaseAdmin();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'GuardMee API opérationnelle',
    version: '1.0.0',
    db: isUsingDevStore() ? 'dev-store' : (mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'),
  });
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { background-color: #E53E3E }',
  customSiteTitle: 'GuardMee API Docs',
}));

app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  await ensureUploadDir();
  server.listen(PORT, () => {
    console.log(`\n🛡️  GuardMee API → http://localhost:${PORT}`);
    console.log(`📚 Documentation → http://localhost:${PORT}/api/docs\n`);
  });
};

start().catch((err) => {
  console.error('Échec démarrage serveur:', err.message);
  process.exit(1);
});
