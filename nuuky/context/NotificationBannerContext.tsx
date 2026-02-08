import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import {
  InAppNotificationBanner,
  InAppNotification,
} from '../components/InAppNotificationBanner';

const MAX_QUEUE_LENGTH = 10;

interface NotificationBannerContextType {
  showNotification: (notification: InAppNotification) => void;
  dismissNotification: () => void;
}

const NotificationBannerContext = createContext<NotificationBannerContextType | undefined>(
  undefined
);

export const useNotificationBanner = () => {
  const context = useContext(NotificationBannerContext);
  if (!context) {
    throw new Error('useNotificationBanner must be used within NotificationBannerProvider');
  }
  return context;
};

interface Props {
  children: ReactNode;
}

export const NotificationBannerProvider: React.FC<Props> = ({ children }) => {
  const [currentNotification, setCurrentNotification] = useState<InAppNotification | null>(null);
  const [queue, setQueue] = useState<InAppNotification[]>([]);
  // Use ref to avoid stale closure over currentNotification
  const currentNotificationRef = useRef<InAppNotification | null>(null);
  const queueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (queueTimerRef.current) {
        clearTimeout(queueTimerRef.current);
      }
    };
  }, []);

  const showNotification = useCallback((notification: InAppNotification) => {
    if (currentNotificationRef.current) {
      // Already showing a notification — queue this one (bounded)
      setQueue((prev) => {
        if (prev.length >= MAX_QUEUE_LENGTH) return prev;
        return [...prev, notification];
      });
    } else {
      // Show immediately
      currentNotificationRef.current = notification;
      setCurrentNotification(notification);
    }
  }, []);

  const dismissNotification = useCallback(() => {
    currentNotificationRef.current = null;
    setCurrentNotification(null);

    // Clear any pending queue timer before scheduling a new one
    if (queueTimerRef.current) {
      clearTimeout(queueTimerRef.current);
    }

    // Show next notification in queue after a short delay
    queueTimerRef.current = setTimeout(() => {
      queueTimerRef.current = null;
      setQueue((prev) => {
        if (prev.length > 0) {
          const [next, ...rest] = prev;
          currentNotificationRef.current = next;
          setCurrentNotification(next);
          return rest;
        }
        return prev;
      });
    }, 300);
  }, []);

  return (
    <NotificationBannerContext.Provider value={{ showNotification, dismissNotification }}>
      {children}
      <InAppNotificationBanner
        notification={currentNotification}
        onDismiss={dismissNotification}
      />
    </NotificationBannerContext.Provider>
  );
};
