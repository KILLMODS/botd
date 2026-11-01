// Telegram WebApp SDK helper

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            photo_url?: string;
          };
          query_id?: string;
          auth_date?: number;
          hash?: string;
        };
        version: string;
        isVersionAtLeast?: (version: string) => boolean;
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        CloudStorage: {
          setItem: (key: string, value: string, callback?: (error: Error | null, success?: boolean) => void) => void;
          getItem: (key: string, callback: (error: Error | null, value?: string) => void) => void;
          getItems: (keys: string[], callback: (error: Error | null, values?: Record<string, string>) => void) => void;
          removeItem: (key: string, callback?: (error: Error | null, success?: boolean) => void) => void;
        };
        sendData: (data: string) => void;
        openTelegramLink: (url: string) => void;
        openInvoice: (url: string, callback?: (status: string) => void) => void;
        showPopup: (params: { title?: string; message: string; buttons?: Array<{ id?: string; type?: string; text: string }> }, callback?: (buttonId: string) => void) => void;
        showAlert: (message: string, callback?: () => void) => void;
        showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
        ready: () => void;
        expand: () => void;
        close: () => void;
      };
    };
  }
}

export function isTelegramWebApp(): boolean {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData;
}

export function getTelegramUser() {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp?.initDataUnsafe?.user || null;
}

export function initTelegramApp() {
  if (typeof window === 'undefined') return;
  const webapp = window.Telegram?.WebApp;
  if (webapp) {
    try {
      webapp.ready();
      webapp.expand();
      if (webapp.headerColor) {
        webapp.headerColor = '#090a0f';
      }
      if (webapp.backgroundColor) {
        webapp.backgroundColor = '#090a0f';
      }
    } catch {
      // ignore
    }
  }
}

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error') {
  const haptic = window.Telegram?.WebApp?.HapticFeedback;
  if (!haptic) return;
  try {
    if (type === 'selection') {
      haptic.selectionChanged();
    } else if (type === 'success' || type === 'warning' || type === 'error') {
      haptic.notificationOccurred(type);
    } else {
      haptic.impactOccurred(type);
    }
  } catch {
    // fallback
  }
}

export function isCloudStorageSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const webapp = window.Telegram?.WebApp;
  if (!webapp) return false;
  try {
    if (typeof webapp.isVersionAtLeast === 'function') {
      return webapp.isVersionAtLeast('6.9');
    }
  } catch {
    return false;
  }
  return false;
}

export function saveTelegramCloud(key: string, value: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!isCloudStorageSupported()) {
      resolve(false);
      return;
    }
    const cs = window.Telegram?.WebApp?.CloudStorage;
    if (!cs) {
      resolve(false);
      return;
    }
    try {
      cs.setItem(key, value, (err) => {
        resolve(!err);
      });
    } catch {
      resolve(false);
    }
  });
}

export function getTelegramCloud(key: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!isCloudStorageSupported()) {
      resolve(null);
      return;
    }
    const cs = window.Telegram?.WebApp?.CloudStorage;
    if (!cs) {
      resolve(null);
      return;
    }
    try {
      cs.getItem(key, (err, val) => {
        if (!err && val) {
          resolve(val);
        } else {
          resolve(null);
        }
      });
    } catch {
      resolve(null);
    }
  });
}

export function sendTelegramData(data: Record<string, unknown>): boolean {
  const webapp = window.Telegram?.WebApp;
  if (!webapp || !webapp.sendData) return false;
  try {
    webapp.sendData(JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

