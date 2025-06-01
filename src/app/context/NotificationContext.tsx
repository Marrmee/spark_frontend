'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faCheckCircle,
  faInfoCircle,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

export type NotificationType = 'error' | 'success' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: number;
  isExiting?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  addNotification: (message: string, type: NotificationType) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

function NotificationContainer() {
  const context = useContext(NotificationContext);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!context || !mounted) return null;

  const { notifications, removeNotification, setNotifications } = context;

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'error':
        return faExclamationTriangle;
      case 'success':
        return faCheckCircle;
      case 'info':
        return faInfoCircle;
      default:
        return faInfoCircle;
    }
  };

  const getStyles = (type: NotificationType) => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-highlightRed bg-opacity-25',
          text: 'text-highlightRed font-medium',
          progress: 'bg-highlightRed',
        };
      case 'success':
        return {
          bg: 'bg-seaBlue-300 bg-opacity-25',
          text: 'text-seaBlue-300 font-medium',
          progress: 'bg-seaBlue-300',
        };
      case 'info':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800 font-medium',
          progress: 'bg-blue-600',
        };
      case 'warning':
        return {
          bg: 'bg-amber-100',
          text: 'text-amber-800 font-medium',
          progress: 'bg-amber-600',
        };
    }
  };

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed right-4 top-24 z-50 flex flex-col items-end space-y-3 max-w-[calc(100vw-2rem)]"
    >
      {notifications.map((notification) => {
        const styles = getStyles(notification.type);
        const uniqueKey = `notification-${notification.id}-${notification.timestamp}`;

        return (
          <div
            key={uniqueKey}
            data-notification-id={notification.id}
            className={`rounded-lg bg-seaBlue-1100 shadow-lg ${
              notification.isExiting
                ? 'animate-slideOutRight'
                : 'animate-slideInRight'
            }`}
            onAnimationEnd={(e) => {
              if (
                e.animationName.includes('slideOutRight') &&
                notification.isExiting
              ) {
                removeNotification(notification.id);
              }
            }}
          >
            <div
              className={`
                relative flex
                items-start justify-between overflow-hidden rounded-lg ${styles?.bg}
                w-full sm:w-fit max-w-[calc(100vw-2rem)] sm:max-w-md
                p-3
                backdrop-blur-sm
              `}
              role="alert"
            >
              <div className="flex min-w-0 w-full">
                <FontAwesomeIcon
                  icon={getIcon(notification.type)}
                  className={`mr-2 mt-0.5 flex-shrink-0 text-lg ${styles?.text}`}
                  aria-hidden="true"
                />
                <div className="flex min-w-0 flex-1 items-start justify-between">
                  <p
                    className={`${styles?.text} text-sm sm:text-base break-words leading-5 pr-2`}
                  >
                    {typeof notification.message === 'string'
                      ? notification.message.charAt(0).toUpperCase() +
                        notification.message.slice(1)
                      : notification.message}
                  </p>
                  <button
                    onClick={() => {
                      setNotifications((prev) =>
                        prev.map((n) =>
                          n.id === notification.id
                            ? { ...n, isExiting: true }
                            : n
                        )
                      );
                    }}
                    className={`${styles?.text} ml-2 flex-shrink-0 transition-opacity hover:opacity-80`}
                    aria-label="Close notification"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>
              </div>

              {!notification.isExiting && (
                <div
                  className={`absolute bottom-0 left-0 h-1 w-full ${styles?.progress} opacity-30`}
                  style={{
                    animation: 'progressSlideRight 8s linear forwards'
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>,
    mounted ? document.body : document.createElement('div')
  );
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let container = document.getElementById('notification-portal');
      if (!container) {
        container = document.createElement('div');
        container.id = 'notification-portal';
        document.body.appendChild(container);
      }
      setPortalContainer(container);

      return () => {
        if (container && document.body.contains(container)) {
          document.body.removeChild(container);
        }
      };
    }
  }, []);

  const addNotification = (
    message: string,
    type: NotificationType = 'info'
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    setNotifications((prev) => [...prev, { id, type, message, timestamp }]);

    // Set timeout for auto-removal
    setTimeout(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isExiting: true } : n))
      );
    }, 8000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        setNotifications,
        addNotification,
        removeNotification,
      }}
    >
      {children}
      {portalContainer && <NotificationContainer />}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotification must be used within a NotificationProvider'
    );
  }
  return context;
}
