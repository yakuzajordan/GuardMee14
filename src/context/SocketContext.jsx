import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToIncidents, subscribeToNotifications, markNotificationRead, markAllNotificationsRead } from '../services/firestoreDB';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveIncidents, setLiveIncidents] = useState([]);

  // Subscribe to incidents in real-time (Firestore onSnapshot)
  useEffect(() => {
    const unsubscribe = subscribeToIncidents((incidents) => {
      setLiveIncidents(incidents);
    });
    return unsubscribe;
  }, []);

  // Subscribe to notifications when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;

    const unsubscribe = subscribeToNotifications(user._id, ({ notifications: notifs, unreadCount: count }) => {
      setNotifications(notifs);
      setUnreadCount(count);
    });

    return unsubscribe;
  }, [isAuthenticated, user?._id]);

  const markRead = useCallback(async (id) => {
    if (!user?._id) return;
    await markNotificationRead(user._id, id);
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, [user?._id]);

  const markAllRead = useCallback(async () => {
    if (!user?._id) return;
    await markAllNotificationsRead(user._id);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{
      socket: null,
      notifications,
      unreadCount,
      liveIncidents,
      setLiveIncidents,
      markRead,
      markAllRead,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
