import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isUsingDevStore } from '../config/db.js';
import * as devStore from '../dev/devUserStore.js';
import { registerVideoStreamHandlers } from './videoStream.js';

const findSocketUser = async (id) => {
  if (isUsingDevStore()) {
    const user = devStore.findById(id);
    return user ? { ...user, _id: user._id } : null;
  }
  return User.findById(id);
};

export const initSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await findSocketUser(decoded.id);
        if (user) {
          socket.user = user;
          socket.join(`user:${user._id}`);
          if (['agent', 'admin', 'moderateur'].includes(user.role)) {
            socket.join('security');
            socket.join('pompiers');
            socket.join('samu');
            socket.join('police');
            socket.join('technique');
          }
        }
      }
      next();
    } catch {
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connecté: ${socket.id}${socket.user ? ` (${socket.user.name})` : ''}`);

    registerVideoStreamHandlers(io, socket);

    socket.on('location:update', async ({ coordinates }) => {
      if (!socket.user || !coordinates) return;
      if (!isUsingDevStore()) {
        await User.findByIdAndUpdate(socket.user._id, {
          'defaultLocation.coordinates': coordinates,
        });
      }
    });

    socket.on('join:incident', (incidentId) => {
      socket.join(`incident:${incidentId}`);
    });

    socket.on('message:incident', async ({ incidentId, message }) => {
      if (!socket.user) return;
      io.to(`incident:${incidentId}`).emit('message:received', {
        from: socket.user.name,
        role: socket.user.role,
        message,
        at: new Date(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket déconnecté: ${socket.id}`);
    });
  });
};
