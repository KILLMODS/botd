import { UserProfile, AccountItem, TaskItem, PlanConfig } from '../types';
import { getTelegramUser, saveTelegramCloud, getTelegramCloud } from './telegram';

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

const DEFAULT_USER_ID = 745950213;

function getKey(prefix: string, userId: number): string {
  return `tgbroadcaster_${prefix}_${userId}`;
}

class UserIsolatedDataService {
  async getUser(userId: number): Promise<UserProfile> {
    const key = getKey('user', userId);
    const tgUser = getTelegramUser();
    const fallbackName = tgUser?.first_name || 'Пользователь';
    const fallbackUsername = tgUser?.username || '';

    // Check CloudStorage first
    const cloudVal = await getTelegramCloud(key);
    if (cloudVal) {
      try {
        const parsed = JSON.parse(cloudVal);
        return { ...parsed, user_id: userId, first_name: fallbackName, username: fallbackUsername };
      } catch {
        // fallback
      }
    }

    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...parsed, user_id: userId, first_name: fallbackName, username: fallbackUsername };
      } catch {
        // fallback
      }
    }

    const newUser: UserProfile = {
      user_id: userId || DEFAULT_USER_ID,
      username: fallbackUsername,
      first_name: fallbackName,
      sub_plan: 'free',
      sub_expires_at: 0,
      daily_sent: 0,
      last_sent_date: new Date().toISOString().split('T')[0],
      free_limit_used: 0,
    };

    localStorage.setItem(key, JSON.stringify(newUser));
    saveTelegramCloud(key, JSON.stringify(newUser));
    return newUser;
  }

  async getAccounts(userId: number): Promise<AccountItem[]> {
    const key = getKey('accounts', userId);

    const cloudVal = await getTelegramCloud(key);
    if (cloudVal) {
      try {
        return JSON.parse(cloudVal);
      } catch {
        // fallback
      }
    }

    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }

    return [];
  }

  async getTasks(userId: number): Promise<TaskItem[]> {
    const key = getKey('tasks', userId);

    const cloudVal = await getTelegramCloud(key);
    if (cloudVal) {
      try {
        return JSON.parse(cloudVal);
      } catch {
        // fallback
      }
    }

    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }

    return [];
  }

  // --- Auth Flow for adding account ---
  async authSendCode(_userId: number, _phone: string): Promise<{ ok: boolean; phone_hash?: string; error?: string }> {
    await new Promise(r => setTimeout(r, 700));
    return { ok: true, phone_hash: 'hash_' + Date.now() };
  }

  async authConfirmCode(userId: number, phone: string, code: string, _phone_hash?: string): Promise<{ ok: boolean; need_2fa?: boolean; account?: AccountItem; error?: string }> {
    await new Promise(r => setTimeout(r, 700));
    if (code === '22222') {
      return { ok: true, need_2fa: true };
    }

    const key = getKey('accounts', userId);
    const accs = await this.getAccounts(userId);

    const newAcc: AccountItem = {
      id: Date.now(),
      user_id: userId,
      phone,
      status: 'active',
      last_used: 'Только что',
      first_name: 'Аккаунт ' + phone.slice(-4)
    };

    accs.push(newAcc);
    localStorage.setItem(key, JSON.stringify(accs));
    saveTelegramCloud(key, JSON.stringify(accs));
    return { ok: true, need_2fa: false, account: newAcc };
  }

  async authConfirm2FA(userId: number, phone: string, _password: string): Promise<{ ok: boolean; account?: AccountItem; error?: string }> {
    await new Promise(r => setTimeout(r, 800));
    const key = getKey('accounts', userId);
    const accs = await this.getAccounts(userId);

    const newAcc: AccountItem = {
      id: Date.now(),
      user_id: userId,
      phone,
      status: 'active',
      last_used: 'Только что',
      first_name: 'Аккаунт ' + phone.slice(-4)
    };

    accs.push(newAcc);
    localStorage.setItem(key, JSON.stringify(accs));
    saveTelegramCloud(key, JSON.stringify(accs));
    return { ok: true, account: newAcc };
  }

  async addAccountBySession(userId: number, _sessionStr: string): Promise<{ ok: boolean; account?: AccountItem; error?: string }> {
    await new Promise(r => setTimeout(r, 600));
    const key = getKey('accounts', userId);
    const accs = await this.getAccounts(userId);

    const newAcc: AccountItem = {
      id: Date.now(),
      user_id: userId,
      phone: `+7 9${Math.floor(10000000 + Math.random() * 90000000)}`,
      status: 'active',
      last_used: 'Импортирован из session',
      first_name: 'Импортированная сессия'
    };

    accs.push(newAcc);
    localStorage.setItem(key, JSON.stringify(accs));
    saveTelegramCloud(key, JSON.stringify(accs));
    return { ok: true, account: newAcc };
  }

  async deleteAccount(userId: number, accountId: number): Promise<boolean> {
    const key = getKey('accounts', userId);
    const accs = (await this.getAccounts(userId)).filter(a => a.id !== accountId);
    localStorage.setItem(key, JSON.stringify(accs));
    saveTelegramCloud(key, JSON.stringify(accs));
    return true;
  }

  // --- Tasks API ---
  async createTask(task: Partial<TaskItem>): Promise<TaskItem> {
    const userId = task.user_id || DEFAULT_USER_ID;
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
    const key = getKey('tasks', userId);
    const tasks = (await this.getTasks(userId)).filter(t => t.id !== taskId);
    localStorage.setItem(key, JSON.stringify(tasks));
    saveTelegramCloud(key, JSON.stringify(tasks));
    return true;
  }

  // --- Subscriptions ---
  async activateSubscription(userId: number, plan: PlanConfig['id'], days: number = 30): Promise<UserProfile> {
    const key = getKey('user', userId);
    const user = await this.getUser(userId);
    user.sub_plan = plan;
    user.sub_expires_at = Math.floor(Date.now() / 1000) + days * 86400;
    localStorage.setItem(key, JSON.stringify(user));
    saveTelegramCloud(key, JSON.stringify(user));
    return user;
  }

  async createCryptoInvoice(_userId: number, _plan: PlanConfig['id']): Promise<{ ok: boolean; invoice_url?: string; invoice_id?: number; error?: string }> {
    await new Promise(r => setTimeout(r, 500));
    return {
      ok: true,
      invoice_url: `https://t.me/CryptoBot?start=IV_${Date.now()}`,
      invoice_id: Math.floor(100000 + Math.random() * 900000)
    };
  }
}

export const botApi = new UserIsolatedDataService();
