export type PlanTier = 'free' | 'pro' | 'premium';

export interface UserProfile {
  user_id: number;
  username?: string;
  first_name?: string;
  sub_plan: PlanTier;
  sub_expires_at: number; // Unix timestamp seconds
  daily_sent: number;
  last_sent_date: string;
  free_limit_used: number;
}

export interface AccountItem {
  id: number;
  user_id: number;
  phone: string;
  session?: string;
  status: 'active' | 'pending' | 'banned' | 'error';
  last_used?: string;
  first_name?: string;
}

export interface ChatRecipient {
  id?: number;
  task_id?: number;
  chat_id: number;
  username: string;
  title: string;
  status?: 'pending' | 'done' | 'error';
}

export interface TaskItem {
  id: number;
  user_id: number;
  account_id: number;
  target_accs: string; // 'all' or comma-separated IDs
  text: string;
  delay_min: number;
  delay_max: number;
  status: 'running' | 'stopped' | 'done' | 'limit_reached' | 'no_accounts' | 'connection_error';
  sent: number;
  errors: number;
  loop: number; // 0 or 1
  media?: string | null;
  chats?: ChatRecipient[];
}

export interface PlanConfig {
  id: PlanTier;
  name: string;
  max_accounts: number;
  daily_limit: number;
  min_delay: number;
  price_stars: number;
  price_usd: number;
  popular?: boolean;
  accentColor: string;
  badge: string;
  features: string[];
}
