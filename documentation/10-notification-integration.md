# Module 10: Notification Integration Implementation

## 📋 Overview & Objectives

The Notification Integration module provides comprehensive notification, alert, and communication systems for the Spark platform. It manages real-time updates, user preferences, cross-platform notifications, and integration with external communication channels.

### **Key Responsibilities**
- Real-time notification system
- User notification preferences management
- Cross-platform notification delivery
- Integration with email, SMS, and push notifications
- Event-driven notification triggers

---

## 🔔 Notification Architecture

### **Notification Types & Triggers**
```typescript
// Notification categories
export enum NotificationType {
  // Idea Lifecycle
  IDEA_SUBMITTED = 'idea_submitted',
  IDEA_UNDER_REVIEW = 'idea_under_review',
  IDEA_APPROVED = 'idea_approved',
  IDEA_REJECTED = 'idea_rejected',
  IDEA_MODIFIED = 'idea_modified',
  
  // Review Process
  REVIEW_ASSIGNED = 'review_assigned',
  REVIEW_COMPLETED = 'review_completed',
  REVIEW_DUE_SOON = 'review_due_soon',
  REVIEWER_INVITED = 'reviewer_invited',
  
  // Governance
  PROPOSAL_CREATED = 'proposal_created',
  VOTING_OPENED = 'voting_opened',
  VOTING_CLOSING_SOON = 'voting_closing_soon',
  PROPOSAL_EXECUTED = 'proposal_executed',
  
  // IP-NFT & Patents
  IPNFT_MINTED = 'ipnft_minted',
  LICENSE_PURCHASED = 'license_purchased',
  PATENT_DEADLINE = 'patent_deadline',
  PATENT_STATUS_CHANGE = 'patent_status_change',
  
  // System
  SYSTEM_MAINTENANCE = 'system_maintenance',
  SECURITY_ALERT = 'security_alert',
  FEATURE_ANNOUNCEMENT = 'feature_announcement'
}

interface NotificationData {
  id: string;
  type: NotificationType;
  recipientAddress: string;
  title: string;
  message: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: NotificationChannel[];
  metadata: Record<string, any>;
  timestamp: Date;
  read: boolean;
  dismissed: boolean;
}

interface NotificationPreferences {
  userAddress: string;
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  categories: {
    [key in NotificationType]: {
      enabled: boolean;
      channels: NotificationChannel[];
      frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
    };
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
}
```

---

## 🎨 Component Architecture

### **Component Structure**
```
src/app/components/spark/notifications/
├── InApp/
│   ├── NotificationCenter.tsx      # Main notification center
│   ├── NotificationDropdown.tsx    # Dropdown notification list
│   ├── NotificationItem.tsx        # Individual notification
│   ├── NotificationBadge.tsx       # Unread count badge
│   └── QuickActions.tsx            # Quick action buttons
├── Preferences/
│   ├── NotificationSettings.tsx    # User notification preferences
│   ├── ChannelSettings.tsx         # Channel-specific settings
│   ├── CategorySettings.tsx        # Category-specific preferences
│   ├── QuietHours.tsx              # Quiet hours configuration
│   └── TestNotifications.tsx       # Test notification delivery
├── Templates/
│   ├── EmailTemplates.tsx          # Email notification templates
│   ├── SMSTemplates.tsx            # SMS notification templates
│   ├── PushTemplates.tsx           # Push notification templates
│   └── InAppTemplates.tsx          # In-app notification templates
├── Delivery/
│   ├── NotificationQueue.tsx       # Notification queue management
│   ├── DeliveryStatus.tsx          # Track delivery status
│   ├── RetryMechanism.tsx          # Handle delivery failures
│   └── AnalyticsTracking.tsx       # Notification analytics
├── Integration/
│   ├── EmailProvider.tsx           # Email service integration
│   ├── SMSProvider.tsx             # SMS service integration
│   ├── PushProvider.tsx            # Push notification service
│   └── WebSocketManager.tsx        # Real-time updates
└── Shared/
    ├── NotificationUtils.tsx       # Utility functions
    ├── NotificationHooks.tsx       # Custom hooks
    ├── NotificationTypes.tsx       # Type definitions
    └── NotificationConstants.tsx   # Constants and configs
```

---

## 🔧 Core Notification Components

### **1. Notification Center**

