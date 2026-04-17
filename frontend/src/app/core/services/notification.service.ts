import { Injectable, signal, computed } from '@angular/core';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly storageKey = 'dsv.notifications';

  readonly notifications = signal<AppNotification[]>(this.loadFromStorage());

  readonly unreadCount = computed(() =>
    this.notifications().filter(n => !n.read).length
  );

  readonly hasUnread = computed(() => this.unreadCount() > 0);

  push(title: string, message: string, type: AppNotification['type'] = 'info'): void {
    const notification: AppNotification = {
      id: crypto.randomUUID(),
      title,
      message,
      type,
      read: false,
      timestamp: new Date(),
    };
    this.notifications.update(list => [notification, ...list].slice(0, 50));
    this.persist();
  }

  markAsRead(id: string): void {
    this.notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n)
    );
    this.persist();
  }

  markAllAsRead(): void {
    this.notifications.update(list =>
      list.map(n => ({ ...n, read: true }))
    );
    this.persist();
  }

  dismiss(id: string): void {
    this.notifications.update(list => list.filter(n => n.id !== id));
    this.persist();
  }

  clearAll(): void {
    this.notifications.set([]);
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.notifications()));
    } catch { /* quota or private mode */ }
  }

  private loadFromStorage(): AppNotification[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as AppNotification[];
      return parsed.map(n => ({ ...n, timestamp: new Date(n.timestamp) }));
    } catch {
      return [];
    }
  }
}
