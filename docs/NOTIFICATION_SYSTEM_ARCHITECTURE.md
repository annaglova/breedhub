# Notification System Architecture

## Overview

This document describes the architecture of the BreedHub notification system. The system is designed to handle both immediate local feedback (toasts) and persistent server-side notifications with real-time updates.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NOTIFICATION SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐                                                        │
│  │    Supabase     │                                                        │
│  │    Database     │                                                        │
│  │  ┌───────────┐  │                                                        │
│  │  │notifications│ │                                                        │
│  │  │   table    │  │                                                        │
│  │  └───────────┘  │                                                        │
│  └────────┬────────┘                                                        │
│           │ Realtime subscription                                           │
│           ▼                                                                  │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐     │
│  │   Supabase      │      │  Notification   │      │  Notification   │     │
│  │   Realtime      │─────▶│     Store       │─────▶│    Center UI    │     │
│  │   Channel       │      │  (signals)      │      │  (Bell + Panel) │     │
│  └─────────────────┘      └────────┬────────┘      └─────────────────┘     │
│                                    │                                        │
│                                    │ Important notifications                │
│                                    │ trigger toast                          │
│                                    ▼                                        │
│  Local actions ──────────▶ ┌─────────────────┐      ┌─────────────────┐    │
│  (copy, save, errors)      │   Toast Store   │─────▶│   Toast UI      │    │
│                            │   (signals)     │      │ (bottom-left)   │    │
│                            └─────────────────┘      └─────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Two-Level Architecture

### Level 1: Toast Store (Local, Ephemeral)

**Purpose:** Immediate user feedback for local actions.

**Characteristics:**
- Not persisted to database
- Auto-dismiss after timeout (3-5 seconds)
- Simple API for quick usage
- Positioned bottom-left of screen
- Stack multiple toasts vertically

**Use Cases:**
- "Link copied!"
- "Name copied!"
- "Changes saved"
- "Error: Something went wrong"
- Form validation errors
- Network errors

**API Design:**
```typescript
// Simple usage
toast.success("Link copied!")
toast.error("Failed to save")
toast.info("Processing...")
toast.warning("Unsaved changes")

// With options
toast.success("Saved!", {
  duration: 5000,
  action: { label: "Undo", onClick: () => {} }
})
```

### Level 2: Notification Store (Persistent, Real-time)

**Purpose:** Important notifications that need to be tracked and can be read later.

**Characteristics:**
- Persisted in Supabase `notifications` table
- Real-time updates via Supabase Realtime
- read/unread status tracking
- Grouping for certain notification types
- Bell icon with unread counter badge
- Facebook-style dropdown panel
- Actions (buttons) on notifications

**Use Cases:**
- "New dog show in your area next week"
- "Someone commented on your kennel"
- "Your listing was approved"
- "New message from breeder"
- "Price drop on watched item"
- System announcements

## Database Schema

### notifications table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  type VARCHAR(50) NOT NULL,           -- 'comment', 'show_reminder', 'message', 'system', etc.
  title VARCHAR(255) NOT NULL,
  body TEXT,

  -- Related entity (polymorphic)
  entity_type VARCHAR(50),             -- 'breed', 'kennel', 'show', 'pet', etc.
  entity_id UUID,

  -- Metadata (flexible JSON for type-specific data)
  metadata JSONB DEFAULT '{}',

  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Grouping (for collapsible notifications)
  group_key VARCHAR(100),              -- e.g., 'comments:breed:123' for grouping

  -- Actions (optional buttons)
  actions JSONB DEFAULT '[]',          -- [{ "label": "View", "url": "/path" }]

  -- Priority
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,              -- Auto-delete after this date

  -- Indexes
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_group_key ON notifications(group_key);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (TRUE);  -- Controlled by backend/functions
```

### notification_preferences table (future)

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Per-type preferences
  type VARCHAR(50) NOT NULL,

  -- Channels
  in_app BOOLEAN DEFAULT TRUE,
  email BOOLEAN DEFAULT FALSE,
  push BOOLEAN DEFAULT FALSE,

  -- Frequency for email digests
  email_frequency VARCHAR(20) DEFAULT 'instant', -- 'instant', 'daily', 'weekly', 'never'

  UNIQUE(user_id, type)
);
```

