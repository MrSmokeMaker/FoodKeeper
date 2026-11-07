declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        colorScheme: 'light' | 'dark';
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
        };
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        openTelegramLink: (url: string) => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
      };
    };
  }
}

export function isTelegramWebApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initDataUnsafe?.user);
}

export function initTelegramApp(): {
  isTg: boolean;
  user?: { id: number; name: string; username?: string; photo?: string };
  colorScheme?: 'light' | 'dark';
} {
  if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
    return { isTg: false };
  }

  const tg = window.Telegram.WebApp;
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('#09090b');
    tg.setBackgroundColor?.('#09090b');

    const tgUser = tg.initDataUnsafe?.user;
    return {
      isTg: Boolean(tgUser),
      user: tgUser
        ? {
            id: tgUser.id,
            name: `${tgUser.first_name} ${tgUser.last_name || ''}`.trim(),
            username: tgUser.username,
            photo: tgUser.photo_url,
          }
        : undefined,
      colorScheme: tg.colorScheme,
    };
  } catch (e) {
    console.error('Error initializing Telegram WebApp', e);
    return { isTg: false };
  }
}

/**
 * Тактильная отдача для мобильного интерфейса (Telegram Haptic + Web Vibration API)
 */
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' = 'light') {
  try {
    const tgHaptic = window.Telegram?.WebApp?.HapticFeedback;
    if (tgHaptic) {
      if (type === 'success') tgHaptic.notificationOccurred('success');
      else tgHaptic.impactOccurred(type);
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'light') navigator.vibrate(10);
      else if (type === 'medium') navigator.vibrate(20);
      else if (type === 'heavy') navigator.vibrate([30, 20, 30]);
      else if (type === 'success') navigator.vibrate([15, 40, 25]);
    }
  } catch {}
}

/**
 * Поделиться списком покупок / рационом в Telegram
 */
export function shareTextToTelegram(text: string) {
  const encoded = encodeURIComponent(text);
  const shareUrl = `https://t.me/share/url?url=${encoded}`;
  if (window.Telegram?.WebApp?.openTelegramLink) {
    window.Telegram.WebApp.openTelegramLink(shareUrl);
  } else {
    window.open(shareUrl, '_blank');
  }
}