```typescript
// InApp/NotificationCenter.tsx
export const NotificationCenter: React.FC = () => {
  const { address } = useWalletContext();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    setupRealTimeUpdates();
    
    return () => {
      cleanupRealTimeUpdates();
    };
  }, [address]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const userNotifications = await fetchUserNotifications(address);
      setNotifications(userNotifications);
    } catch (error) {
      handleError(error, 'Loading notifications');
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeUpdates = () => {
    // WebSocket connection for real-time notifications
    const ws = new WebSocket(WS_NOTIFICATION_ENDPOINT);
    
    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      if (notification.recipientAddress === address) {
        handleNewNotification(notification);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  };

  const handleNewNotification = (notification: NotificationData) => {
    setNotifications(prev => [notification, ...prev]);
    
    // Show browser notification if enabled
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/spark-logo.png',
        tag: notification.id
      });
    }

    // Play notification sound
    playNotificationSound(notification.priority);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await updateNotificationStatus(notificationId, { read: true });
      
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter(notif => !notif.read)
        .map(notif => notif.id);
      
      await bulkUpdateNotifications(unreadIds, { read: true });
      
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    } catch (error) {
      handleError(error, 'Marking all notifications as read');
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      await updateNotificationStatus(notificationId, { dismissed: true });
      
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return !notification.dismissed;
    if (filter === 'unread') return !notification.read && !notification.dismissed;
    return notification.type === filter && !notification.dismissed;
  });

  const unreadCount = notifications.filter(notif => !notif.read && !notif.dismissed).length;

  return (
    <div className="notification-center">
      {/* Notification Trigger */}
      <NotificationTrigger
        unreadCount={unreadCount}
        onClick={() => setIsOpen(!isOpen)}
        isOpen={isOpen}
      />

      {/* Notification Panel */}
      {isOpen && (
        <NotificationPanel
          notifications={filteredNotifications}
          filter={filter}
          onFilterChange={setFilter}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDismiss={dismissNotification}
          loading={loading}
        />
      )}
    </div>
  );
};

const NotificationTrigger: React.FC<{
  unreadCount: number;
  onClick: () => void;
  isOpen: boolean;
}> = ({ unreadCount, onClick, isOpen }) => (
  <button 
    className={`notification-trigger ${isOpen ? 'active' : ''}`}
    onClick={onClick}
  >
    <Bell className="h-6 w-6" />
    {unreadCount > 0 && (
      <NotificationBadge count={unreadCount} />
    )}
  </button>
);

const NotificationPanel: React.FC<{
  notifications: NotificationData[];
  filter: string;
  onFilterChange: (filter: any) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (id: string) => void;
  loading: boolean;
}> = ({ 
  notifications, 
  filter, 
  onFilterChange, 
  onMarkAsRead, 
  onMarkAllAsRead, 
  onDismiss, 
  loading 
}) => (
  <div className="notification-panel">
    <div className="panel-header">
      <h3>Notifications</h3>
      <div className="panel-actions">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMarkAllAsRead}
          disabled={notifications.every(n => n.read)}
        >
          Mark all read
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/notifications/settings')}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>

    <div className="panel-filters">
      <NotificationFilters
        currentFilter={filter}
        onFilterChange={onFilterChange}
      />
    </div>

    <div className="panel-content">
      {loading ? (
        <NotificationsSkeleton />
      ) : notifications.length === 0 ? (
        <EmptyNotifications filter={filter} />
      ) : (
        <div className="notifications-list">
          {notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      )}
    </div>
  </div>
);
```

### **2. Notification Settings**

