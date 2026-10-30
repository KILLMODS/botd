import { UserProfile, AccountItem, TaskItem, PlanConfig } from '../types';
import { getTelegramUser, saveTelegramCloud, getTelegramCloud, sendTelegramData } from './telegram';

export const BOTHOST_DEFAULT_URL = 'https://bot-1793274038-8713-black-kot198.bothost.tech';

export const SUBSCRIPTION_PLANS: Record<string, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free (Старт)',
    max_accounts: 1,
    daily_limit: 500,
    min_delay: 10,
    price_stars: 0,
    price_usd: 0.0,
    accentColor: 'from-slate-500/30 to-slate-700/30',
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
    accentColor: 'from-blue-600/30 to-indigo-600/30',
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
    accentColor: 'from-amber-500/30 to-purple-600/30',
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

const STORAGE_KEYS = {
  USER: 'tg_broadcaster_user',
  ACCOUNTS: 'tg_broadcaster_accounts',
  TASKS: 'tg_broadcaster_tasks',
  API_URL: 'tg_broadcaster_bot_url',
};

// Default mock initial data if first visit
const DEFAULT_USER_ID = 745950213;

function getInitialUser(): UserProfile {
  const tgUser = getTelegramUser();
  const userId = tgUser?.id || DEFAULT_USER_ID;
  const username = tgUser?.username || 'user_demo';
  const firstName = tgUser?.first_name || 'Пользователь';

  const saved = localStorage.getItem(STORAGE_KEYS.USER);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return { ...parsed, user_id: userId, username, first_name: firstName };
    } catch {
      // fallback
    }
  }

  return {
    user_id: userId,
    username,
    first_name: firstName,
    sub_plan: 'free',
    sub_expires_at: 0,
    daily_sent: 42,
    last_sent_date: new Date().toISOString().split('T')[0],
    free_limit_used: 42,
  };
}

function getInitialAccounts(): AccountItem[] {
  const saved = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return [
    {
      id: 1,
      user_id: DEFAULT_USER_ID,
      phone: '+7 999 123-45-67',
      status: 'active',
      last_used: 'Только что',
      first_name: 'Рабочий аккаунт #1'
    }
  ];
}

function getInitialTasks(): TaskItem[] {
  const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return [
    {
      id: 101,
      user_id: DEFAULT_USER_ID,
      account_id: 1,
      target_accs: 'all',
      text: 'Приветствую! Ознакомьтесь с актуальным предложением и новыми акциями в нашем закрытом сообществе.',
      delay_min: 10,
      delay_max: 25,
      status: 'stopped',
      sent: 28,
      errors: 1,
      loop: 1,
      media: 'promo_banner.jpg',
      chats: [
        { id: 1, chat_id: 1001, username: 'crypto_chat_ru', title: 'Crypto Chat RU', status: 'done' },
        { id: 2, chat_id: 1002, username: 'biz_community', title: 'Business Community', status: 'pending' },
        { id: 3, chat_id: 1003, username: 'tg_advert_group', title: 'Telegram Ads Group', status: 'pending' }
      ]
    }
  ];
}

