import { UserProfile, AccountItem, TaskItem, PlanConfig } from '../types';
import { getTelegramUser, saveTelegramCloud, getTelegramCloud } from './telegram';

export const BOT_TOKEN = '8345869119:AAGFhcUORebKHj0TeABn_3ZcZIi_BwQr6SE';
export const CRYPTO_BOT_TOKEN = '662370:AARfAYc3i7xelw6VdEomWOY043wF8cQ4wGb';
export const BOTHOST_URL = 'https://bot-1793274038-8713-black-kot198.bothost.tech';

export const SUBSCRIPTION_PLANS: Record<string, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free (Старт)',
    max_accounts: 1,
    daily_limit: 500,
    min_delay: 10,
    price_stars: 0,
    price_usd: 0.0,
    badge: 'Базовый',
    features: [
      '1 Telegram аккаунт',
      'До 500 сообщений',
      'Задержка от 10 сек',
      'Одиночная рассылка',
      'Базовая статистика'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    max_accounts: 5,
    daily_limit: 5000,
    min_delay: 5,
    price_stars: 69,
    price_usd: 1.99,
    popular: true,
    badge: 'Популярный',
    features: [
      'До 5 Telegram аккаунтов',
      '5 000 сообщений / день',
      'Быстрая задержка от 5 сек',
      'Медиа-вложения (фото/видео)',
      'Бесконечный режим (Loop)',
      'Авто-ротация аккаунтов'
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium+',
    max_accounts: 15,
    daily_limit: 10000,
    min_delay: 1,
    price_stars: 159,
    price_usd: 4.49,
    badge: 'Максимум',
    features: [
      'До 15 Telegram аккаунтов',
      '10 000 сообщений / день',
      'Турбо-задержка от 1 сек',
      'Бесконечный автоповтор по кругу',
      'Приоритетный обход FloodWait',
      'Полная аналитика и экспорт',
      'Поддержка 24/7'
    ]
  }
};

const DEFAULT_USER_ID = 745950213;

function getKey(prefix: string, userId: number): string {
  return `tgbroadcast_${prefix}_${userId}`;
}

class BotSyncService {
  private apiUrl: string = BOTHOST_URL;