```typescript
// Preferences/NotificationSettings.tsx
export const NotificationSettings: React.FC = () => {
  const { address } = useWalletContext();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [testChannel, setTestChannel] = useState<NotificationChannel>('inApp');
  const [isTesting, setIsTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotificationPreferences();
  }, [address]);

  const loadNotificationPreferences = async () => {
    try {
      setLoading(true);
      const userPreferences = await getUserNotificationPreferences(address);
      setPreferences(userPreferences || getDefaultPreferences());
    } catch (error) {
      handleError(error, 'Loading notification preferences');
      setPreferences(getDefaultPreferences());
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!preferences) return;

    try {
      const updatedPreferences = { ...preferences, ...updates };
      await saveNotificationPreferences(address, updatedPreferences);
      setPreferences(updatedPreferences);
      
      showSuccessNotification('Notification preferences updated');
    } catch (error) {
      handleError(error, 'Updating notification preferences');
    }
  };

  const updateChannelSettings = (channels: NotificationPreferences['channels']) => {
    updatePreferences({ channels });
  };

  const updateCategorySettings = (category: NotificationType, settings: any) => {
    if (!preferences) return;

    const updatedCategories = {
      ...preferences.categories,
      [category]: { ...preferences.categories[category], ...settings }
    };

    updatePreferences({ categories: updatedCategories });
  };

  const testNotification = async () => {
    setIsTesting(true);
    try {
      await sendTestNotification(address, testChannel);
      showSuccessNotification(`Test notification sent via ${testChannel}`);
    } catch (error) {
      handleError(error, 'Sending test notification');
    } finally {
      setIsTesting(false);
    }
  };

  if (loading) {
    return <NotificationSettingsSkeleton />;
  }

  if (!preferences) {
    return <NotificationSettingsError />;
  }

  return (
    <div className="notification-settings">
      <div className="settings-header">
        <h1>Notification Settings</h1>
        <p className="text-gray-600">
          Customize how and when you receive notifications from Spark
        </p>
      </div>

      <div className="settings-sections">
        {/* Channel Settings */}
        <SettingsSection
          title="Notification Channels"
          description="Choose which channels to receive notifications through"
        >
          <ChannelSettings
            channels={preferences.channels}
            onChange={updateChannelSettings}
          />
        </SettingsSection>

        {/* Category Settings */}
        <SettingsSection
          title="Notification Categories"
          description="Customize notifications for different types of events"
        >
          <CategorySettings
            categories={preferences.categories}
            onChange={updateCategorySettings}
          />
        </SettingsSection>

        {/* Quiet Hours */}
        <SettingsSection
          title="Quiet Hours"
          description="Set times when you don't want to receive notifications"
        >
          <QuietHoursSettings
            quietHours={preferences.quietHours}
            onChange={(quietHours) => updatePreferences({ quietHours })}
          />
        </SettingsSection>

        {/* Test Notifications */}
        <SettingsSection
          title="Test Notifications"
          description="Send test notifications to verify your settings"
        >
          <TestNotificationPanel
            selectedChannel={testChannel}
            onChannelChange={setTestChannel}
            onSendTest={testNotification}
            isTesting={isTesting}
          />
        </SettingsSection>
      </div>
    </div>
  );
};

const ChannelSettings: React.FC<{
  channels: NotificationPreferences['channels'];
  onChange: (channels: NotificationPreferences['channels']) => void;
}> = ({ channels, onChange }) => {
  const updateChannel = (channel: keyof NotificationPreferences['channels'], enabled: boolean) => {
    onChange({ ...channels, [channel]: enabled });
  };

  return (
    <div className="channel-settings">
      <div className="channel-grid">
        <ChannelToggle
          id="inApp"
          label="In-App Notifications"
          description="Show notifications within the application"
          icon={<Bell className="h-5 w-5" />}
          enabled={channels.inApp}
          onChange={(enabled) => updateChannel('inApp', enabled)}
        />

        <ChannelToggle
          id="email"
          label="Email Notifications"
          description="Send notifications to your email address"
          icon={<Mail className="h-5 w-5" />}
          enabled={channels.email}
          onChange={(enabled) => updateChannel('email', enabled)}
        />

        <ChannelToggle
          id="push"
          label="Push Notifications"
          description="Browser push notifications"
          icon={<Smartphone className="h-5 w-5" />}
          enabled={channels.push}
          onChange={(enabled) => updateChannel('push', enabled)}
          requiresPermission={true}
        />

        <ChannelToggle
          id="sms"
          label="SMS Notifications"
          description="Send notifications via SMS (premium feature)"
          icon={<MessageSquare className="h-5 w-5" />}
          enabled={channels.sms}
          onChange={(enabled) => updateChannel('sms', enabled)}
          premium={true}
        />
      </div>
    </div>
  );
};
```

### **3. Email Notification Service**

