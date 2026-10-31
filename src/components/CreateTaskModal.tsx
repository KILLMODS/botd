import React, { useState } from 'react';
import { TaskItem, AccountItem, UserProfile } from '../types';
import { SUBSCRIPTION_PLANS, BOT_USERNAME } from '../services/api';
import { 
  X, 
  Clock, 
  MessageSquareQuote, 
  Lock, 
  Sparkles, 
  ShieldCheck, 
  Send, 
  Users, 
  Smile, 
  Eye, 
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface CreateTaskModalProps {
  user: UserProfile;
  accounts: AccountItem[];
  onClose: () => void;
  onCreate: (task: Partial<TaskItem>) => Promise<void>;
  onOpenSubscriptions?: () => void;
}

const PREMIUM_EMOJI_LIST = [
  { emoji: '🔥', id: '5368324170671202286', label: 'Огонь' },
  { emoji: '⭐', id: '5445007412178229983', label: 'Звезда' },
  { emoji: '💎', id: '5445284989069462394', label: 'Алмаз' },
  { emoji: '🚀', id: '5445007412178229984', label: 'Ракета' },
  { emoji: '⚡', id: '5445007412178229985', label: 'Молния' },
  { emoji: '👑', id: '5445007412178229986', label: 'Корона' },
  { emoji: '💸', id: '5445007412178229988', label: 'Деньги' },
  { emoji: '✨', id: '5445007412178229989', label: 'Искры' },
  { emoji: '❤️‍🔥', id: '5445007412178229987', label: 'Сердце' },
  { emoji: '🛡️', id: '5445007412178229991', label: 'Щит' },
];

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  user,
  accounts,
  onClose,
  onCreate,
  onOpenSubscriptions,
}) => {
  const plan = SUBSCRIPTION_PLANS[user.sub_plan] || SUBSCRIPTION_PLANS.free;
  const isProOrPrem = user.sub_plan === 'pro' || user.sub_plan === 'premium';
  const isFree = user.sub_plan === 'free';

  // Broadcasting mode: 'chats' or 'direct_messages' (PRO/PREMIUM+ exclusive)
  const [mode, setMode] = useState<'chats' | 'direct_messages'>('chats');
  const [sourceChats, setSourceChats] = useState('');
  const [dmUsersLimit, setDmUsersLimit] = useState<number>(25);

  const [text, setText] = useState('');
  const [linksText, setLinksText] = useState('');
  
  // Telegram Premium Emojis
  const [hasPremiumEmojis, setHasPremiumEmojis] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Auto-subscribe & PR/Guard bots solver (Universal for all plans!)
  const [autoResolvePrBots, setAutoResolvePrBots] = useState(true);

  // Autoresponder (Universal for all plans!)
  const [autoReply, setAutoReply] = useState(false);
  const [autoReplyMode, setAutoReplyMode] = useState<'offline_only' | 'first_message_always'>('offline_only');
  const [autoReplyText, setAutoReplyText] = useState('');

  // Delay presets
  const [delayPreset, setDelayPreset] = useState<'default' | 'fast' | 'safe' | 'custom'>('default');
  const [delayMin, setDelayMin] = useState<number>(Math.max(10, plan.min_delay));
  const [delayMax, setDelayMax] = useState<number>(Math.max(30, plan.min_delay + 15));
  
  const [isLoop, setIsLoop] = useState(false);
  const [targetAccs, setTargetAccs] = useState('all');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Free watermark footer
  const watermarkFooter = `\n\n📢 Отправлено с помощью @${BOT_USERNAME}`;
  const previewText = isFree ? `${text || 'Текст сообщения...'}${watermarkFooter}` : (text || 'Текст сообщения...');

  const handleSelectMode = (newMode: 'chats' | 'direct_messages') => {
    if (newMode === 'direct_messages' && !isProOrPrem) {
      triggerHaptic('warning');
      setError('🔒 Рассылка по личным сообщениям доступна только на тарифах Pro и Premium+');
      return;
    }
    setError(null);
    triggerHaptic('light');
    setMode(newMode);
  };

  const handleInsertEmoji = (emojiObj: { emoji: string; id: string }) => {
    triggerHaptic('light');
    setHasPremiumEmojis(true);
    setText(prev => `${prev} ${emojiObj.emoji}`);
  };

  const handleSelectPreset = (preset: 'default' | 'fast' | 'safe' | 'custom') => {
    setDelayPreset(preset);
    triggerHaptic('light');

    if (preset === 'default') {
      const dMin = Math.max(10, plan.min_delay);
      setDelayMin(dMin);
      setDelayMax(Math.max(30, dMin + 15));
    } else if (preset === 'fast') {
      if (!isProOrPrem) {
        const dMin = Math.max(10, plan.min_delay);
        setDelayMin(dMin);
        setDelayMax(dMin + 10);
      } else {
        setDelayMin(5);
        setDelayMax(15);
      }
    } else if (preset === 'safe') {
      setDelayMin(25);
      setDelayMax(50);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) {
      setError('Введите рекламный текст для рассылки');
      triggerHaptic('error');
      return;
    }

    if (mode === 'chats') {
      const lines = linksText.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        setError('Укажите хотя бы одного получателя (по одной ссылке на строке)');
        triggerHaptic('error');
        return;
      }
    } else {
      const sChats = sourceChats.split('\n').map(l => l.trim()).filter(Boolean);
      if (sChats.length === 0) {
        setError('Укажите группы/чаты, из которых бот будет выбирать пользователей для ЛС');
        triggerHaptic('error');
        return;
      }
    }

    let validMin = Number(delayMin);
    let validMax = Number(delayMax);
    if (isNaN(validMin) || validMin < 1) validMin = plan.min_delay;
    if (isNaN(validMax) || validMax < validMin) validMax = validMin + 15;

    if (validMin < plan.min_delay) {
      setError(`Минимальная задержка для тарифа ${plan.name}: ${plan.min_delay} сек.`);
      triggerHaptic('error');
      return;
    }

    setError(null);
    setIsLoading(true);
    triggerHaptic('medium');

    const rawList = mode === 'chats' ? linksText : sourceChats;
    const lines = rawList.split('\n').map(l => l.trim()).filter(Boolean);
    const parsedChats = lines.map((link, idx) => {
      const clean = link.replace('https://t.me/', '').replace('t.me/', '').replace('@', '');
      const isNum = /^-?\d+$/.test(clean);
      return {
        id: idx + 1,
        chat_id: isNum ? parseInt(clean) : 0,
        username: isNum ? '' : clean,
        title: clean,
        status: 'pending' as const
      };
    });

    try {
      await onCreate({
        user_id: user.user_id,
        text: text.trim(),
        mode,
        source_chats: mode === 'direct_messages' ? sourceChats.trim() : undefined,
        dm_users_limit: mode === 'direct_messages' ? dmUsersLimit : undefined,
        target_accs: targetAccs,
        delay_min: validMin,
        delay_max: validMax,
        loop: isLoop ? 1 : 0,
        media: null,
        chats: parsedChats,
        auto_reply: autoReply ? 1 : 0,
        auto_reply_text: autoReplyText.trim() || undefined,
        auto_reply_mode: autoReplyMode,
        has_premium_emojis: hasPremiumEmojis,
        auto_resolve_pr_bots: autoResolvePrBots,
        include_watermark: isFree,
      });
      triggerHaptic('success');
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'Ошибка создания задачи');
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xl animate-fade-in p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-[#14151a]/95 border-t sm:border border-white/[0.12] rounded-t-[28px] sm:rounded-[28px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden apple-liquid-sheet">
        
        {/* iOS Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/[0.08] flex-shrink-0">
          <div>
            <h3 className="text-[17px] font-semibold text-white tracking-tight">Новая кампания</h3>
            <p className="text-[12px] text-neutral-400">Настройка параметров авторассылки</p>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          
          {/* Target Mode Segmented Control: Groups vs Direct Messages (PRO/PREMIUM+ ONLY) */}
          <div className="apple-group-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-white flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-blue-400" />
                <span>Тип рассылки</span>
              </label>
              {!isProOrPrem && (
                <span className="text-[10px] text-amber-300 bg-amber-400/15 border border-amber-400/25 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> ЛС доступно в PRO+
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 border border-white/[0.08] rounded-xl text-xs">
              <button
                type="button"
                onClick={() => handleSelectMode('chats')}
                className={`py-2 px-2 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1.5 ${
                  mode === 'chats'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span>📢 По группам и чатам</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMode('direct_messages')}
                className={`py-2 px-2 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1.5 relative ${
                  mode === 'direct_messages'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span>💬 Рассылка по ЛС</span>
                {!isProOrPrem && <Lock className="w-3 h-3 text-amber-400" />}
              </button>
            </div>

            {mode === 'direct_messages' && isProOrPrem && (
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-200 leading-relaxed">
                ✨ <strong>Режим рассылки по ЛС:</strong> Бот открывает указанные группы/чаты, выбирает реальных участников и отправляет ваш пост прямо в их личные сообщения.
              </div>
            )}
          </div>

          {/* Text Area with Telegram Premium Emojis Support */}
          <div className="apple-group-card p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-white flex items-center gap-2">
                <span>Текст сообщения</span>
                {hasPremiumEmojis && (
                  <span className="text-[9px] font-bold text-amber-300 bg-amber-400/20 px-1.5 py-0.2 rounded-full uppercase border border-amber-400/30">
                    Premium Emojis ✨
                  </span>
                )}
              </label>

              {/* Emoji Picker Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                  showEmojiPicker ? 'bg-amber-400/20 text-amber-300' : 'bg-white/5 text-neutral-300 hover:text-white'
                }`}
              >
                <Smile className="w-3.5 h-3.5 text-amber-400" />
                <span>Премиум эмодзи</span>
              </button>
            </div>

            {/* Quick Telegram Premium Emoji Strip */}
            {showEmojiPicker && (
              <div className="p-2.5 rounded-xl bg-black/50 border border-amber-400/20 space-y-2">
                <div className="text-[11px] text-amber-200 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Нажмите для вставки Telegram Premium эмодзи:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {PREMIUM_EMOJI_LIST.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleInsertEmoji(item)}
                      className="px-2 py-1 rounded-lg bg-white/10 hover:bg-amber-400/20 text-base active:scale-90 transition-all flex items-center gap-1"
                      title={item.label}
                    >
                      <span>{item.emoji}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-neutral-400">
                  ℹ️ Если ваш подключенный аккаунт имеет Telegram Premium, эмодзи отобразятся анимированными у всех получателей.
                </p>
              </div>
            )}

            <textarea
              required
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Введите текст сообщения для рассылки..."
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-white text-[13px] outline-none resize-none leading-relaxed focus:border-white/20 transition-all placeholder:text-neutral-500"
            />

            {/* Live Post Preview with Free Watermark / Clean Pro Indicator */}
            <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-neutral-400" /> Предпросмотр поста
                </span>
                {isFree ? (
                  <span className="text-[10px] text-amber-300 font-medium">Вотермарка (Free)</span>
                ) : (
                  <span className="text-[10px] text-emerald-400 font-medium">✨ Чистый пост (Pro+)</span>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-[#0e0f14] text-neutral-200 text-[12px] font-sans whitespace-pre-wrap leading-relaxed border border-white/[0.04]">
                {previewText}
              </div>
              {isFree && (
                <div className="text-[10px] text-neutral-400 flex items-center justify-between pt-1">
                  <span>Вотермарка отключается на тарифах Pro и Premium+</span>
                  {onOpenSubscriptions && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        onClose();
                        onOpenSubscriptions();
                      }}
                      className="text-blue-400 hover:text-blue-300 font-semibold"
                    >
                      Убрать рекламу →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recipients / Source Chats */}
          {mode === 'chats' ? (
            <div className="apple-group-card p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-white">
                  Список получателей / чатов
                </label>
                <span className="text-[11px] text-neutral-400 font-mono">
                  @username или t.me/link
                </span>
              </div>
              <textarea
                required
                rows={3}
                value={linksText}
                onChange={(e) => setLinksText(e.target.value)}
                placeholder={`@chat_one\nhttps://t.me/channel_two\n@group_three`}
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-white text-[13px] outline-none font-mono resize-none leading-relaxed focus:border-white/20 transition-all placeholder:text-neutral-500"
              />
            </div>
          ) : (
            <div className="apple-group-card p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-white">
                  Чаты-источники для парсинга и рассылки по ЛС
                </label>
                <span className="text-[11px] text-neutral-400 font-mono">
                  @group_name
                </span>
              </div>
              <textarea
                required
                rows={3}
                value={sourceChats}
                onChange={(e) => setSourceChats(e.target.value)}
                placeholder={`@target_group_1\nhttps://t.me/chat_business\n@cryptotraders_chat`}
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-white text-[13px] outline-none font-mono resize-none leading-relaxed focus:border-white/20 transition-all placeholder:text-neutral-500"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[12px] text-neutral-300">Пользователей с каждого чата:</span>
                <input
                  type="number"
                  min={5}
                  max={200}
                  value={dmUsersLimit}
                  onChange={(e) => setDmUsersLimit(Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded-lg bg-black/40 border border-white/[0.08] text-white text-xs font-mono text-center outline-none"
                />
              </div>
            </div>
          )}

          {/* Universal Feature: Auto-solve PR/Guard bots & Auto-join sponsors (ALL PLANS) */}
          <div className="apple-group-card p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-white">Автоподписка и решение PR-ботов</span>
                    <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.2 rounded-full uppercase border border-emerald-500/30">
                      Все тарифы
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Автоматически проходит капчи и спонсоров от ботов
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setAutoResolvePrBots(prev => !prev);
                }}
                className={`w-12 h-7 rounded-full transition-colors relative p-0.5 flex items-center ${
                  autoResolvePrBots ? 'bg-emerald-600' : 'bg-neutral-700/80'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    autoResolvePrBots ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {autoResolvePrBots && (
              <p className="text-[11px] text-neutral-400 pt-1 leading-relaxed border-t border-white/[0.06]">
                🛡️ Если после отправки бот группы (PR-бот, капча-бот) пингует ваш аккаунт, наш бот открывает инлайн-кнопки, переходит по ссылкам спонсоров, вступает в требуемые каналы и подтверждает верификацию!
              </p>
            )}
          </div>

          {/* Universal Feature: Autoresponder in Private Messages (ALL PLANS) */}
          <div className="apple-group-card p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <MessageSquareQuote className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-white">Автоответчик на сообщения</span>
                    <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.2 rounded-full uppercase border border-emerald-500/30">
                      Free + Pro
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Отвечать на первое сообщение, когда вы не в сети
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setAutoReply(prev => !prev);
                }}
                className={`w-12 h-7 rounded-full transition-colors relative p-0.5 flex items-center ${
                  autoReply ? 'bg-purple-600' : 'bg-neutral-700/80'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    autoReply ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {autoReply && (
              <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setAutoReplyMode('offline_only');
                    }}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      autoReplyMode === 'offline_only'
                        ? 'bg-purple-600/20 border-purple-500/40 text-white font-medium'
                        : 'bg-black/30 border-white/[0.06] text-neutral-400'
                    }`}
                  >
                    🌙 Только когда оффлайн
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setAutoReplyMode('first_message_always');
                    }}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      autoReplyMode === 'first_message_always'
                        ? 'bg-purple-600/20 border-purple-500/40 text-white font-medium'
                        : 'bg-black/30 border-white/[0.06] text-neutral-400'
                    }`}
                  >
                    ✨ На 1-е сообщение
                  </button>
                </div>

                <input
                  type="text"
                  value={autoReplyText}
                  onChange={(e) => setAutoReplyText(e.target.value)}
                  placeholder="Здравствуйте! Сейчас я не в сети, напишу чуть позже..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-white text-xs outline-none focus:border-purple-500/40"
                />
                <span className="text-[10px] text-neutral-400 block font-mono">
                  ℹ️ Каждый автоответ учитывается как 1 сообщение в лимите рассылки.
                </span>
              </div>
            )}
          </div>

          {/* Delays Section */}
          <div className="apple-group-card p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-[13px] font-medium text-white">Интервал задержки</span>
              </div>
              <span className="text-[11px] text-neutral-400 font-mono">
                мин. для тарифа: {plan.min_delay}с
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/40 border border-white/[0.08] rounded-xl text-xs">
              <button
                type="button"
                onClick={() => handleSelectPreset('default')}
                className={`py-1.5 px-1 rounded-lg font-medium transition-all text-center ${
                  delayPreset === 'default'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Дефолт
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('fast')}
                className={`py-1.5 px-1 rounded-lg font-medium transition-all text-center ${
                  delayPreset === 'fast'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Быстрая
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('safe')}
                className={`py-1.5 px-1 rounded-lg font-medium transition-all text-center ${
                  delayPreset === 'safe'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Безопасная
              </button>
              <button
                type="button"
                onClick={() => setDelayPreset('custom')}
                className={`py-1.5 px-1 rounded-lg font-medium transition-all text-center ${
                  delayPreset === 'custom'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Своя
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2">
                <span className="text-[10px] text-neutral-400 block font-medium">От (секунд)</span>
                <input
                  type="number"
                  value={delayMin}
                  onChange={(e) => {
                    setDelayPreset('custom');
                    setDelayMin(Number(e.target.value));
                  }}
                  className="w-full bg-transparent text-white font-mono text-[14px] outline-none mt-0.5"
                />
              </div>
              <div className="bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2">
                <span className="text-[10px] text-neutral-400 block font-medium">До (секунд)</span>
                <input
                  type="number"
                  value={delayMax}
                  onChange={(e) => {
                    setDelayPreset('custom');
                    setDelayMax(Number(e.target.value));
                  }}
                  className="w-full bg-transparent text-white font-mono text-[14px] outline-none mt-0.5"
                />
              </div>
            </div>
          </div>

          {/* Accounts selection & Loop */}
          <div className="apple-group-card divide-y divide-white/[0.06]">
            <div className="p-3.5 flex items-center justify-between gap-3">
              <label className="text-[13px] font-medium text-white flex-shrink-0">
                Аккаунты:
              </label>
              <select
                value={targetAccs}
                onChange={(e) => setTargetAccs(e.target.value)}
                className="bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-white/20 max-w-[200px]"
              >
                <option value="all" className="bg-[#1c1d24] text-white">
                  Все мои аккаунты ({accounts.length})
                </option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={String(acc.id)} className="bg-[#1c1d24] text-white">
                    {acc.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-white">Бесконечный автоповтор (Loop)</div>
                <div className="text-[11px] text-neutral-400">Повторять рассылку по кругу с задержкой</div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsLoop(prev => !prev);
                }}
                className={`w-12 h-7 rounded-full transition-colors relative p-0.5 flex items-center ${
                  isLoop ? 'bg-blue-600' : 'bg-neutral-700/80'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    isLoop ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 pb-6 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] text-neutral-300 font-semibold text-[14px] transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[14px] transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Создание...' : 'Запустить кампанию'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
