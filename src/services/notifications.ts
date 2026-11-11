import type { Product } from '../types';

const NOTIFICATION_KEY = 'foodkeeper_last_expiry_notification';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
}

/**
 * Checks expiring products and sends a local browser notification
 * at most once per calendar day.
 */
export function checkAndNotifyExpiringProducts(expiringProducts: Product[]): boolean {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  if (!expiringProducts || expiringProducts.length === 0) {
    return false;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const lastDate = localStorage.getItem(NOTIFICATION_KEY);

  // Notify only once per day to avoid spamming
  if (lastDate === todayStr) {
    return false;
  }

  const count = expiringProducts.length;
  const names = expiringProducts.slice(0, 2).map((p) => p.name).join(', ');
  const more = count > 2 ? ` и ещё ${count - 2}` : '';

  try {
    new Notification('FoodKeeper: Продукты требуют внимания! 🍎', {
      body: `Истекает срок годности (${count} поз.): ${names}${more}. Составьте рацион или спишите запасы.`,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'foodkeeper-expiry-alert',
    });
    localStorage.setItem(NOTIFICATION_KEY, todayStr);
    return true;
  } catch (err) {
    console.warn('Browser notification failed:', err);
    return false;
  }
}