```typescript
// Integration/EmailProvider.tsx
export class EmailNotificationService {
  private static instance: EmailNotificationService;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_EMAIL_API_KEY || '';
    this.baseUrl = process.env.NEXT_PUBLIC_EMAIL_API_URL || '';
  }

  static getInstance(): EmailNotificationService {
    if (!EmailNotificationService.instance) {
      EmailNotificationService.instance = new EmailNotificationService();
    }
    return EmailNotificationService.instance;
  }

  async sendNotification(notification: NotificationData, userEmail: string): Promise<boolean> {
    try {
      const template = this.getEmailTemplate(notification.type);
      const htmlContent = this.renderEmailTemplate(template, notification);

      const emailData = {
        to: userEmail,
        subject: notification.title,
        html: htmlContent,
        text: notification.message,
        headers: {
          'X-Notification-ID': notification.id,
          'X-Notification-Type': notification.type
        }
      };

      const response = await fetch(`${this.baseUrl}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        throw new Error(`Email send failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Log delivery status
      await this.logDeliveryStatus(notification.id, 'email', 'sent', result.messageId);
      
      return true;
    } catch (error) {
      console.error('Email notification failed:', error);
      
      // Log delivery failure
      await this.logDeliveryStatus(notification.id, 'email', 'failed', error.message);
      
      return false;
    }
  }

  private getEmailTemplate(type: NotificationType): EmailTemplate {
    switch (type) {
      case NotificationType.IDEA_APPROVED:
        return {
          name: 'idea-approved',
          subject: '🎉 Your research idea has been approved!',
          header: 'Congratulations!',
          color: '#10B981'
        };
        
      case NotificationType.REVIEW_ASSIGNED:
        return {
          name: 'review-assigned',
          subject: '📝 You have been assigned a new review',
          header: 'New Review Assignment',
          color: '#3B82F6'
        };
        
      case NotificationType.PATENT_DEADLINE:
        return {
          name: 'patent-deadline',
          subject: '⚠️ Patent deadline approaching',
          header: 'Important Deadline',
          color: '#F59E0B'
        };
        
      default:
        return {
          name: 'generic',
          subject: notification.title,
          header: 'Spark Notification',
          color: '#6366F1'
        };
    }
  }

  private renderEmailTemplate(template: EmailTemplate, notification: NotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${template.subject}</title>
          <style>
            ${this.getEmailStyles()}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header" style="background-color: ${template.color}">
              <h1>${template.header}</h1>
            </div>
            
            <div class="content">
              <h2>${notification.title}</h2>
              <p>${notification.message}</p>
              
              ${notification.actionUrl ? `
                <div class="action">
                  <a href="${notification.actionUrl}" class="button" style="background-color: ${template.color}">
                    View Details
                  </a>
                </div>
              ` : ''}
            </div>
            
            <div class="footer">
              <p>This notification was sent from Spark Research Platform</p>
              <p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/notifications/unsubscribe">
                  Unsubscribe
                </a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getEmailStyles(): string {
    return `
      body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
      .container { max-width: 600px; margin: 0 auto; background-color: white; }
      .header { padding: 20px; text-align: center; color: white; }
      .header h1 { margin: 0; font-size: 24px; }
      .content { padding: 30px; }
      .content h2 { color: #333; margin-top: 0; }
      .content p { color: #666; line-height: 1.6; }
      .action { text-align: center; margin: 30px 0; }
      .button { 
        display: inline-block; 
        padding: 12px 24px; 
        color: white; 
        text-decoration: none; 
        border-radius: 5px; 
        font-weight: bold; 
      }
      .footer { 
        padding: 20px; 
        background-color: #f8f9fa; 
        text-align: center; 
        font-size: 12px; 
        color: #666; 
      }
      .footer a { color: #666; }
    `;
  }

  private async logDeliveryStatus(
    notificationId: string,
    channel: string,
    status: 'sent' | 'failed',
    details: string
  ): Promise<void> {
    try {
      await fetch('/api/notifications/delivery-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          channel,
          status,
          details,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to log delivery status:', error);
    }
  }
}
```

### **4. Notification Event Manager**

```typescript
// Shared/NotificationEventManager.tsx
export class NotificationEventManager {
  private static instance: NotificationEventManager;
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  static getInstance(): NotificationEventManager {
    if (!NotificationEventManager.instance) {
      NotificationEventManager.instance = new NotificationEventManager();
    }
    return NotificationEventManager.instance;
  }

  // Subscribe to specific contract events for notifications
  subscribeToSparkEvents() {
    const { sparkIdeaRegistry, governorResearch } = useSparkContracts();

    // Idea submission events
    sparkIdeaRegistry.on('IdeaSubmitted', (ideaId, ideator, ipfsHash, event) => {
      this.triggerNotification(NotificationType.IDEA_SUBMITTED, {
        ideaId,
        ideator,
        title: 'New idea submitted',
        message: `Idea ${ideaId.slice(0, 8)}... has been submitted for review`,
        actionUrl: `/spark/ideas/${ideaId}`,
        priority: 'medium'
      });
    });

    // Review vote events
    sparkIdeaRegistry.on('IdeaReviewVoteCast', (ideaId, reviewer, support, event) => {
      this.triggerNotification(NotificationType.REVIEW_COMPLETED, {
        ideaId,
        reviewer,
        support,
        title: 'Review completed',
        message: `A reviewer has ${support ? 'approved' : 'rejected'} idea ${ideaId.slice(0, 8)}...`,
        actionUrl: `/spark/ideas/${ideaId}`,
        priority: 'medium'
      });
    });

    // Governance proposal events
    governorResearch.on('ProposalCreated', (proposalId, proposer, description, event) => {
      this.triggerNotification(NotificationType.PROPOSAL_CREATED, {
        proposalId,
        proposer,
        title: 'New governance proposal',
        message: `Proposal ${proposalId} has been created`,
        actionUrl: `/governance/proposals/${proposalId}`,
        priority: 'medium'
      });
    });

    // Voting events
    governorResearch.on('VoteCast', (voter, proposalId, support, weight, event) => {
      // Only notify proposal creator
      this.triggerNotification(NotificationType.VOTING_OPENED, {
        proposalId,
        voter,
        support,
        weight,
        title: 'Vote cast on your proposal',
        message: `Someone voted on proposal ${proposalId}`,
        actionUrl: `/governance/proposals/${proposalId}`,
        priority: 'low'
      });
    });
  }

  async triggerNotification(type: NotificationType, data: any) {
    try {
      // Create notification object
      const notification: NotificationData = {
        id: generateNotificationId(),
        type,
        recipientAddress: data.recipient || data.ideator || data.proposer,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        priority: data.priority || 'medium',
        channels: await this.determineChannels(data.recipient, type),
        metadata: data,
        timestamp: new Date(),
        read: false,
        dismissed: false
      };

      // Store notification
      await this.storeNotification(notification);

      // Send through enabled channels
      await this.deliverNotification(notification);

      // Emit to real-time listeners
      this.emit('notification', notification);

    } catch (error) {
      console.error('Failed to trigger notification:', error);
    }
  }

  private async determineChannels(
    userAddress: string, 
    type: NotificationType
  ): Promise<NotificationChannel[]> {
    try {
      const preferences = await getUserNotificationPreferences(userAddress);
      if (!preferences) return ['inApp'];

      const categorySettings = preferences.categories[type];
      if (!categorySettings || !categorySettings.enabled) return [];

      return categorySettings.channels.filter(channel => 
        preferences.channels[channel]
      );
    } catch (error) {
      console.error('Failed to determine notification channels:', error);
      return ['inApp'];
    }
  }

  private async deliverNotification(notification: NotificationData) {
    const deliveryPromises = notification.channels.map(async (channel) => {
      switch (channel) {
        case 'inApp':
          return this.deliverInApp(notification);
        case 'email':
          return this.deliverEmail(notification);
        case 'push':
          return this.deliverPush(notification);
        case 'sms':
          return this.deliverSMS(notification);
        default:
          return false;
      }
    });

    await Promise.allSettled(deliveryPromises);
  }

  private async deliverInApp(notification: NotificationData): Promise<boolean> {
    // Real-time delivery via WebSocket
    return this.sendWebSocketNotification(notification);
  }

  private async deliverEmail(notification: NotificationData): Promise<boolean> {
    const emailService = EmailNotificationService.getInstance();
    const userEmail = await getUserEmail(notification.recipientAddress);
    
    if (!userEmail) return false;
    
    return emailService.sendNotification(notification, userEmail);
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Notification listener error:', error);
        }
      });
    }
  }

  addEventListener(event: string, callback: (data: any) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  removeEventListener(event: string, callback: (data: any) => void) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }
}
```

---

## 🧪 Testing Guidelines

### **Notification Testing**

```typescript
// __tests__/components/NotificationCenter.test.tsx
describe('NotificationCenter', () => {
  beforeEach(() => {
    mockNotificationAPI.mockResolvedValue([
      { id: '1', title: 'Test Notification', read: false }
    ]);
  });

  test('displays unread notification count', async () => {
    render(<NotificationCenter />);
    
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  test('marks notification as read when clicked', async () => {
    render(<NotificationCenter />);
    
    fireEvent.click(screen.getByText('Test Notification'));
    
    await waitFor(() => {
      expect(mockNotificationAPI.markAsRead).toHaveBeenCalledWith('1');
    });
  });
});
```

---

## ✅ Implementation Checklist

### **Core Notification Features**
- [ ] Real-time notification center
- [ ] User preference management
- [ ] Multi-channel delivery system
- [ ] Event-driven notifications

### **Integration Features**
- [ ] Email service integration
- [ ] Push notification support
- [ ] SMS delivery (premium)
- [ ] WebSocket real-time updates

### **User Experience**
- [ ] Notification templates
- [ ] Quiet hours support
- [ ] Delivery status tracking
- [ ] Test notification system

### **Advanced Features**
- [ ] Notification analytics
- [ ] A/B testing for templates
- [ ] Rate limiting and throttling
- [ ] Unsubscribe management

Remember: This module handles user communication. Ensure compliance with privacy laws, respect user preferences, and maintain high delivery reliability. 