class BotSyncService {
  private apiUrl: string = '';

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEYS.API_URL);
    this.apiUrl = saved !== null ? saved : BOTHOST_DEFAULT_URL;
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  setApiUrl(url: string) {
    this.apiUrl = url.trim().replace(/\/$/, '');
    localStorage.setItem(STORAGE_KEYS.API_URL, this.apiUrl);
  }

  async checkServerConnection(): Promise<{ connected: boolean; message: string }> {
    if (!this.apiUrl) {
      return { connected: false, message: 'URL сервера бота не указан (работает локальная синхронизация)' };
    }
    try {
      const res = await fetch(`${this.apiUrl}/api/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        return { connected: true, message: data.message || 'Связь с bothost.ru активна' };
      }
      return { connected: false, message: `Ошибка сервера: ${res.status}` };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { connected: false, message: `Не удалось связаться с сервером (${errorMessage})` };
    }
  }

  async getUser(userId: number): Promise<UserProfile> {
    if (this.apiUrl) {
      try {
        const res = await fetch(`${this.apiUrl}/api/user?user_id=${userId}`);
        if (res.ok) {
          const user = await res.json();
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
          return user;
        }
      } catch {
        // fallback to storage
      }
    }
    return getInitialUser();
  }

  async getAccounts(userId: number): Promise<AccountItem[]> {
    if (this.apiUrl) {
      try {
        const res = await fetch(`${this.apiUrl}/api/accounts?user_id=${userId}`);
        if (res.ok) {
          const accs = await res.json();
          localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accs));
          return accs;
        }
      } catch {
        // fallback
      }
    }
    return getInitialAccounts();
  }

  async getTasks(userId: number): Promise<TaskItem[]> {
    if (this.apiUrl) {
      try {
        const res = await fetch(`${this.apiUrl}/api/tasks?user_id=${userId}`);
        if (res.ok) {
          const tasks = await res.json();
          localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
          return tasks;
        }
      } catch {
        // fallback
      }
    }
    return getInitialTasks();
  }

  // --- Auth Flow for adding account ---
  async authSendCode(userId: number, phone: string): Promise<{ ok: boolean; phone_hash?: string; error?: string }> {
    if (this.apiUrl) {
      try {
        const res = await fetch(`${this.apiUrl}/api/auth/send_code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, phone })
        });
        return await res.json();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { ok: false, error: errorMessage };
      }
    }
    // Simulation / local fallback
    await new Promise(r => setTimeout(r, 900));
    return { ok: true, phone_hash: 'simulated_hash_' + Date.now() };
  }

  async authConfirmCode(userId: number, phone: string, code: string, phone_hash?: string): Promise<{ ok: boolean; need_2fa?: boolean; account?: AccountItem; error?: string }> {
    if (this.apiUrl) {
      try {
        const res = await fetch(`${this.apiUrl}/api/auth/confirm_code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, phone, code, phone_hash })
        });
        return await res.json();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { ok: false, error: errorMessage };
      }
    }
    // Simulation
    await new Promise(r => setTimeout(r, 900));
    if (code === '22222') {
      return { ok: true, need_2fa: true };
    }
    const accs = getInitialAccounts();
    const newAcc: AccountItem = {
      id: Date.now(),
      user_id: userId,
      phone,
      status: 'active',
      last_used: 'Только что',
      first_name: 'Аккаунт ' + phone.slice(-4)
    };
    accs.push(newAcc);
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accs));
    return { ok: true, need_2fa: false, account: newAcc };
  }

  async authConfirm2FA(userId: number, phone: string, password: string): Promise<{ ok: boolean; account?: AccountItem; error?: string }> {
    if (this.apiUrl) {
      try {
        const res = await fetch(`${this.apiUrl}/api/auth/confirm_2fa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, phone, password })
        });
        return await res.json();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { ok: false, error: errorMessage };
      }
    }
    await new Promise(r => setTimeout(r, 1000));
    const accs = getInitialAccounts();
    const newAcc: AccountItem = {
      id: Date.now(),
      user_id: userId,
      phone,
      status: 'active',
      last_used: 'Только что',
      first_name: 'Аккаунт ' + phone.slice(-4)
    };
    accs.push(newAcc);
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accs));
    return { ok: true, account: newAcc };
  }

  async addAccountBySession(userId: number, sessionStr: string): Promise<{ ok: boolean; account?: AccountItem; error?: string }> {
    if (this.apiUrl) {
      try {
        const res = await fetch(`${this.apiUrl}/api/auth/add_session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, session: sessionStr })
        });
        return await res.json();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { ok: false, error: errorMessage };
      }
    }
    await new Promise(r => setTimeout(r, 800));
    const accs = getInitialAccounts();
    const newAcc: AccountItem = {
      id: Date.now(),
      user_id: userId,
      phone: `+7 9${Math.floor(10000000 + Math.random() * 90000000)}`,
      status: 'active',
      last_used: 'Импортирован из session',
      first_name: 'Импортированная сессия'
    };
    accs.push(newAcc);
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accs));
    return { ok: true, account: newAcc };
  }

  async deleteAccount(userId: number, accountId: number): Promise<boolean> {
    if (this.apiUrl) {
      try {
        const res = await fetch(`${this.apiUrl}/api/accounts/${accountId}?user_id=${userId}`, { method: 'DELETE' });
        if (res.ok) return true;
      } catch {
        // fallback
      }
    }
    const accs = getInitialAccounts().filter(a => a.id !== accountId);
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accs));
    return true;
  }

  // --- Tasks API ---
  async createTask(task: Partial<TaskItem>): Promise<TaskItem> {
    if (this.apiUrl) {
      try {
        const res = await fetch(`${this.apiUrl}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task)
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // fallback
      }
    }
    const tasks = getInitialTasks();
    const newTask: TaskItem = {
      id: Math.floor(100 + Math.random() * 900),
      user_id: task.user_id || DEFAULT_USER_ID,
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
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    return newTask;
  }

  async updateTask(taskId: number, updates: Partial<TaskItem>): Promise<TaskItem | null> {
    if (this.apiUrl) {
      try {
        const res = await fetch(`${this.apiUrl}/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        if (res.ok) return await res.json();
      } catch {
        // fallback
      }
    }
    const tasks = getInitialTasks();
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      tasks[idx] = { ...tasks[idx], ...updates };
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      return tasks[idx];
    }
    return null;
  }

  async toggleTaskRun(taskId: number, currentStatus: string): Promise<string> {
    const nextStatus = currentStatus === 'running' ? 'stopped' : 'running';
    if (this.apiUrl) {
      try {
        const endpoint = nextStatus === 'running' ? 'start' : 'stop';
        const res = await fetch(`${this.apiUrl}/api/tasks/${taskId}/${endpoint}`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          return data.status || nextStatus;
        }
      } catch {
        // fallback
      }
    }
    const tasks = getInitialTasks();
    const t = tasks.find(x => x.id === taskId);
    if (t) {
      t.status = nextStatus as TaskItem['status'];
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    }
    return nextStatus;
  }

  async deleteTask(taskId: number): Promise<boolean> {
    if (this.apiUrl) {
      try {
        const res = await fetch(`${this.apiUrl}/api/tasks/${taskId}`, { method: 'DELETE' });
        if (res.ok) return true;
      } catch {
        // fallback
      }
    }
    const tasks = getInitialTasks().filter(t => t.id !== taskId);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    return true;
  }

  // --- Subscriptions ---
  async activateSubscription(userId: number, plan: PlanConfig['id'], days: number = 30): Promise<UserProfile> {
    if (this.apiUrl) {
      try {
        const res = await fetch(`${this.apiUrl}/api/subscription/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, plan, days })
        });
        if (res.ok) return await res.json();
      } catch {
        // fallback
      }
    }
    const user = getInitialUser();
    user.sub_plan = plan;
    user.sub_expires_at = Math.floor(Date.now() / 1000) + days * 86400;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return user;
  }

  async createCryptoInvoice(userId: number, plan: PlanConfig['id']): Promise<{ ok: boolean; invoice_url?: string; invoice_id?: number; error?: string }> {
    const planInfo = SUBSCRIPTION_PLANS[plan];
    if (this.apiUrl) {
      try {
        const res = await fetch(`${this.apiUrl}/api/subscription/cryptobot_invoice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, plan, amount_usd: planInfo.price_usd })
        });
        return await res.json();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { ok: false, error: errorMessage };
      }
    }
    // Simulation
    await new Promise(r => setTimeout(r, 600));
    return {
      ok: true,
      invoice_url: `https://t.me/CryptoBot?start=IV_${Date.now()}`,
      invoice_id: Math.floor(100000 + Math.random() * 900000)
    };
  }
}

export const botApi = new BotSyncService();