  // --- USER DATA ---
  async getUser(userId: number): Promise<UserProfile> {
    const tgUser = getTelegramUser();
    const fallbackName = tgUser?.first_name || 'Пользователь';
    const fallbackUsername = tgUser?.username || '';
    const photoUrl = tgUser?.photo_url || '';

    // 1. Fetch real user from bothost SQLite database
    try {
      const res = await fetch(`${this.apiUrl}/api/user?user_id=${userId}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const u = await res.json();
        const profile: UserProfile = {
          user_id: u.user_id || userId,
          username: u.username || fallbackUsername,
          first_name: u.first_name || fallbackName,
          photo_url: photoUrl,
          sub_plan: u.sub_plan || 'free',
          sub_expires_at: u.sub_expires_at || 0,
          daily_sent: u.daily_sent || 0,
          last_sent_date: u.last_sent_date || new Date().toISOString().split('T')[0],
          free_limit_used: u.free_limit_used || 0,
        };
        const key = getKey('user', userId);
        localStorage.setItem(key, JSON.stringify(profile));
        saveTelegramCloud(key, JSON.stringify(profile));
        return profile;
      }
    } catch {
      // bothost loading or starting
    }

    // 2. Fall back to cached CloudStorage or LocalStorage
    const key = getKey('user', userId);
    const cloudVal = await getTelegramCloud(key);
    if (cloudVal) {
      try {
        const parsed = JSON.parse(cloudVal);
        return { ...parsed, user_id: userId, first_name: fallbackName, username: fallbackUsername, photo_url: photoUrl };
      } catch {
        // continue
      }
    }

    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...parsed, user_id: userId, first_name: fallbackName, username: fallbackUsername, photo_url: photoUrl };
      } catch {
        // continue
      }
    }

    // Default
    return {
      user_id: userId || DEFAULT_USER_ID,
      username: fallbackUsername,
      first_name: fallbackName,
      photo_url: photoUrl,
      sub_plan: 'free',
      sub_expires_at: 0,
      daily_sent: 0,
      last_sent_date: new Date().toISOString().split('T')[0],
      free_limit_used: 0,
    };
  }

  // --- ACCOUNTS ---
  async getAccounts(userId: number): Promise<AccountItem[]> {
    const key = getKey('accounts', userId);

    try {
      const res = await fetch(`${this.apiUrl}/api/accounts?user_id=${userId}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const accs = await res.json();
        localStorage.setItem(key, JSON.stringify(accs));
        saveTelegramCloud(key, JSON.stringify(accs));
        return accs;
      }
    } catch {
      // fallback to cached
    }

    const cloudVal = await getTelegramCloud(key);
    if (cloudVal) {
      try {
        return JSON.parse(cloudVal);
      } catch {
        // continue
      }
    }

    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // continue
      }
    }

    return [];
  }

  // --- TASKS ---
  async getTasks(userId: number): Promise<TaskItem[]> {
    const key = getKey('tasks', userId);

    try {
      const res = await fetch(`${this.apiUrl}/api/tasks?user_id=${userId}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const tasks = await res.json();
        localStorage.setItem(key, JSON.stringify(tasks));
        saveTelegramCloud(key, JSON.stringify(tasks));
        return tasks;
      }
    } catch {
      // fallback
    }

    const cloudVal = await getTelegramCloud(key);
    if (cloudVal) {
      try {
        return JSON.parse(cloudVal);
      } catch {
        // continue
      }
    }

    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // continue
      }
    }

    return [];
  }

  // --- REAL TELETHON AUTH (NO FAKE SUCCESS) ---
  async authSendCode(userId: number, phone: string): Promise<{ ok: boolean; phone_hash?: string; error?: string }> {
    try {
      const res = await fetch(`${this.apiUrl}/api/auth/send_code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, phone }),
        signal: AbortSignal.timeout(9000)
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      return {
        ok: false,
        error: `Сервер бота вернул ошибку ${res.status}. Убедитесь, что 1.py перезапущен на bothost.ru`
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        error: `Не удалось связаться с сервером бота (${errorMessage}). Проверьте работу 1.py на bothost.ru.`
      };
    }
  }

  async authConfirmCode(userId: number, phone: string, code: string, phone_hash?: string): Promise<{ ok: boolean; need_2fa?: boolean; account?: AccountItem; error?: string }> {
    try {
      const res = await fetch(`${this.apiUrl}/api/auth/confirm_code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, phone, code, phone_hash }),
        signal: AbortSignal.timeout(9000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.account) {
          const accs = await this.getAccounts(userId);
          const updated = [...accs.filter(a => a.id !== data.account.id), data.account];
          const key = getKey('accounts', userId);
          localStorage.setItem(key, JSON.stringify(updated));
          saveTelegramCloud(key, JSON.stringify(updated));
        }
        return data;
      }
      return {
        ok: false,
        error: `Сервер бота вернул ошибку ${res.status}. Неверный код подтверждения.`
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        error: `Сервер бота не ответил (${errorMessage}). Вход не выполнен.`
      };
    }
  }

  async authConfirm2FA(userId: number, phone: string, password: string): Promise<{ ok: boolean; account?: AccountItem; error?: string }> {
    try {
      const res = await fetch(`${this.apiUrl}/api/auth/confirm_2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, phone, password }),
        signal: AbortSignal.timeout(9000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.account) {
          const accs = await this.getAccounts(userId);
          const updated = [...accs.filter(a => a.id !== data.account.id), data.account];
          const key = getKey('accounts', userId);
          localStorage.setItem(key, JSON.stringify(updated));
          saveTelegramCloud(key, JSON.stringify(updated));
        }
        return data;
      }
      return { ok: false, error: 'Неверный пароль двухэтапной аутентификации' };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Ошибка связи с ботом: ${errorMessage}` };
    }
  }

  async addAccountBySession(userId: number, sessionStr: string): Promise<{ ok: boolean; account?: AccountItem; error?: string }> {
    try {
      const res = await fetch(`${this.apiUrl}/api/auth/add_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, session: sessionStr }),
        signal: AbortSignal.timeout(9000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.account) {
          const accs = await this.getAccounts(userId);
          const updated = [...accs.filter(a => a.id !== data.account.id), data.account];
          const key = getKey('accounts', userId);
          localStorage.setItem(key, JSON.stringify(updated));
          saveTelegramCloud(key, JSON.stringify(updated));
        }
        return data;
      }
      return { ok: false, error: 'Недействительная сессия Telethon' };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Ошибка импорта сессии: ${errorMessage}` };
    }
  }

  async deleteAccount(userId: number, accountId: number): Promise<boolean> {
    try {
      await fetch(`${this.apiUrl}/api/accounts/${accountId}?user_id=${userId}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(4000)
      });
    } catch {
      // continue
    }
    const key = getKey('accounts', userId);
    const accs = (await this.getAccounts(userId)).filter(a => a.id !== accountId);
    localStorage.setItem(key, JSON.stringify(accs));
    saveTelegramCloud(key, JSON.stringify(accs));
    return true;
  }

  // --- REAL TASKS API ---
  async createTask(task: Partial<TaskItem>): Promise<TaskItem> {
    const userId = task.user_id || DEFAULT_USER_ID;
    try {
      const res = await fetch(`${this.apiUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const created = await res.json();
        const key = getKey('tasks', userId);
        const tasks = [created, ...(await this.getTasks(userId)).filter(t => t.id !== created.id)];
        localStorage.setItem(key, JSON.stringify(tasks));
        saveTelegramCloud(key, JSON.stringify(tasks));
        return created;
      }
    } catch {
      // fallback
    }

    const key = getKey('tasks', userId);
    const tasks = await this.getTasks(userId);
    const newTask: TaskItem = {
      id: Math.floor(100 + Math.random() * 900),
      user_id: userId,
      account_id: task.account_id || 0,
      target_accs: task.target_accs || 'all',
      text: task.text || '',
      delay_min: task.delay_min || 10,
      delay_max: task.delay_max || 30,
      status: 'stopped',
      sent: 0,
      errors: 0,
      loop: task.loop ? 1 : 0,
      media: task.media || null,
      chats: task.chats || []
    };
    tasks.unshift(newTask);
    localStorage.setItem(key, JSON.stringify(tasks));
    saveTelegramCloud(key, JSON.stringify(tasks));
    return newTask;
  }

  async updateTask(taskId: number, updates: Partial<TaskItem>): Promise<TaskItem | null> {
    const tgUser = getTelegramUser();
    const userId = tgUser?.id || DEFAULT_USER_ID;

    try {
      const res = await fetch(`${this.apiUrl}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const updated = await res.json();
        const key = getKey('tasks', userId);
        const tasks = (await this.getTasks(userId)).map(t => t.id === taskId ? updated : t);
        localStorage.setItem(key, JSON.stringify(tasks));
        saveTelegramCloud(key, JSON.stringify(tasks));
        return updated;
      }
    } catch {
      // fallback
    }

    const key = getKey('tasks', userId);
    const tasks = await this.getTasks(userId);
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      tasks[idx] = { ...tasks[idx], ...updates };
      localStorage.setItem(key, JSON.stringify(tasks));
      saveTelegramCloud(key, JSON.stringify(tasks));
      return tasks[idx];
    }
    return null;
  }

  async toggleTaskRun(taskId: number, currentStatus: string): Promise<string> {
    const nextStatus = currentStatus === 'running' ? 'stopped' : 'running';
    const tgUser = getTelegramUser();
    const userId = tgUser?.id || DEFAULT_USER_ID;

    try {
      const endpoint = nextStatus === 'running' ? 'start' : 'stop';
      const res = await fetch(`${this.apiUrl}/api/tasks/${taskId}/${endpoint}`, {
        method: 'POST',
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const data = await res.json();
        return data.status || nextStatus;
      }
    } catch {
      // fallback
    }

    const key = getKey('tasks', userId);
    const tasks = await this.getTasks(userId);
    const t = tasks.find(x => x.id === taskId);
    if (t) {
      t.status = nextStatus as TaskItem['status'];
      localStorage.setItem(key, JSON.stringify(tasks));
      saveTelegramCloud(key, JSON.stringify(tasks));
    }
    return nextStatus;
  }

  async deleteTask(taskId: number): Promise<boolean> {
    const tgUser = getTelegramUser();
    const userId = tgUser?.id || DEFAULT_USER_ID;
    try {
      await fetch(`${this.apiUrl}/api/tasks/${taskId}`, { method: 'DELETE', signal: AbortSignal.timeout(4000) });
    } catch {
      // continue
    }
    const key = getKey('tasks', userId);
    const tasks = (await this.getTasks(userId)).filter(t => t.id !== taskId);
    localStorage.setItem(key, JSON.stringify(tasks));
    saveTelegramCloud(key, JSON.stringify(tasks));
    return true;
  }

  // --- REAL TELEGRAM STARS PAYMENT ---
  async createStarsInvoiceLink(userId: number, planKey: PlanConfig['id']): Promise<{ ok: boolean; invoice_link?: string; error?: string }> {
    const plan = SUBSCRIPTION_PLANS[planKey];
    if (!plan || plan.price_stars <= 0) {
      return { ok: false, error: 'Бесплатный тариф' };
    }

    try {
      const payload = {
        title: `Подписка ${plan.name}`,
        description: `Тариф ${plan.name} на 30 дней в TG Broadcaster (лимит ${plan.daily_limit} сообщ/день, до ${plan.max_accounts} акк).`,
        payload: `sub_${plan.id}_${userId}_${Date.now()}`,
        currency: 'XTR',
        prices: [{ label: plan.name, amount: plan.price_stars }]
      };

      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000)
      });

      const data = await res.json();
      if (data.ok && data.result) {
        return { ok: true, invoice_link: data.result };
      }
      return { ok: false, error: data.description || 'Не удалось создать инвойс Telegram Stars' };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { ok: false, error: errorMessage };
    }
  }

  // --- REAL CRYPTOBOT PAYMENT ---
  async createCryptoInvoice(userId: number, planKey: PlanConfig['id']): Promise<{ ok: boolean; invoice_url?: string; invoice_id?: number; error?: string }> {
    const plan = SUBSCRIPTION_PLANS[planKey];
    if (!plan || plan.price_usd <= 0) {
      return { ok: false, error: 'Бесплатный тариф' };
    }

    try {
      const payload = {
        asset: 'USDT',
        amount: String(plan.price_usd),
        description: `Подписка ${plan.name} для пользователя ID ${userId}`,
        paid_btn_name: 'openBot',
        paid_btn_url: 'https://t.me/CryptoBot'
      };

      const res = await fetch('https://pay.crypt.bot/api/createInvoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Crypto-Pay-API-Token': CRYPTO_BOT_TOKEN
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000)
      });

      const data = await res.json();
      if (data.ok && data.result) {
        const inv = data.result;
        const payUrl = inv.bot_invoice_url || inv.mini_app_invoice_url || inv.pay_url;
        return { ok: true, invoice_url: payUrl, invoice_id: inv.invoice_id };
      }
      return { ok: false, error: data.error?.name || 'CryptoBot отклонил запрос' };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { ok: false, error: errorMessage };
    }
  }

  // --- CHECK CRYPTOBOT INVOICE STATUS ---
  async checkCryptoInvoice(invoiceId: number): Promise<boolean> {
    try {
      const res = await fetch(`https://pay.crypt.bot/api/getInvoices?invoice_ids=${invoiceId}`, {
        method: 'GET',
        headers: { 'Crypto-Pay-API-Token': CRYPTO_BOT_TOKEN },
        signal: AbortSignal.timeout(6000)
      });
      const data = await res.json();
      if (data.ok && data.result?.items?.length > 0) {
        return data.result.items[0].status === 'paid';
      }
    } catch {
      // continue
    }
    return false;
  }

  // --- ACTIVATE SUBSCRIPTION ---
  async activateSubscription(userId: number, planKey: PlanConfig['id'], days: number = 30): Promise<UserProfile> {
    try {
      const res = await fetch(`${this.apiUrl}/api/subscription/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, plan: planKey, days }),
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const updated = await res.json();
        const key = getKey('user', userId);
        localStorage.setItem(key, JSON.stringify(updated));
        saveTelegramCloud(key, JSON.stringify(updated));
        return updated;
      }
    } catch {
      // fallback
    }

    const key = getKey('user', userId);
    const user = await this.getUser(userId);
    user.sub_plan = planKey;
    user.sub_expires_at = Math.floor(Date.now() / 1000) + days * 86400;
    localStorage.setItem(key, JSON.stringify(user));
    saveTelegramCloud(key, JSON.stringify(user));
    return user;
  }
}

export const botApi = new BotSyncService();