## Notification Types

| Type | Description | Groupable | Priority | Toast on Receive |
|------|-------------|-----------|----------|------------------|
| `comment` | Someone commented | Yes | normal | No |
| `mention` | Someone mentioned you | No | high | Yes |
| `message` | New direct message | No | high | Yes |
| `show_reminder` | Upcoming dog show | No | normal | No |
| `listing_approved` | Your listing was approved | No | normal | Yes |
| `listing_rejected` | Your listing was rejected | No | high | Yes |
| `price_alert` | Price change on watched item | Yes | low | No |
| `follow` | Someone followed you | Yes | low | No |
| `system` | System announcement | No | varies | Yes (if urgent) |

## Store Implementations

### ToastStore (packages/rxdb-store/src/stores/toast.store.ts)

```typescript
import { signal, computed } from '@preact/signals-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}

interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const DEFAULT_DURATION = 4000;
const MAX_TOASTS = 5;

class ToastStore {
  private static instance: ToastStore;

  private _toasts = signal<Toast[]>([]);

  // Computed: visible toasts (limited)
  readonly toasts = computed(() => this._toasts.value.slice(0, MAX_TOASTS));
  readonly hasToasts = computed(() => this._toasts.value.length > 0);

  private constructor() {}

  static getInstance(): ToastStore {
    if (!ToastStore.instance) {
      ToastStore.instance = new ToastStore();
    }
    return ToastStore.instance;
  }

  private add(type: ToastType, message: string, options?: ToastOptions): string {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const duration = options?.duration ?? DEFAULT_DURATION;

    const toast: Toast = {
      id,
      type,
      message,
      duration,
      action: options?.action,
      createdAt: Date.now(),
    };

    this._toasts.value = [toast, ...this._toasts.value];

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }

    return id;
  }

  remove(id: string): void {
    this._toasts.value = this._toasts.value.filter(t => t.id !== id);
  }

  clear(): void {
    this._toasts.value = [];
  }

  // Convenience methods
  success(message: string, options?: ToastOptions): string {
    return this.add('success', message, options);
  }

  error(message: string, options?: ToastOptions): string {
    return this.add('error', message, { duration: 6000, ...options });
  }

  info(message: string, options?: ToastOptions): string {
    return this.add('info', message, options);
  }

  warning(message: string, options?: ToastOptions): string {
    return this.add('warning', message, options);
  }
}

export const toastStore = ToastStore.getInstance();

// Shorthand export for convenience
export const toast = {
  success: (msg: string, opts?: ToastOptions) => toastStore.success(msg, opts),
  error: (msg: string, opts?: ToastOptions) => toastStore.error(msg, opts),
  info: (msg: string, opts?: ToastOptions) => toastStore.info(msg, opts),
  warning: (msg: string, opts?: ToastOptions) => toastStore.warning(msg, opts),
  remove: (id: string) => toastStore.remove(id),
  clear: () => toastStore.clear(),
};
```

### NotificationStore (future - packages/rxdb-store/src/stores/notification.store.ts)

