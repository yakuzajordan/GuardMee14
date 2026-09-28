import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { notificationAPI } from '../services/api';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveIncidents, setLiveIncidents] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const s = io(SOCKET_URL, {
      auth: { token: localStorage.getItem('guardmee_token') },
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => console.log('Socket connecté'));
    s.on('notification', (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);
    });
    s.on('incident:new', (incident) => {
      setLiveIncidents((prev) => [incident, ...prev]);
    });
    s.on('incident:update', (incident) => {
      setLiveIncidents((prev) =>
        prev.map((i) => (i._id === incident._id ? incident : i))
      );
    });
    s.on('incident:validated', (incident) => {
      setLiveIncidents((prev) =>
        prev.map((i) => (i._id === incident._id ? incident : i))
      );
    });

    setSocket(s);
    return () => s.disconnect();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    notificationAPI.list().then((res) => {
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    }).catch(() => {});
  }, [isAuthenticated]);

  const markRead = useCallback(async (id) => {
    await notificationAPI.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  return (
    <SocketContext.Provider value={{
      socket, notifications, unreadCount, liveIncidents, markRead,
      setLiveIncidents,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
