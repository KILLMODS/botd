export type PlanTier = 'free' | 'pro' | 'premium';

export interface AutoResponderConfig {
  enabled: boolean;
  text: string;
  trigger: 'offline_only' | 'first_message_always';
  delay_seconds: number;
  total_replies_sent?: number;
}

export interface UserProfile {
  user_id: number;
  username?: string;
  first_name?: string;
  photo_url?: string;
  sub_plan: PlanTier;
  sub_expires_at: number; // Unix timestamp seconds
  daily_sent: number;
  last_sent_date: string;
  free_limit_used: number;
  terms_accepted?: number | boolean;
  bonus_messages?: number;
  referred_by?: number;
  referrals_count?: number;
  referrals_active?: number;
  auto_responder?: AutoResponderConfig;
}

export interface AccountItem {
  id: number;
  user_id: number;
  phone: string;
  session?: string;
  status: 'active' | 'pending' | 'banned' | 'error' | 'spamblock';
  last_used?: string;
  first_name?: string;
  has_telegram_premium?: boolean;
}

export interface ChatRecipient {
  id?: number;
  task_id?: number;
  chat_id: number;
  username: string;
  title: string;
  status?: 'pending' | 'done' | 'error' | 'spamblock';
  last_error?: string;
}

export interface TaskItem {
  id: number;
  user_id: number;
  account_id: number;
  target_accs: string; // 'all' or comma-separated IDs
  text: string;
  delay_min: number;
  delay_max: number;
  status: 'running' | 'stopped' | 'done' | 'limit_reached' | 'no_accounts' | 'connection_error' | 'spamblock';
  sent: number;
  errors: number;
  spamblocks?: number; // count of spamblocks (red exclamation)
  loop: number; // 0 or 1
  media?: string | null;
  chats?: ChatRecipient[];

  // Mode: Chats vs Direct Messages (DM) to chat members (PRO / PREMIUM+ ONLY)
  mode?: 'chats' | 'direct_messages';
  source_chats?: string; // Group links/usernames to scrape users from
  dm_users_limit?: number; // Limit of scraped members per group

  // Auto-responder settings
  auto_reply?: number; // 0 or 1
  auto_reply_text?: string;
  auto_reply_mode?: 'reply_latest' | 'offline_only' | 'first_message_always';
  auto_reply_offline?: boolean;

  // Premium Emojis
  has_premium_emojis?: boolean;

  // Auto-solve PR / Guard bots & join sponsor channels (ALL PLANS)
  auto_resolve_pr_bots?: boolean;

  // Free Tier Watermark
  include_watermark?: boolean;
}

export interface PlanConfig {
  id: PlanTier;
  name: string;
  max_accounts: number;
  daily_limit: number;
  min_delay: number;
  price_stars: number;
  price_usd: number;
  ref_bonus: number;
  popular?: boolean;
  badge: string;
  features: string[];
}

export interface ReferralInfo {
  total_invited: number;
  active_invited: number;
  bonus_messages: number;
  referral_link: string;
}

export interface AdminStats {
  total_users: number;
  terms_accepted: number;
  clicked_add_acc: number;
  clicked_create_task: number;
  sub_free: number;
  sub_pro: number;
  sub_premium: number;
  total_purchases_pro: number;
  total_purchases_prem: number;
  total_accounts: number;
  users_with_accounts: number;
  total_tasks_created: number;
  running_tasks_count: number;
  total_referred_users: number;
  total_rewarded_referrals: number;
  total_bonus_awarded: number;
  total_spamblocks_detected?: number;
  total_autoreplies_sent?: number;
  required_channel?: string;
}
