import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  InAppNotificationBanner,
  InAppNotification,
} from '../components/InAppNotificationBanner';

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

  const showNotification = useCallback((notification: InAppNotification) => {
    setQueue((prev) => {
      // If there's already a notification showing, queue this one
      if (currentNotification) {
        return [...prev, notification];
      }
      // Otherwise show it immediately
      setCurrentNotification(notification);
      return prev;
    });

    // If no notification is currently showing, show this one
    if (!currentNotification) {
      setCurrentNotification(notification);
    }
  }, [currentNotification]);

  const dismissNotification = useCallback(() => {
    setCurrentNotification(null);

    // Show next notification in queue after a short delay
    setTimeout(() => {
      setQueue((prev) => {
        if (prev.length > 0) {
          const [next, ...rest] = prev;
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