```typescript
import { signal, computed } from '@preact/signals-react';
import { supabase } from '../services/supabase';
import { toast } from './toast.store';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  metadata: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  groupKey?: string;
  actions: Array<{ label: string; url: string }>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  expiresAt?: string;
}

interface GroupedNotification {
  groupKey: string;
  type: string;
  count: number;
  latestNotification: Notification;
  notifications: Notification[];
}

class NotificationStore {
  private static instance: NotificationStore;

  private _notifications = signal<Notification[]>([]);
  private _isLoading = signal(false);
  private _isSubscribed = signal(false);

  // Computed values
  readonly notifications = computed(() => this._notifications.value);
  readonly unreadCount = computed(() =>
    this._notifications.value.filter(n => !n.isRead).length
  );
  readonly hasUnread = computed(() => this.unreadCount.value > 0);

  // Grouped notifications (for UI)
  readonly groupedNotifications = computed(() => {
    const grouped = new Map<string, GroupedNotification>();
    const ungrouped: Notification[] = [];

    for (const notification of this._notifications.value) {
      if (notification.groupKey) {
        const existing = grouped.get(notification.groupKey);
        if (existing) {
          existing.count++;
          existing.notifications.push(notification);
          if (notification.createdAt > existing.latestNotification.createdAt) {
            existing.latestNotification = notification;
          }
        } else {
          grouped.set(notification.groupKey, {
            groupKey: notification.groupKey,
            type: notification.type,
            count: 1,
            latestNotification: notification,
            notifications: [notification],
          });
        }
      } else {
        ungrouped.push(notification);
      }
    }

    return { grouped: Array.from(grouped.values()), ungrouped };
  });

  private constructor() {}

  static getInstance(): NotificationStore {
    if (!NotificationStore.instance) {
      NotificationStore.instance = new NotificationStore();
    }
    return NotificationStore.instance;
  }

  // Initialize and subscribe to realtime
  async initialize(userId: string): Promise<void> {
    if (this._isSubscribed.value) return;

    this._isLoading.value = true;

    try {
      // Fetch existing notifications
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      this._notifications.value = data?.map(this.mapFromDb) ?? [];

      // Subscribe to realtime
      supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const notification = this.mapFromDb(payload.new);
            this._notifications.value = [notification, ...this._notifications.value];

            // Show toast for high priority notifications
            if (notification.priority === 'high' || notification.priority === 'urgent') {
              toast.info(notification.title);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const updated = this.mapFromDb(payload.new);
            this._notifications.value = this._notifications.value.map(n =>
              n.id === updated.id ? updated : n
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            this._notifications.value = this._notifications.value.filter(
              n => n.id !== payload.old.id
            );
          }
        )
        .subscribe();

      this._isSubscribed.value = true;
    } catch (error) {
      console.error('[NotificationStore] Failed to initialize:', error);
      toast.error('Failed to load notifications');
    } finally {
      this._isLoading.value = false;
    }
  }

  // Mark as read
  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[NotificationStore] Failed to mark as read:', error);
      return;
    }

    // Optimistic update
    this._notifications.value = this._notifications.value.map(n =>
      n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
    );
  }

  // Mark all as read
  async markAllAsRead(): Promise<void> {
    const unreadIds = this._notifications.value
      .filter(n => !n.isRead)
      .map(n => n.id);

    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', unreadIds);

    if (error) {
      console.error('[NotificationStore] Failed to mark all as read:', error);
      return;
    }

    // Optimistic update
    this._notifications.value = this._notifications.value.map(n => ({
      ...n,
      isRead: true,
      readAt: n.readAt ?? new Date().toISOString(),
    }));
  }

  // Delete notification
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[NotificationStore] Failed to delete:', error);
      return;
    }

    // Optimistic update
    this._notifications.value = this._notifications.value.filter(n => n.id !== id);
  }

  // Map database record to Notification interface
  private mapFromDb(record: any): Notification {
    return {
      id: record.id,
      type: record.type,
      title: record.title,
      body: record.body,
      entityType: record.entity_type,
      entityId: record.entity_id,
      metadata: record.metadata ?? {},
      isRead: record.is_read,
      readAt: record.read_at,
      groupKey: record.group_key,
      actions: record.actions ?? [],
      priority: record.priority,
      createdAt: record.created_at,
      expiresAt: record.expires_at,
    };
  }

  // Cleanup
  destroy(): void {
    supabase.removeAllChannels();
    this._isSubscribed.value = false;
    this._notifications.value = [];
  }
}

export const notificationStore = NotificationStore.getInstance();
```

## UI Components

### Toast Components

```
packages/ui/components/
├── toast/
│   ├── Toaster.tsx        # Container that renders all toasts
│   ├── Toast.tsx          # Individual toast component
│   └── toast.styles.ts    # Styles and animations
```

**Toaster positioning:** Fixed, bottom-left, with stack animation.

### Notification Components (future)

```
apps/app/src/components/notifications/
├── NotificationBell.tsx        # Bell icon with badge
├── NotificationPanel.tsx       # Dropdown panel (Facebook-style)
├── NotificationItem.tsx        # Single notification row
├── NotificationGroup.tsx       # Grouped notifications (collapsible)
└── NotificationActions.tsx     # Action buttons
```

## Push Notifications (Future)

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Supabase  │────▶│   Edge      │────▶│   FCM /     │
│   Trigger   │     │   Function  │     │   APNs      │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │   Device    │
                                        │   (PWA/App) │
                                        └─────────────┘
```

### Required:
- Service Worker for PWA
- Firebase Cloud Messaging (FCM) for web/Android
- Apple Push Notification service (APNs) for iOS
- `push_tokens` table to store device tokens
- Supabase Edge Function to send push notifications

## Implementation Phases

### Phase 1: Toast System (Current)
- [x] Design architecture
- [ ] Implement ToastStore
- [ ] Create Toast UI components
- [ ] Integrate with menu actions (copy link, copy name)
- [ ] Add to App root

### Phase 2: Notification Infrastructure
- [ ] Create `notifications` table in Supabase
- [ ] Implement NotificationStore with realtime
- [ ] Create NotificationBell component
- [ ] Create NotificationPanel component

### Phase 3: Notification Types
- [ ] Define notification types enum
- [ ] Create notification templates
- [ ] Implement grouping logic
- [ ] Add notification preferences

### Phase 4: Push Notifications
- [ ] Set up Service Worker
- [ ] Integrate FCM
- [ ] Create push_tokens table
- [ ] Implement Edge Function for sending
- [ ] Add permission request UI

## Usage Examples

### Toast (immediate feedback)

```typescript
import { toast } from '@breedhub/rxdb-store';

// In menu action handler
function handleCopyLink(entity: { slug: string }) {
  const url = `${window.location.origin}/${entity.slug}`;
  navigator.clipboard.writeText(url);
  toast.success('Link copied!');
}

// Error handling
try {
  await saveData();
  toast.success('Saved successfully');
} catch (error) {
  toast.error('Failed to save. Please try again.');
}
```

### Notifications (persistent)

```typescript
import { notificationStore } from '@breedhub/rxdb-store';

// In App initialization
useEffect(() => {
  if (user) {
    notificationStore.initialize(user.id);
  }
  return () => notificationStore.destroy();
}, [user]);

// In component
function NotificationBell() {
  const unreadCount = useSignalValue(notificationStore.unreadCount);

  return (
    <button>
      <BellIcon />
      {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
    </button>
  );
}
```

## Design Considerations

### Toast Styling
- **Success:** Green accent, checkmark icon
- **Error:** Red accent, X icon
- **Info:** Blue accent, info icon
- **Warning:** Yellow accent, warning icon
- **Animation:** Slide in from left, fade out

### Notification Panel Styling
- **Width:** ~360px (Facebook-like)
- **Max height:** 80vh with scroll
- **Header:** "Notifications" + "Mark all as read"
- **Empty state:** Friendly message + illustration
- **Unread indicator:** Blue dot or highlight

## Security Considerations

1. **RLS Policies:** Users can only see their own notifications
2. **Rate limiting:** Prevent notification spam
3. **Input sanitization:** Prevent XSS in notification content
4. **Token validation:** Secure push token storage
