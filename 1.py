"""
╔══════════════════════════════════════════════════════════════════════╗
║   TG BROADCASTER — Telethon (Мультиаккаунты, Подписки, CryptoBot)   ║
║  Установка:  pip install telethon aiohttp                            ║
║  Запуск:     python 1.py                                             ║
╚══════════════════════════════════════════════════════════════════════╝
"""

import asyncio
import logging
import random
import re
import sqlite3
import os
import time
import aiohttp

from telethon import TelegramClient, events, connection
from telethon.tl import types, functions
from telethon.sessions import StringSession
from telethon.tl.custom import Button
from telethon.tl.types import InputMediaInvoice, Invoice
from telethon.errors import (
    FloodWaitError, ChatWriteForbiddenError,
    SlowModeWaitError, PeerFloodError,
    UserBannedInChannelError, UserDeactivatedBanError,
    SessionPasswordNeededError, PhoneCodeInvalidError, PhoneCodeExpiredError,
    SendCodeUnavailableError, PhoneNumberBannedError, ApiIdInvalidError,
    UserNotParticipantError
)

# ─────────────────────────────────────────────────────
#  НАСТРОЙКИ
# ─────────────────────────────────────────────────────

API_ID           = int(os.environ.get("API_ID", "30973996"))
API_HASH         = os.environ.get("API_HASH", "dc58ef881ea53b1faafcf6ad974306a7")

BOT_TOKEN        = os.environ.get("BOT_TOKEN", "8345869119:AAGFhcUORebKHj0TeABn_3ZcZIi_BwQr6SE")
BOT_USERNAME     = os.environ.get("BOT_USERNAME", "KillmodsLTDBot").replace("@", "")
ADMIN_IDS        = [int(x.strip()) for x in os.environ.get("ADMIN_IDS", "1793274038, 7459502130, 8658384308").split(",") if x.strip()]

# Ключ CryptoBot
CRYPTO_BOT_TOKEN = os.environ.get("CRYPTO_BOT_TOKEN", "662370:AARfAYc3i7xelw6VdEomWOY043wF8cQ4wGb")

# Обязательный канал для проверки подписки при старте (username с @ или пустая строка/off)
REQUIRED_CHANNEL = os.environ.get("REQUIRED_CHANNEL", "").strip()

AUTH_SESSION_TTL = 600

# Тарифные планы
SUBSCRIPTION_PLANS = {
    "free": {
        "name": "Free (Старт)",
        "max_accounts": 1,
        "daily_limit": 500,
        "min_delay": 10,
        "price_stars": 0,
        "price_usd": 0.0,
        "ref_bonus": 50
    },
    "pro": {
        "name": "Pro",
        "max_accounts": 5,
        "daily_limit": 5000,
        "min_delay": 5,
        "price_stars": 69,
        "price_usd": 1.99,
        "ref_bonus": 100
    },
    "premium": {
        "name": "Premium+",
        "max_accounts": 15,
        "daily_limit": 10000,
        "min_delay": 1,
        "price_stars": 159,
        "price_usd": 4.49,
        "ref_bonus": 230
    }
}

TERMS_SUMMARY_TEXT = (
    "📜 **Политика конфиденциальности и условия пользования**\n\n"
    "1. **Назначение сервиса**\n"
    "TG Broadcaster — это автоматизированный программный инструмент для отправки сообщений в Telegram по списку целевых чатов или контактов.\n\n"
    "2. **Ответственность за аккаунты**\n"
    "• Сервис не гарантирует сохранность аккаунтов от санкций со стороны Telegram.\n"
    "• Все действия по рассылке производятся исключительно по инициативе и под контролем пользователя.\n"
    "• Риски возможных ограничений (FloodWait, Spamblock, временная или постоянная блокировка номера) целиком и полностью лежат на владельце аккаунта.\n\n"
    "3. **Конфиденциальность данных**\n"
    "• Сессии аккаунтов используются исключительно для авторизации и исполнения запущенных пользователем задач рассылки.\n"
    "• Сервис не читает, не экспортирует и не передает третьим лицам личную переписку, контакты или персональные данные.\n\n"
    "4. **Соблюдение правил Telegram**\n"
    "Запрещается использовать сервис для распространения вредоносного ПО, фишинга, незаконных материалов и спама, нарушающего законодательство."
)

# ── Логи ──────────────────────────────────────────────
os.makedirs("data", exist_ok=True)
os.makedirs("data/media", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("data/bot.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────
#  БАЗА ДАННЫХ
# ─────────────────────────────────────────────────────

DB_PATH = "data/bot.db"

def db_conn():
    return sqlite3.connect(DB_PATH)

def db_init():
    with db_conn() as c:
        c.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                user_id             INTEGER PRIMARY KEY,
                sub_plan            TEXT DEFAULT 'free',
                sub_expires_at      INTEGER DEFAULT 0,
                daily_sent          INTEGER DEFAULT 0,
                last_sent_date      TEXT DEFAULT '',
                free_limit_used     INTEGER DEFAULT 0,
                referred_by         INTEGER DEFAULT 0,
                ref_rewarded        INTEGER DEFAULT 0,
                terms_accepted      INTEGER DEFAULT 0,
                bonus_messages      INTEGER DEFAULT 0,
                clicked_add_acc     INTEGER DEFAULT 0,
                clicked_create_task INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS accounts (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id  INTEGER DEFAULT 0,
                phone    TEXT UNIQUE NOT NULL,
                session  TEXT,
                status   TEXT DEFAULT 'pending'
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER DEFAULT 0,
                account_id  INTEGER DEFAULT 0,
                target_accs TEXT DEFAULT 'all',
                text        TEXT NOT NULL,
                delay_min   INTEGER DEFAULT 10,
                delay_max   INTEGER DEFAULT 30,
                status      TEXT DEFAULT 'stopped',
                sent        INTEGER DEFAULT 0,
                errors      INTEGER DEFAULT 0,
                loop        INTEGER DEFAULT 0,
                media       TEXT DEFAULT NULL
            );
            CREATE TABLE IF NOT EXISTS chats (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id  INTEGER,
                chat_id  INTEGER,
                username TEXT,
                title    TEXT,
                status   TEXT DEFAULT 'pending'
            );
            CREATE TABLE IF NOT EXISTS bot_settings (
                key   TEXT PRIMARY KEY,
                value TEXT
            );
            CREATE TABLE IF NOT EXISTS sub_purchases (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER,
                plan       TEXT,
                method     TEXT,
                amount     REAL,
                created_at INTEGER
            );
        """)

        # ── МИГРАЦИИ ТАБЛИЦ ──
        user_cols = [r[1] for r in c.execute("PRAGMA table_info(users)").fetchall()]
        new_user_cols = {
            "referred_by": "INTEGER DEFAULT 0",
            "ref_rewarded": "INTEGER DEFAULT 0",
            "terms_accepted": "INTEGER DEFAULT 0",
            "bonus_messages": "INTEGER DEFAULT 0",
            "clicked_add_acc": "INTEGER DEFAULT 0",
            "clicked_create_task": "INTEGER DEFAULT 0"
        }
        for col, col_def in new_user_cols.items():
            if col not in user_cols:
                c.execute(f"ALTER TABLE users ADD COLUMN {col} {col_def}")

        acc_cols = [r[1] for r in c.execute("PRAGMA table_info(accounts)").fetchall()]
        if "user_id" not in acc_cols:
            c.execute("ALTER TABLE accounts ADD COLUMN user_id INTEGER DEFAULT 0")

        task_cols = [r[1] for r in c.execute("PRAGMA table_info(tasks)").fetchall()]
        if "user_id" not in task_cols:
            c.execute("ALTER TABLE tasks ADD COLUMN user_id INTEGER DEFAULT 0")
        if "target_accs" not in task_cols:
            c.execute("ALTER TABLE tasks ADD COLUMN target_accs TEXT DEFAULT 'all'")
        if "auto_reply" not in task_cols:
            c.execute("ALTER TABLE tasks ADD COLUMN auto_reply INTEGER DEFAULT 0")
        if "auto_reply_text" not in task_cols:
            c.execute("ALTER TABLE tasks ADD COLUMN auto_reply_text TEXT DEFAULT ''")
        if "auto_reply_mode" not in task_cols:
            c.execute("ALTER TABLE tasks ADD COLUMN auto_reply_mode TEXT DEFAULT 'reply_latest'")

        # Инициализация дефолтных настроек
        c.execute("INSERT OR IGNORE INTO bot_settings (key, value) VALUES ('required_channel', ?)", (REQUIRED_CHANNEL,))
        c.execute("INSERT OR IGNORE INTO bot_settings (key, value) VALUES ('total_tasks_counter', '0')")

        # Привязка старых записей без владельца к администратору
        c.execute("UPDATE accounts SET user_id=1793274038 WHERE user_id=0 OR user_id IS NULL")
        c.execute("UPDATE tasks SET user_id=1793274038 WHERE user_id=0 OR user_id IS NULL")

def db_get_setting(key: str, default: str = "") -> str:
    with db_conn() as c:
        row = c.execute("SELECT value FROM bot_settings WHERE key=?", (key,)).fetchone()
        return row[0] if row else default

def db_set_setting(key: str, value: str):
    with db_conn() as c:
        c.execute("INSERT INTO bot_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (key, value))

def db_inc_total_tasks():
    with db_conn() as c:
        current = int(db_get_setting("total_tasks_counter", "0"))
        c.execute("INSERT INTO bot_settings (key, value) VALUES ('total_tasks_counter', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (str(current + 1),))

def db_get_or_create_user(user_id: int):
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        u = c.execute("SELECT * FROM users WHERE user_id=?", (user_id,)).fetchone()
        if not u:
            default_plan = 'premium' if user_id in ADMIN_IDS else 'free'
            default_exp = int(time.time()) + 365*86400 if user_id in ADMIN_IDS else 0
            default_terms = 1 if user_id in ADMIN_IDS else 0
            c.execute(
                "INSERT INTO users (user_id, sub_plan, sub_expires_at, free_limit_used, terms_accepted) VALUES (?, ?, ?, 0, ?)",
                (user_id, default_plan, default_exp, default_terms)
            )
            u = c.execute("SELECT * FROM users WHERE user_id=?", (user_id,)).fetchone()
        res = dict(u)
        if user_id in ADMIN_IDS and res.get("sub_plan") == "free":
            res["sub_plan"] = "premium"
            res["sub_expires_at"] = int(time.time()) + 365*86400
            res["terms_accepted"] = 1
            c.execute("UPDATE users SET sub_plan='premium', sub_expires_at=?, terms_accepted=1 WHERE user_id=?", (res["sub_expires_at"], user_id))
        return res

def db_set_terms_accepted(user_id: int):
    with db_conn() as c:
        c.execute("UPDATE users SET terms_accepted=1 WHERE user_id=?", (user_id,))

def db_set_user_funnel(user_id: int, field: str):
    if field in ["clicked_add_acc", "clicked_create_task"]:
        with db_conn() as c:
            c.execute(f"UPDATE users SET {field}=1 WHERE user_id=?", (user_id,))

def db_set_user_referrer(user_id: int, referrer_id: int) -> bool:
    if user_id == referrer_id:
        return False
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        u = c.execute("SELECT * FROM users WHERE user_id=?", (user_id,)).fetchone()
        if u and (u["referred_by"] == 0 or u["referred_by"] is None):
            c.execute("UPDATE users SET referred_by=? WHERE user_id=?", (referrer_id, user_id))
            return True
    return False

def db_get_all_users():
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        return [dict(r) for r in c.execute("SELECT * FROM users ORDER BY user_id").fetchall()]

def db_update_user_sub(user_id: int, plan: str, duration_days: int = 30, method: str = "admin", amount: float = 0.0):
    expires_at = int(time.time()) + (duration_days * 86400) if duration_days > 0 else 0
    with db_conn() as c:
        c.execute("UPDATE users SET sub_plan=?, sub_expires_at=? WHERE user_id=?", (plan, expires_at, user_id))
        c.execute("INSERT INTO sub_purchases (user_id, plan, method, amount, created_at) VALUES (?, ?, ?, ?, ?)",
                  (user_id, plan, method, amount, int(time.time())))

def db_check_user_limits(user_id: int) -> tuple[bool, str, dict]:
    u = db_get_or_create_user(user_id)
    plan_key = u["sub_plan"]
    now = int(time.time())
    today_str = time.strftime("%Y-%m-%d")

    # Сброс дневного счетчика
    if u["last_sent_date"] != today_str:
        with db_conn() as c:
            c.execute("UPDATE users SET daily_sent=0, last_sent_date=? WHERE user_id=?", (today_str, user_id))
        u["daily_sent"] = 0

    if plan_key != "free" and u["sub_expires_at"] > 0 and now > u["sub_expires_at"]:
        with db_conn() as c:
            c.execute("UPDATE users SET sub_plan='free', sub_expires_at=0 WHERE user_id=?", (user_id,))
        plan_key = "free"

    plan = SUBSCRIPTION_PLANS.get(plan_key, SUBSCRIPTION_PLANS["free"]).copy()
    bonus = u.get("bonus_messages", 0)
    effective_daily_limit = plan["daily_limit"] + bonus

    if plan_key == "free":
        if u["free_limit_used"] >= effective_daily_limit:
            return False, f"⚠️ Вы израсходовали лимит сообщений ({effective_daily_limit}). Приглашайте друзей или оформите подписку!", plan
    else:
        if u["daily_sent"] >= effective_daily_limit:
            return False, f"⚠️ Достигнут дневной лимит отправки ({effective_daily_limit} сообщений/день).", plan

    return True, "", plan

def db_inc_user_sent(user_id: int):
    u = db_get_or_create_user(user_id)
    with db_conn() as c:
        if u["sub_plan"] == "free":
            c.execute("UPDATE users SET daily_sent=daily_sent+1, free_limit_used=free_limit_used+1 WHERE user_id=?", (user_id,))
        else:
            c.execute("UPDATE users SET daily_sent=daily_sent+1 WHERE user_id=?", (user_id,))

async def db_reward_referrer_if_eligible(bot: TelegramClient, user_id: int):
    """Начисляет бонус пригласившему пользователю, когда реферал впервые успешно подключает аккаунт."""
    try:
        with db_conn() as c:
            c.row_factory = sqlite3.Row
            u = c.execute("SELECT * FROM users WHERE user_id=?", (user_id,)).fetchone()
            if not u: return
            ref_by = u["referred_by"]
            if not ref_by or ref_by == user_id or u["ref_rewarded"]:
                return

            inviter = c.execute("SELECT * FROM users WHERE user_id=?", (ref_by,)).fetchone()
            if not inviter: return

            inv_plan = SUBSCRIPTION_PLANS.get(inviter["sub_plan"], SUBSCRIPTION_PLANS["free"])
            bonus = inv_plan.get("ref_bonus", 50)

            c.execute("UPDATE users SET bonus_messages = bonus_messages + ? WHERE user_id=?", (bonus, ref_by))
            c.execute("UPDATE users SET ref_rewarded = 1 WHERE user_id=?", (user_id,))

        # Уведомление пригласившего
        try:
            await bot.send_message(
                ref_by,
                f"🎉 **Ваш реферал успешно подключил аккаунт!**\n\n"
                f"Вам начислено: **+{bonus} бесплатных сообщений** к лимиту рассылки!"
            )
        except Exception as ex:
            log.warning(f"Не удалось отправить уведомление рефереру {ref_by}: {ex}")
    except Exception as ex:
        log.error(f"Ошибка начисления бонуса рефералу: {ex}")

def db_add_account(phone: str, user_id: int = 0):
    with db_conn() as c:
        c.execute("""
            INSERT INTO accounts (phone, user_id, status)
            VALUES (?, ?, 'pending')
            ON CONFLICT(phone) DO UPDATE SET user_id=excluded.user_id
        """, (phone, user_id))

def db_save_session(phone: str, session_str: str, user_id: int = 0):
    with db_conn() as c:
        c.execute("""
            INSERT INTO accounts (phone, user_id, session, status)
            VALUES (?, ?, ?, 'active')
            ON CONFLICT(phone) DO UPDATE SET session=excluded.session, status='active', user_id=excluded.user_id
        """, (phone, user_id, session_str))

def db_get_account(phone: str):
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        r = c.execute("SELECT * FROM accounts WHERE phone=?", (phone,)).fetchone()
        return dict(r) if r else None

def db_get_account_by_id(acc_id: int):
    if not acc_id: return None
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        r = c.execute("SELECT * FROM accounts WHERE id=?", (acc_id,)).fetchone()
        return dict(r) if r else None

def db_get_user_accounts(user_id: int):
    if not user_id:
        return []
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        return [dict(r) for r in c.execute("SELECT * FROM accounts WHERE user_id=? ORDER BY id", (user_id,)).fetchall()]

def db_delete_account(phone: str, user_id: int):
    with db_conn() as c:
        c.execute("DELETE FROM accounts WHERE phone=? AND user_id=?", (phone, user_id))

def db_create_task(user_id: int, account_id: int, target_accs: str, text: str, chats: list, delay_min: int, delay_max: int, loop=False, media=None, auto_reply=0, auto_reply_text="", auto_reply_mode="reply_latest"):
    with db_conn() as c:
        cur = c.execute(
            "INSERT INTO tasks (user_id, account_id, target_accs, text, delay_min, delay_max, loop, media, auto_reply, auto_reply_text, auto_reply_mode) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (user_id, account_id, target_accs, text, delay_min, delay_max, 1 if loop else 0, media, 1 if auto_reply else 0, auto_reply_text or "", auto_reply_mode or "reply_latest")
        )
        task_id = cur.lastrowid
        for ch in chats:
            c.execute(
                "INSERT INTO chats (task_id, chat_id, username, title) VALUES (?,?,?,?)",
                (task_id, ch.get("id", 0), ch.get("username",""), ch.get("title",""))
            )
        db_inc_total_tasks()
        return task_id

def db_get_task(task_id: int):
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        r = c.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
        return dict(r) if r else None

def db_get_user_tasks(user_id: int):
    if not user_id:
        return []
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        return [dict(r) for r in c.execute("SELECT * FROM tasks WHERE user_id=? ORDER BY id DESC", (user_id,)).fetchall()]

def db_delete_task(task_id: int, user_id: int = 0):
    with db_conn() as c:
        if user_id:
            c.execute("DELETE FROM tasks WHERE id=? AND user_id=?", (task_id, user_id))
        else:
            c.execute("DELETE FROM tasks WHERE id=?", (task_id,))
        c.execute("DELETE FROM chats WHERE task_id=?", (task_id,))

def db_set_task_status(task_id: int, status: str):
    with db_conn() as c:
        c.execute("UPDATE tasks SET status=? WHERE id=?", (status, task_id))

def db_set_task_loop(task_id: int, loop: bool):
    with db_conn() as c:
        c.execute("UPDATE tasks SET loop=? WHERE id=?", (1 if loop else 0, task_id))

def db_inc_sent(task_id: int):
    with db_conn() as c:
        c.execute("UPDATE tasks SET sent=sent+1 WHERE id=?", (task_id,))

def db_inc_errors(task_id: int):
    with db_conn() as c:
        c.execute("UPDATE tasks SET errors=errors+1 WHERE id=?", (task_id,))

def db_get_pending_chats(task_id: int):
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        return [dict(r) for r in c.execute("SELECT * FROM chats WHERE task_id=? AND status='pending'", (task_id,)).fetchall()]

def db_mark_chat_done(chat_row_id: int):
    with db_conn() as c:
        c.execute("UPDATE chats SET status='done' WHERE id=?", (chat_row_id,))

def db_reset_chats(task_id: int):
    with db_conn() as c:
        c.execute("UPDATE chats SET status='pending' WHERE task_id=?", (task_id,))

def db_get_referral_stats(user_id: int):
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        u = c.execute("SELECT * FROM users WHERE user_id=?", (user_id,)).fetchone()
        bonus = u["bonus_messages"] if u else 0
        total_invited = c.execute("SELECT COUNT(*) FROM users WHERE referred_by=?", (user_id,)).fetchone()[0]
        active_invited = c.execute("SELECT COUNT(*) FROM users WHERE referred_by=? AND ref_rewarded=1", (user_id,)).fetchone()[0]
        return {
            "total_invited": total_invited,
            "active_invited": active_invited,
            "bonus_messages": bonus
        }

def db_get_admin_stats():
    with db_conn() as c:
        total_users = c.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        terms_accepted = c.execute("SELECT COUNT(*) FROM users WHERE terms_accepted=1").fetchone()[0]
        clicked_add_acc = c.execute("SELECT COUNT(*) FROM users WHERE clicked_add_acc=1").fetchone()[0]
        clicked_create_task = c.execute("SELECT COUNT(*) FROM users WHERE clicked_create_task=1").fetchone()[0]

        sub_free = c.execute("SELECT COUNT(*) FROM users WHERE sub_plan='free'").fetchone()[0]
        sub_pro = c.execute("SELECT COUNT(*) FROM users WHERE sub_plan='pro'").fetchone()[0]
        sub_premium = c.execute("SELECT COUNT(*) FROM users WHERE sub_plan='premium'").fetchone()[0]

        total_purchases_pro = c.execute("SELECT COUNT(*) FROM sub_purchases WHERE plan='pro'").fetchone()[0]
        total_purchases_prem = c.execute("SELECT COUNT(*) FROM sub_purchases WHERE plan='premium'").fetchone()[0]

        total_accounts = c.execute("SELECT COUNT(*) FROM accounts WHERE status='active'").fetchone()[0]
        users_with_accounts = c.execute("SELECT COUNT(DISTINCT user_id) FROM accounts WHERE status='active'").fetchone()[0]

        total_tasks_created = int(db_get_setting("total_tasks_counter", "0"))
        running_tasks_count = len(running_tasks)

        total_referred_users = c.execute("SELECT COUNT(*) FROM users WHERE referred_by > 0").fetchone()[0]
        total_rewarded_referrals = c.execute("SELECT COUNT(*) FROM users WHERE ref_rewarded=1").fetchone()[0]
        total_bonus_awarded = c.execute("SELECT SUM(bonus_messages) FROM users").fetchone()[0] or 0

        return {
            "total_users": total_users,
            "terms_accepted": terms_accepted,
            "clicked_add_acc": clicked_add_acc,
            "clicked_create_task": clicked_create_task,
            "sub_free": sub_free,
            "sub_pro": sub_pro,
            "sub_premium": sub_premium,
            "total_purchases_pro": total_purchases_pro,
            "total_purchases_prem": total_purchases_prem,
            "total_accounts": total_accounts,
            "users_with_accounts": users_with_accounts,
            "total_tasks_created": total_tasks_created,
            "running_tasks_count": running_tasks_count,
            "total_referred_users": total_referred_users,
            "total_rewarded_referrals": total_rewarded_referrals,
            "total_bonus_awarded": total_bonus_awarded,
            "required_channel": db_get_setting("required_channel", REQUIRED_CHANNEL)
        }

# ─────────────────────────────────────────────────────
#  CRYPTO BOT API INTEGRATION
# ─────────────────────────────────────────────────────

async def create_cryptobot_invoice(amount_usd: float, description: str) -> dict:
    url = "https://pay.crypt.bot/api/createInvoice"
    headers = {"Crypto-Pay-API-Token": CRYPTO_BOT_TOKEN}
    payload = {
        "asset": "USDT",
        "amount": str(amount_usd),
        "description": description,
        "paid_btn_name": "openBot",
        "paid_btn_url": "https://t.me/"
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as resp:
                data = await resp.json()
                if data.get("ok"):
                    return data["result"]
                else:
                    log.error(f"CryptoBot Error: {data}")
                    return None
    except Exception as ex:
        log.error(f"CryptoBot Connection Error: {ex}")
        return None

async def check_cryptobot_invoice(invoice_id: int) -> bool:
    url = f"https://pay.crypt.bot/api/getInvoices?invoice_ids={invoice_id}"
    headers = {"Crypto-Pay-API-Token": CRYPTO_BOT_TOKEN}
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as resp:
                data = await resp.json()
                if data.get("ok") and data.get("result") and data["result"].get("items"):
                    items = data["result"]["items"]
                    if items and items[0].get("status") == "paid":
                        return True
    except Exception as ex:
        log.error(f"CryptoBot check error: {ex}")
    return False

# ─────────────────────────────────────────────────────
#  КНОПКИ С ЦВЕТОВЫМИ СТИЛЯМИ (PRIMARY, SUCCESS, DANGER)
# ─────────────────────────────────────────────────────

def styled_btn(text: str, data: str or bytes = None, style: str = None, url: str = None):
    """
    Создаёт кнопку с поддержкой Telegram стилей (primary = синий, success = зеленый, danger = красный).
    Использует конструкторы MTProto Layer 222+ KeyboardButtonStyle, если доступны, с безопасным откатом.
    """
    if url:
        return Button.url(text, url)

    b_data = data.encode("utf-8") if isinstance(data, str) else data
    btn = Button.inline(text, b_data)

    if style:
        try:
            if hasattr(types, "KeyboardButtonStyle"):
                kw = {}
                if style == "primary":
                    kw["bg_primary"] = True
                elif style == "success":
                    kw["bg_success"] = True
                elif style == "danger":
                    kw["bg_danger"] = True
                if kw:
                    btn.style = types.KeyboardButtonStyle(**kw)
        except Exception:
            pass
    return btn

# ─────────────────────────────────────────────────────
#  USER-КЛИЕНТЫ И АВТОРИЗАЦИЯ
# ─────────────────────────────────────────────────────

active_clients: dict[str, TelegramClient] = {}
running_tasks:  dict[int, asyncio.Task]   = {}
temp_auth_clients: dict[int, dict]        = {}
states: dict[int, dict]                    = {}

async def _keep_alive_loop(client: TelegramClient):
    try:
        while True:
            await asyncio.sleep(10)
            if client.is_connected():
                await client.ping()
    except (asyncio.CancelledError, Exception):
        pass

async def auth_send_code(uid: int, phone: str):
    await cancel_auth(uid)
    client = TelegramClient(
        StringSession(),
        API_ID,
        API_HASH,
        connection=connection.ConnectionTcpAbridged,
        device_model="Telegram Desktop",
        system_version="Windows 10",
        app_version="4.16.30",
        lang_code="en"
    )
    await client.connect()

    try:
        try:
            res = await client.send_code_request(phone, force_sms=False)
        except Exception:
            res = await client.send_code_request(phone, force_sms=True)
        keepalive_task = asyncio.create_task(_keep_alive_loop(client))
        temp_auth_clients[uid] = {
            "client": client,
            "phone": phone,
            "phone_hash": res.phone_code_hash,
            "keepalive": keepalive_task,
            "created_at": asyncio.get_event_loop().time()
        }
        return res.phone_code_hash
    except Exception as e:
        await client.disconnect()
        raise e

async def auth_resend_code_sms(uid: int):
    auth_data = temp_auth_clients.get(uid)
    if not auth_data:
        raise Exception("Сессия авторизации истекла. Начните заново.")

    client: TelegramClient = auth_data["client"]
    phone = auth_data["phone"]
    phone_hash = auth_data["phone_hash"]

    res = await client.resend_code_request(phone, phone_hash)
    auth_data["phone_hash"] = res.phone_code_hash
    return res.phone_code_hash

async def auth_confirm_code(uid: int, raw_code: str):
    auth_data = temp_auth_clients.get(uid)
    if not auth_data:
        raise Exception("Сессия авторизации истекла. Начните заново.")

    client: TelegramClient = auth_data["client"]
    phone = auth_data["phone"]
    phone_hash = auth_data["phone_hash"]

    clean_code = re.sub(r"\D", "", raw_code)
    if not clean_code:
        raise Exception("Не найдены цифры в коде.")

    try:
        await client.sign_in(phone=phone, code=clean_code, phone_code_hash=phone_hash)
    except SessionPasswordNeededError:
        return "2fa"

    session_str = client.session.save()
    if auth_data.get("keepalive"):
        auth_data["keepalive"].cancel()
    await client.disconnect()
    temp_auth_clients.pop(uid, None)
    return session_str

async def auth_confirm_2fa(uid: int, password: str):
    auth_data = temp_auth_clients.get(uid)
    if not auth_data:
        raise Exception("Сессия авторизации истекла. Начните заново.")

    client: TelegramClient = auth_data["client"]
    await client.sign_in(password=password)
    session_str = client.session.save()
    if auth_data.get("keepalive"):
        auth_data["keepalive"].cancel()
    await client.disconnect()
    temp_auth_clients.pop(uid, None)
    return session_str

async def cancel_auth(uid: int):
    auth_data = temp_auth_clients.pop(uid, None)
    if auth_data:
        if auth_data.get("keepalive"):
            auth_data["keepalive"].cancel()
        try:
            await auth_data["client"].disconnect()
        except Exception:
            pass

async def _auth_sessions_gc_loop():
    while True:
        await asyncio.sleep(60)
        now = asyncio.get_event_loop().time()
        stale_uids = [
            uid for uid, data in list(temp_auth_clients.items())
            if now - data.get("created_at", now) > AUTH_SESSION_TTL
        ]
        for uid in stale_uids:
            log.info(f"Очистка зависшей сессии авторизации uid={uid}")
            await cancel_auth(uid)
            states.pop(uid, None)

async def add_account_from_session_string(session_str: str, user_id: int = 0) -> dict:
    session_str = session_str.strip()
    if not session_str:
        raise Exception("Пустая session-строка.")

    client = TelegramClient(
        StringSession(session_str),
        API_ID,
        API_HASH,
        connection=connection.ConnectionTcpAbridged,
        device_model="Telegram Desktop",
        system_version="Windows 10",
        app_version="4.16.30",
        lang_code="en"
    )
    try:
        await client.connect()
    except Exception as ex:
        raise Exception(f"Не удалось подключиться с этой session: {ex}")

    if not await client.is_user_authorized():
        await client.disconnect()
        raise Exception("Session недействительна или истекла (не авторизована).")

    me = await client.get_me()
    phone = me.phone if me and me.phone else f"session_{me.id}"
    phone = "+" + phone if me and me.phone and not phone.startswith("+") else phone

    db_add_account(phone, user_id)
    db_save_session(phone, session_str, user_id)
    active_clients[phone] = client

    return {
        "phone": phone,
        "user_id": me.id if me else None,
        "name": (me.first_name or "") + (f" {me.last_name}" if me and me.last_name else "") if me else ""
    }

async def get_client(phone: str) -> TelegramClient:
    if phone in active_clients:
        client = active_clients[phone]
        if client.is_connected():
            return client

    acc = db_get_account(phone)
    if not acc or not acc["session"]:
        raise Exception("Нет сохранённой сессии")

    client = TelegramClient(
        StringSession(acc["session"]),
        API_ID,
        API_HASH,
        connection=connection.ConnectionTcpAbridged,
        device_model="Telegram Desktop",
        system_version="Windows 10",
        app_version="4.16.30",
        lang_code="en"
    )
    await client.connect()

    if not await client.is_user_authorized():
        raise Exception("Сессия устарела — нужна повторная авторизация")

    active_clients[phone] = client
    return client

def parse_chat_links(links: list[str]) -> list[dict]:
    result = []
    for link in links:
        link = link.strip()
        if not link:
            continue
        clean_target = link.replace("https://t.me/", "").replace("t.me/", "").replace("@", "")
        if re.fullmatch(r"-?\d+", clean_target):
            result.append({"id": int(clean_target), "username": "", "title": clean_target})
        else:
            result.append({"id": 0, "username": clean_target, "title": clean_target})
    return result

async def _send_one(client, target, text, media, reply_to=None):
    if media and os.path.exists(media):
        if reply_to:
            await client.send_file(target, media, caption=text, reply_to=reply_to)
        else:
            await client.send_file(target, media, caption=text)
    else:
        if reply_to:
            await client.send_message(target, text, reply_to=reply_to)
        else:
            await client.send_message(target, text)

async def broadcast_multi(user_id: int, task_id: int, text: str, media, delay_min: int, delay_max: int, done_cb):
    total_sent = 0
    total_errors = 0

    try:
        task = db_get_task(task_id)
        if not task: return

        # Проверка прав на автоответчик (только тарифы Pro и Premium+)
        user_info = db_get_or_create_user(user_id)
        user_plan = user_info.get("sub_plan", "free")
        is_pro_or_prem = user_plan in ["pro", "premium"] or user_id in ADMIN_IDS
        can_auto_reply = bool(task.get("auto_reply", 0)) and is_pro_or_prem
        custom_reply_text = (task.get("auto_reply_text") or "").strip()
        effective_text = custom_reply_text if (can_auto_reply and custom_reply_text) else text

        target_accs = task.get("target_accs", "all")
        user_accs = [a for a in db_get_user_accounts(user_id) if a["status"] == "active"]

        if target_accs == "all":
            selected_accs = user_accs
        else:
            acc_ids = [int(x) for x in target_accs.split(",") if x.strip().isdigit()]
            selected_accs = [a for a in user_accs if a["id"] in acc_ids]

        if not selected_accs:
            db_set_task_status(task_id, "no_accounts")
            await done_cb(task_id, 0, 0, 0, "no_accounts")
            return

        clients = []
        for acc in selected_accs:
            try:
                cli = await get_client(acc["phone"])
                clients.append((acc, cli))
            except Exception as ex:
                log.error(f"Не удалось подключить аккаунт {acc['phone']}: {ex}")

        if not clients:
            db_set_task_status(task_id, "connection_error")
            await done_cb(task_id, 0, 0, 0, "connection_error")
            return

        client_index = 0

        while True:
            if task_id not in running_tasks:
                break

            chats = db_get_pending_chats(task_id)

            if not chats:
                task = db_get_task(task_id)
                if task and task["loop"]:
                    db_reset_chats(task_id)
                    log.info(f"[{task_id}] 🔁 Круг завершён, начинаем заново")
                    await asyncio.sleep(random.randint(delay_min, delay_max))
                    continue
                else:
                    break

            total = len(chats)

            for i, chat in enumerate(chats):
                if task_id not in running_tasks:
                    break

                can_send, limit_err, _ = db_check_user_limits(user_id)
                if not can_send:
                    log.warning(f"[{task_id}] Остановка по лимиту: {limit_err}")
                    db_set_task_status(task_id, "limit_reached")
                    running_tasks.pop(task_id, None)
                    await done_cb(task_id, total_sent, total_errors, total, "limit_reached")
                    return

                acc, client = clients[client_index % len(clients)]
                client_index += 1

                target = chat.get("username") or chat["chat_id"]
                reply_msg_id = None

                # Автоответчик: берёт последнее входящее сообщение из чата и отвечает на него
                if can_auto_reply:
                    try:
                        latest_msgs = await client.get_messages(target, limit=1)
                        if latest_msgs and len(latest_msgs) > 0 and latest_msgs[0].id:
                            reply_msg_id = latest_msgs[0].id
                            log.info(f"[{task_id}] 🤖 Автоответчик: отвечаем на msg_id={reply_msg_id} в {target}")
                    except Exception as ar_ex:
                        log.debug(f"[{task_id}] Автоответчик: не удалось прочитать последнее сообщение в {target}: {ar_ex}")

                try:
                    await _send_one(client, target, effective_text, media, reply_to=reply_msg_id)
                    total_sent += 1
                    db_inc_sent(task_id)
                    db_inc_user_sent(user_id)
                    db_mark_chat_done(chat["id"])
                    log.info(f"[{task_id}] Отправлено на {target} ({total_sent}/{total})")
                except FloodWaitError as ex:
                    log.warning(f"[{task_id}] FloodWait {ex.seconds}s на аккаунте {acc['phone']}")
                    total_errors += 1
                    db_inc_errors(task_id)
                    await asyncio.sleep(ex.seconds)
                except (UserBannedInChannelError, UserDeactivatedBanError):
                    log.error(f"[{task_id}] Бан аккаунта {acc['phone']}")
                    total_errors += 1
                    db_inc_errors(task_id)
                except Exception as ex:
                    log.warning(f"[{task_id}] Ошибка отправки на {target}: {ex}")
                    total_errors += 1
                    db_inc_errors(task_id)

                if i < total - 1:
                    await asyncio.sleep(random.randint(delay_min, delay_max))

        status = "done" if task_id in running_tasks else "stopped"
        running_tasks.pop(task_id, None)
        db_set_task_status(task_id, status)
        await done_cb(task_id, total_sent, total_errors, 0, status)

    except asyncio.CancelledError:
        log.info(f"[{task_id}] Задача отменена вручную.")
        db_set_task_status(task_id, "stopped")
        running_tasks.pop(task_id, None)
        raise

# ─────────────────────────────────────────────────────
#  КЛАВИАТУРЫ И МАКЕТЫ
# ─────────────────────────────────────────────────────

def main_menu_keyboard(user_id: int):
    """
    Главное меню:
    - Создать задачу убрано с главного меню (перенесено внутрь 'Мои задачи')
    - Кнопка 'Начать рассылку' выделена синим стилем (primary)
    """
    kb = [
        [styled_btn("🚀 Начать рассылку", b"menu_tasks", style="primary")],
        [styled_btn("👤 Личный кабинет", b"menu_profile"), styled_btn("📱 Мои аккаунты", b"menu_accounts")],
        [styled_btn("📨 Мои задачи", b"menu_tasks"), styled_btn("⭐ Тарифы и подписка", b"menu_sub")],
        [styled_btn("ℹ️ Инфо и помощь", b"menu_help")]
    ]
    if user_id in ADMIN_IDS:
        kb.append([styled_btn("👑 Панель Администратора", b"admin_menu")])
    return kb

def cancel_keyboard():
    return [[styled_btn("❌ Отмена", b"cancel_fsm", style="danger")]]

def terms_keyboard():
    return [[styled_btn("✅ Принять условия", b"accept_terms", style="success")]]

def channel_sub_keyboard(channel_url: str):
    return [
        [Button.url("📢 Подписаться на канал", channel_url)],
        [styled_btn("✅ Проверить подписку", b"check_channel_sub", style="success")]
    ]

def code_input_keyboard():
    return [
        [styled_btn("📩 Отправить через SMS", b"resend_sms", style="primary")],
        [styled_btn("❌ Отмена", b"cancel_fsm", style="danger")]
    ]

def profile_keyboard(user_id: int):
    """
    В профиле размещены:
    - Добавить аккаунт (зеленая кнопка success)
    - Реферальная система (синяя кнопка primary)
    """
    return [
        [styled_btn("➕ Добавить аккаунт", b"add_account", style="success"), styled_btn("👥 Реферальная система", b"menu_ref", style="primary")],
        [styled_btn("💳 Сменить тариф", b"menu_sub"), styled_btn("🔙 Главное меню", b"main_menu")]
    ]

def accounts_keyboard(user_id: int):
    accs = db_get_user_accounts(user_id)
    buttons = []
    for a in accs:
        buttons.append([
            styled_btn(f"📱 {a['phone']}", f"view_acc_{a['id']}".encode()),
            styled_btn("❌ Удалить", f"del_acc_{a['id']}".encode(), style="danger")
        ])
    # Как на присланном скриншоте:
    buttons.append([
        styled_btn("➕ Добавить по SMS-коду", b"add_account", style="success"),
        styled_btn("📁 По StringSession", b"add_account_session", style="primary")
    ])
    buttons.append([styled_btn("🔙 Главное меню", b"main_menu")])
    return buttons

def add_account_options_keyboard():
    """Макет модального выбора способа входа точно как на присланном скриншоте."""
    return [
        [styled_btn("📲 По SMS-коду", b"add_acc_phone", style="success")],
        [styled_btn("📁 По StringSession (Telethon)", b"add_account_session", style="primary")],
        [styled_btn("🤝 Прокси и настройки", b"conn_help", style="primary")],
        [styled_btn("Закрыть", b"main_menu", style="danger")]
    ]

def tasks_keyboard(user_id: int):
    tasks = db_get_user_tasks(user_id)
    buttons = []
    icons = {"running":"🔄","done":"✅","stopped":"⏹","stopped_flood":"⛔","account_banned":"🚫","limit_reached":"⚠️"}
    for t in tasks:
        icon = icons.get(t["status"], "❓")
        loop_icon = "🔁 " if t.get("loop") else ""
        media_icon = "📷 " if t.get("media") else ""
        buttons.append([
            styled_btn(
                f"{loop_icon}{media_icon}{icon} Задача #{t['id']} (✅{t['sent']} ❌{t['errors']})",
                f"task_detail_{t['id']}".encode()
            )
        ])
    # В списке задач добавлена кнопка "Создать задачу" с ярким стилем primary
    buttons.append([styled_btn("➕ Создать задачу", b"new_task", style="primary")])
    buttons.append([styled_btn("🔙 Главное меню", b"main_menu")])
    return buttons

def task_action_keyboard(task_id: int):
    task = db_get_task(task_id)
    is_running = task_id in running_tasks
    is_loop = bool(task and task["loop"])
    buttons = []
    if is_running:
        buttons.append([styled_btn("⏹ Остановить рассылку", f"stop_task_{task_id}".encode(), style="danger")])
    else:
        buttons.append([styled_btn("▶️ Запустить рассылку", f"start_task_{task_id}".encode(), style="success")])
    buttons.append([
        styled_btn(
            ("🔁 Режим: бесконечно" if is_loop else "1️⃣ Режим: один раз"),
            f"toggle_loop_{task_id}".encode()
        )
    ])
    buttons.append([
        styled_btn("🔄 Обновить", f"task_detail_{task_id}".encode()),
        styled_btn("🔙 К задачам", b"menu_tasks")
    ])
    buttons.append([styled_btn("❌ Удалить задачу", f"del_task_{task_id}".encode(), style="danger")])
    return buttons

def sub_keyboard():
    return [
        [styled_btn("🚀 Pro (69 ⭐ / $1.99)", b"buy_pro_stars", style="primary"), styled_btn("💎 Premium+ (159 ⭐ / $4.49)", b"buy_premium_stars", style="primary")],
        [styled_btn("🤖 Оплатить через CryptoBot (USDT)", b"buy_crypto", style="success")],
        [styled_btn("🔙 Главное меню", b"main_menu")]
    ]

def admin_keyboard():
    return [
        [styled_btn("📊 Подробная статистика бота", b"admin_stats", style="primary")],
        [styled_btn("🎁 Выдать подписку пользователю", b"admin_give_sub", style="success")],
        [styled_btn("👥 Список пользователей", b"admin_users_list")],
        [styled_btn("📢 Обязательный канал подписки", b"admin_channel_settings")],
        [styled_btn("🔙 Главное меню", b"main_menu")]
    ]

def help_keyboard():
    return [
        [styled_btn("📜 Политика конфиденциальности и условия", b"view_terms", style="primary")],
        [styled_btn("🔙 Главное меню", b"main_menu")]
    ]

def ref_keyboard(bot_username: str, user_id: int):
    ref_link = f"https://t.me/{bot_username}?start=ref_{user_id}" if bot_username else f"ref_{user_id}"
    share_url = f"https://t.me/share/url?url={ref_link}&text=Присоединяйся+к+TG+Broadcaster+-+удобному+сервису+авторассылок+в+Telegram!"
    return [
        [Button.url("🔗 Поделиться ссылкой", share_url)],
        [styled_btn("🔙 В Профиль", b"menu_profile")]
    ]

# ─────────────────────────────────────────────────────
#  ТЕКСТЫ И ФОРМАТИРОВАНИЕ (БЕЗ РАЗДЕЛИТЕЛЬНЫХ ПОЛОСОК)
# ─────────────────────────────────────────────────────

def welcome_text(user_id: int) -> str:
    return (
        "🤖 **TG Broadcaster**\n\n"
        "Удобный инструмент для автоматизации и ведения рассылок в Telegram с мультиаккаунтов.\n\n"
        "• Поддержка нескольких аккаунтов с авто-ротацией\n"
        "• Отправка текста и медиа-вложений\n"
        "• Умные интервалы задержек от спам-фильтров\n"
        "• Одиночный и бесконечный режим рассылки\n\n"
        "Выберите действие в меню ниже:"
    )

def profile_text(user_id: int) -> str:
    u = db_get_or_create_user(user_id)
    plan_key = u["sub_plan"]
    plan = SUBSCRIPTION_PLANS.get(plan_key, SUBSCRIPTION_PLANS["free"])
    accs = db_get_user_accounts(user_id)
    tasks = db_get_user_tasks(user_id)
    bonus = u.get("bonus_messages", 0)

    expires_str = "Бессрочно (Free)"
    if u["sub_expires_at"] > 0:
        rem_sec = u["sub_expires_at"] - int(time.time())
        if rem_sec > 0:
            days = rem_sec // 86400
            hours = (rem_sec % 86400) // 3600
            expires_str = f"{days}д {hours}ч"
        else:
            expires_str = "Истекла"

    sent_today = u["free_limit_used"] if plan_key == "free" else u["daily_sent"]
    total_allowed = plan['daily_limit'] + bonus
    limit_str = f"{sent_today} / {total_allowed}"

    bonus_str = f"\n🎁 Бонусных сообщений за рефералов: `{bonus}`" if bonus > 0 else ""

    return (
        f"👤 **Личный кабинет**\n\n"
        f"🆔 ID: `{user_id}`\n"
        f"⭐ Тариф: **{plan['name']}**\n"
        f"⏱ Срок действия: {expires_str}\n"
        f"📊 Отправлено сообщений: `{limit_str}`{bonus_str}\n\n"
        f"📱 Подключено аккаунтов: `{len(accs)} / {plan['max_accounts']}`\n"
        f"⚡ Мин. задержка: `{plan['min_delay']} сек`\n"
        f"📨 Создано задач: `{len(tasks)}`"
    )

def referral_text(bot_username: str, user_id: int) -> str:
    u = db_get_or_create_user(user_id)
    plan = SUBSCRIPTION_PLANS.get(u["sub_plan"], SUBSCRIPTION_PLANS["free"])
    stats = db_get_referral_stats(user_id)
    bot_name = bot_username or "bot"
    ref_link = f"https://t.me/{bot_name}?start=ref_{user_id}"

    return (
        f"👥 **Реферальная программа**\n\n"
        f"Приглашайте других пользователей и получайте бесплатные сообщения к своему лимиту!\n\n"
        f"🎯 **Ваша персональная ссылка:**\n`{ref_link}`\n\n"
        f"💡 **Как начисляются бонусы:**\n"
        f"Когда приглашённый пользователь переходит по вашей ссылке и успешно подключает свой первый аккаунт, вам мгновенно начисляются сообщения:\n"
        f"• На тарифе Free: **+50 сообщений**\n"
        f"• На тарифе Pro: **+100 сообщений**\n"
        f"• На тарифе Premium+: **+230 сообщений**\n\n"
        f"📊 **Ваша статистика:**\n"
        f"• Перешли по ссылке: `{stats['total_invited']}` чел.\n"
        f"• Подключили аккаунт: `{stats['active_invited']}` чел.\n"
        f"• Получено бонусных сообщений: `+{stats['bonus_messages']}`"
    )

def task_detail_text(task: dict) -> str:
    target = task.get("target_accs", "all")
    acc_str = "Все активные аккаунты" if target == "all" else f"ID: {target}"
    live = task["id"] in running_tasks
    media_str = "Прикреплено фото" if task.get("media") else "Нет"
    ar_str = "🟢 Включен (ответ на сообщения)" if task.get("auto_reply") else "⚪ Выключен"
    return (
        f"📊 **Информация о задаче #{task['id']}**\n\n"
        f"📱 Аккаунты: `{acc_str}`\n"
        f"📌 Статус: `{task['status']}`\n"
        f"🔁 Режим: {'Бесконечный цикл' if task['loop'] else 'Одиночный'}\n"
        f"🤖 Автоответчик: {ar_str}\n"
        f"🖼 Медиа: {media_str}\n\n"
        f"📈 Отправлено: `{task['sent']}` | ❌ Ошибок: `{task['errors']}`\n"
        f"⏱ Интервал задержки: `{task['delay_min']}–{task['delay_max']} сек`\n"
        f"🟢 Активна сейчас: {'Да' if live else 'Нет'}\n\n"
        f"📝 Текст рассылки:\n_{task['text'][:140]}..._"
    )

def admin_stats_text() -> str:
    stats = db_get_admin_stats()
    conv_acc = round((stats['clicked_add_acc'] / stats['total_users'] * 100), 1) if stats['total_users'] > 0 else 0
    conv_task = round((stats['clicked_create_task'] / stats['total_users'] * 100), 1) if stats['total_users'] > 0 else 0
    channel = stats["required_channel"] or "Отключен"

    return (
        f"📊 **Статистика бота и конверсий**\n\n"
        f"👥 **Пользователи и воронка:**\n"
        f"• Всего пользователей: `{stats['total_users']}`\n"
        f"• Приняли условия: `{stats['terms_accepted']}`\n"
        f"• Нажали «Добавить аккаунт»: `{stats['clicked_add_acc']}` ({conv_acc}%)\n"
        f"• Нажали «Создать задачу»: `{stats['clicked_create_task']}` ({conv_task}%)\n\n"
        f"⭐ **Подписки и продажи:**\n"
        f"• Free (Старт): `{stats['sub_free']}`\n"
        f"• Pro (активных): `{stats['sub_pro']}` (купили: `{stats['total_purchases_pro']}`)\n"
        f"• Premium+ (активных): `{stats['sub_premium']}` (купили: `{stats['total_purchases_prem']}`)\n\n"
        f"📱 **Аккаунты:**\n"
        f"• Успешно добавлено аккаунтов: `{stats['total_accounts']}`\n"
        f"• Пользователей с подключенными аккаунтами: `{stats['users_with_accounts']}`\n\n"
        f"📨 **Задачи:**\n"
        f"• Всего создано задач: `{stats['total_tasks_created']}`\n"
        f"• Выполняется прямо сейчас: `{stats['running_tasks_count']}`\n\n"
        f"👥 **Реферальная система:**\n"
        f"• Реферальных переходов: `{stats['total_referred_users']}`\n"
        f"• Активировали бонус: `{stats['total_rewarded_referrals']}`\n"
        f"• Всего начислено бонусных сообщений: `+{stats['total_bonus_awarded']}`\n\n"
        f"📢 **Обязательный канал:** `{channel}`"
    )

# ─────────────────────────────────────────────────────
#  ПРОВЕРКА ОБЯЗАТЕЛЬНОЙ ПОДПИСКИ НА КАНАЛ
# ─────────────────────────────────────────────────────

async def check_channel_subscription(bot: TelegramClient, user_id: int) -> tuple[bool, str]:
    channel = db_get_setting("required_channel", REQUIRED_CHANNEL).strip()
    if not channel or channel.lower() == "off":
        return True, ""

    try:
        clean_channel = channel.replace("https://t.me/", "").replace("t.me/", "")
        if not clean_channel.startswith("@") and not clean_channel.startswith("-100") and not clean_channel.isdigit():
            clean_channel = "@" + clean_channel

        try:
            entity = await bot.get_entity(clean_channel)
        except Exception:
            entity = clean_channel

        participant = await bot(functions.channels.GetParticipantRequest(
            channel=entity,
            participant=user_id
        ))
        if participant:
            return True, ""
    except UserNotParticipantError:
        channel_url = f"https://t.me/{channel.replace('@', '')}"
        return False, channel_url
    except Exception as ex:
        log.warning(f"Ошибка проверки подписки на канал ({channel}): {ex}")
        return True, ""

    return True, ""

# ─────────────────────────────────────────────────────
#  ХЕНДЛЕРЫ И FSM
# ─────────────────────────────────────────────────────

def register_handlers(bot: TelegramClient):

    bot_username_cache = {"username": BOT_USERNAME}

    async def get_bot_username():
        try:
            me = await bot.get_me()
            if me and me.username:
                bot_username_cache["username"] = me.username
                return me.username
        except Exception:
            pass
        return bot_username_cache.get("username", BOT_USERNAME)

    @bot.on(events.NewMessage(pattern=r"^/start(?:\s+(.+))?"))
    async def start_cmd(e):
        uid = e.sender_id
        states.pop(uid, None)
        await get_bot_username()

        # Обработка реферального кода из deep-link (?start=ref_123456)
        arg = (e.pattern_match.group(1) or "").strip()
        if arg:
            clean_ref = arg.replace("ref_", "").replace("ref", "")
            if clean_ref.isdigit():
                ref_id = int(clean_ref)
                db_get_or_create_user(uid)
                db_set_user_referrer(uid, ref_id)

        u = db_get_or_create_user(uid)

        # 1. Проверка обязательной подписки на канал
        is_subbed, ch_url = await check_channel_subscription(bot, uid)
        if not is_subbed:
            await e.respond(
                "📢 **Подписка на канал обязательна**\n\n"
                "Для доступа ко всем функциям бота необходимо подписаться на наш официальный канал.\n\n"
                "После подписки нажмите кнопку ниже для продолжения:",
                buttons=channel_sub_keyboard(ch_url)
            )
            return

        # 2. Проверка принятия условий использования
        if not u.get("terms_accepted"):
            await e.respond(
                "⚖️ **Политика конфиденциальности и условия пользования**\n\n"
                "Перед началом работы с TG Broadcaster необходимо ознакомиться и принять правила сервиса:\n\n"
                "• Сервис предоставляет инструмент для автоматизации рассылок.\n"
                "• Пользователь самостоятельно несет ответственность за сохранность аккаунтов, контент рассылок и возможные спам-блокировки Telegram.\n"
                "• Администрация не несет ответственности за санкции против аккаунтов.\n\n"
                "Ознакомиться с полным текстом можно в любое время в разделе «Инфо и помощь».\n\n"
                "Нажимая «Принять условия», вы подтверждаете согласие с правилами сервиса.",
                buttons=terms_keyboard()
            )
            return

        await e.respond(welcome_text(uid), buttons=main_menu_keyboard(uid))

    @bot.on(events.Raw)
    async def raw_update_handler(event):
        try:
            if event.__class__.__name__ == 'UpdateBotPrecheckoutQuery':
                await bot(functions.messages.SetBotPrecheckoutResultsRequest(
                    user_id=event.user_id,
                    query_id=event.query_id,
                    success=True
                ))
            elif event.__class__.__name__ == 'UpdateMessageService':
                if hasattr(event.message, 'action') and isinstance(event.message.action, types.MessageActionPaymentSentMe):
                    payment = event.message.action
                    payload = payment.payload.decode('utf-8') if isinstance(payment.payload, bytes) else str(payment.payload)
                    parts = payload.split("_")
                    if len(parts) >= 3 and parts[0] == "sub":
                        plan_name = parts[1]
                        user_id = int(parts[2])
                        db_update_user_sub(user_id, plan_name, 30, method="stars", amount=SUBSCRIPTION_PLANS[plan_name]["price_stars"])
                        try:
                            await bot.send_message(user_id, f"🎉 **Подписка {plan_name.upper()} успешно оплачена через Telegram Stars и активирована на 30 дней!**", buttons=main_menu_keyboard(user_id))
                        except Exception as ex:
                            log.error(f"Error notifying payment: {ex}")
        except Exception:
            pass

    @bot.on(events.NewMessage(pattern=r"^/profile"))
    async def profile_cmd(e):
        states.pop(e.sender_id, None)
        await e.respond(profile_text(e.sender_id), buttons=profile_keyboard(e.sender_id))

    @bot.on(events.NewMessage(pattern=r"^/(accs|accounts)"))
    async def accs_cmd(e):
        states.pop(e.sender_id, None)
        db_set_user_funnel(e.sender_id, "clicked_add_acc")
        await e.respond("📱 **Управление подключенными аккаунтами:**", buttons=accounts_keyboard(e.sender_id))

    @bot.on(events.NewMessage(pattern=r"^/tasks"))
    async def tasks_cmd(e):
        states.pop(e.sender_id, None)
        await e.respond("📨 **Управление задачами рассылки:**", buttons=tasks_keyboard(e.sender_id))

    @bot.on(events.NewMessage(pattern=r"^/(sub|subscribe)"))
    async def sub_cmd(e):
        states.pop(e.sender_id, None)
        await e.respond("⭐ **Выберите подходящий тариф подписки:**", buttons=sub_keyboard())

    @bot.on(events.NewMessage(pattern=r"^/ref"))
    async def ref_cmd(e):
        states.pop(e.sender_id, None)
        bname = await get_bot_username()
        await e.respond(referral_text(bname, e.sender_id), buttons=ref_keyboard(bname, e.sender_id))

    @bot.on(events.NewMessage(pattern=r"^/(help|info)"))
    async def help_cmd(e):
        states.pop(e.sender_id, None)
        await e.respond(
            "ℹ️ **Справочное руководство TG Broadcaster**\n\n"
            "• `/profile` — Личный кабинет и реферальная программа\n"
            "• `/accs` — Подключение и управление аккаунтами\n"
            "• `/tasks` — Список задач рассылки и создание новых\n"
            "• `/sub` — Тарифные планы (Pro, Premium+)\n\n"
            "🔒 **Безопасность и правила:**\n"
            "Нажмите кнопку ниже для просмотра условий пользования и политики конфиденциальности.",
            buttons=help_keyboard()
        )

    # ── АДМИН КОМАНДЫ ──
    @bot.on(events.NewMessage(pattern=r"^/admin"))
    async def admin_cmd(e):
        if e.sender_id not in ADMIN_IDS: return
        states.pop(e.sender_id, None)
        await e.respond("👑 **Панель Администратора:**", buttons=admin_keyboard())

    @bot.on(events.NewMessage(pattern=r"^/stats"))
    async def stats_cmd(e):
        if e.sender_id not in ADMIN_IDS: return
        await e.respond(admin_stats_text(), buttons=[[styled_btn("🔙 Назад", b"admin_menu")]])

    @bot.on(events.NewMessage(pattern=r"^/set_channel\s+(.+)"))
    async def set_channel_cmd(e):
        if e.sender_id not in ADMIN_IDS: return
        target = e.pattern_match.group(1).strip()
        if target.lower() in ["off", "none", "0", "disable"]:
            db_set_setting("required_channel", "")
            await e.respond("✅ Обязательная проверка подписки на канал отключена.")
        else:
            db_set_setting("required_channel", target)
            await e.respond(f"✅ Установлен обязательный канал: `{target}`\nНе забудьте добавить бота администратором в этот канал!")

    @bot.on(events.NewMessage(pattern=r"^/give_sub\s+(\d+)\s+(pro|premium|free)\s*(\d+)?"))
    async def give_sub_cmd(e):
        if e.sender_id not in ADMIN_IDS: return
        target_uid = int(e.pattern_match.group(1))
        plan = e.pattern_match.group(2).lower()
        days = int(e.pattern_match.group(3) or 30)

        db_update_user_sub(target_uid, plan, days, method="admin_grant")
        await e.respond(f"✅ Пользователю `{target_uid}` выдана подписка **{plan.upper()}** на {days} дней!")
        try:
            await bot.send_message(target_uid, f"🎉 **Вам активирована подписка {plan.upper()} на {days} дней!**")
        except Exception:
            pass

    # ── CALLBACK QUERY ОБРАБОТЧИК ──
    @bot.on(events.CallbackQuery())
    async def callback_handler(e):
        uid = e.sender_id
        data = e.data.decode("utf-8")
        await e.answer()

        # Принятие условий пользования
        if data == "accept_terms":
            db_set_terms_accepted(uid)
            await e.edit("✅ **Вы успешно приняли условия сервиса!**\n\nДобро пожаловать в TG Broadcaster.", buttons=main_menu_keyboard(uid))

        elif data == "view_terms":
            await e.edit(
                TERMS_SUMMARY_TEXT,
                buttons=[[styled_btn("🔙 Назад в Инфо", b"menu_help")]]
            )

        elif data == "check_channel_sub":
            is_subbed, ch_url = await check_channel_subscription(bot, uid)
            if is_subbed:
                u = db_get_or_create_user(uid)
                if not u.get("terms_accepted"):
                    await e.edit(
                        "⚖️ **Политика конфиденциальности и условия пользования**\n\n"
                        "Подтвердите согласие с правилами сервиса для начала работы:",
                        buttons=terms_keyboard()
                    )
                else:
                    await e.edit(welcome_text(uid), buttons=main_menu_keyboard(uid))
            else:
                await e.answer("❌ Вы ещё не подписались на канал! Подпишитесь и нажмите снова.", alert=True)

        elif data == "main_menu":
            states.pop(uid, None)
            await e.edit(welcome_text(uid), buttons=main_menu_keyboard(uid))

        elif data == "menu_profile":
            await e.edit(profile_text(uid), buttons=profile_keyboard(uid))

        elif data == "menu_ref":
            bname = await get_bot_username()
            await e.edit(referral_text(bname, uid), buttons=ref_keyboard(bname, uid))

        elif data == "menu_sub":
            await e.edit("⭐ **Выберите подходящий тариф подписки:**", buttons=sub_keyboard())

        elif data == "menu_help":
            await e.edit(
                "ℹ️ **Справочное руководство TG Broadcaster**\n\n"
                "• Раздел «Профиль» содержит вашу реферальную ссылку и лимиты.\n"
                "• В разделе «Задачи» вы можете запустить рассылку и создать новую.\n"
                "• В разделе «Аккаунты» подключаются номера через SMS или готовую сессию.\n\n"
                "🔒 **Политика конфиденциальности:**\n"
                "Ознакомиться с правилами и условиями использования можно кнопкой ниже.",
                buttons=help_keyboard()
            )

        elif data == "cancel_fsm":
            await cancel_auth(uid)
            states.pop(uid, None)
            await e.edit("❌ **Действие отменено.**", buttons=main_menu_keyboard(uid))

        # ── АДМИН ПАНЕЛЬ ──
        elif data == "admin_menu":
            if uid not in ADMIN_IDS: return
            await e.edit("👑 **Панель Администратора:**", buttons=admin_keyboard())

        elif data == "admin_stats":
            if uid not in ADMIN_IDS: return
            await e.edit(admin_stats_text(), buttons=[[styled_btn("🔄 Обновить", b"admin_stats", style="primary"), styled_btn("🔙 Назад", b"admin_menu")]])

        elif data == "admin_channel_settings":
            if uid not in ADMIN_IDS: return
            cur = db_get_setting("required_channel", REQUIRED_CHANNEL) or "Отключен"
            await e.edit(
                f"📢 **Настройка обязательного канала**\n\n"
                f"Текущий канал: `{cur}`\n\n"
                f"Чтобы изменить, отправьте команду:\n`/set_channel @channel_username`\n\n"
                f"Чтобы отключить:\n`/set_channel off`",
                buttons=[[styled_btn("🔙 Назад", b"admin_menu")]]
            )

        elif data == "admin_users_list":
            if uid not in ADMIN_IDS: return
            users = db_get_all_users()
            msg = f"👥 **Пользователи в БД:** `{len(users)}`\n\n"
            for u in users[:15]:
                terms_icon = "✅" if u.get("terms_accepted") else "⏳"
                msg += f"• ID: `{u['user_id']}` | План: `{u['sub_plan']}` | Условия: {terms_icon}\n"
            await e.edit(msg, buttons=[[styled_btn("🔙 Назад", b"admin_menu")]])

        elif data == "admin_give_sub":
            if uid not in ADMIN_IDS: return
            states[uid] = {"state": "admin_input_sub"}
            await e.edit(
                "✍️ **Выдача подписки**\n\n"
                "Введите данные в формате:\n`<user_id> <pro/premium> <дни>`\n\n"
                "Пример: `1793274038 pro 30`",
                buttons=cancel_keyboard()
            )

        # ── ДОБАВЛЕНИЕ АККАУНТА (КАК НА СКРИНШОТЕ) ──
        elif data in ["add_account", "open_add_account_modal"]:
            u = db_get_or_create_user(uid)
            db_set_user_funnel(uid, "clicked_add_acc")
            plan = SUBSCRIPTION_PLANS.get(u["sub_plan"], SUBSCRIPTION_PLANS["free"])
            accs = db_get_user_accounts(uid)

            if len(accs) >= plan["max_accounts"]:
                await e.answer(f"⚠️ На вашем тарифе можно добавить не более {plan['max_accounts']} аккаунтов!", alert=True)
                return

            await e.edit(
                "👤 **Добавить профиль**\n\n"
                "🔒 Аккаунт используется **ТОЛЬКО** для авторассылки. Личная переписка не читается и не сохраняется.\n\n"
                "Выберите способ входа:",
                buttons=add_account_options_keyboard()
            )

        elif data == "add_acc_phone":
            u = db_get_or_create_user(uid)
            states[uid] = {"state": "phone"}
            await e.edit(
                "📱 **Подключение по SMS-коду**\n\n"
                "Введите номер телефона в международном формате:\n"
                "Пример: `+79001234567`",
                buttons=cancel_keyboard()
            )

        elif data == "add_account_session":
            u = db_get_or_create_user(uid)
            db_set_user_funnel(uid, "clicked_add_acc")
            plan = SUBSCRIPTION_PLANS.get(u["sub_plan"], SUBSCRIPTION_PLANS["free"])
            accs = db_get_user_accounts(uid)

            if len(accs) >= plan["max_accounts"]:
                await e.answer(f"⚠️ На вашем тарифе можно добавить не более {plan['max_accounts']} аккаунтов!", alert=True)
                return

            states[uid] = {"state": "session_string"}
            await e.edit(
                "📁 **Добавление аккаунта по готовой session**\n\n"
                "Пришлите строку StringSession (Telethon) сообщением или файлом (.session / .txt):",
                buttons=cancel_keyboard()
            )

        elif data == "conn_help":
            await e.edit(
                "🤝 **Прокси и безопасность**\n\n"
                "• Бот использует безопасное прямое соединение с дата-центрами Telegram.\n"
                "• Рекомендуется подключать прогретые аккаунты с установленной аватаркой и именем.\n"
                "• Для максимальной надежности используйте минимальную задержку не менее 5-10 секунд.",
                buttons=[[styled_btn("🔙 Назад к способам входа", b"add_account"), styled_btn("🔙 Главное меню", b"main_menu")]]
            )

        elif data == "resend_sms":
            try:
                await auth_resend_code_sms(uid)
                await e.answer("📩 Запрос отправки кода по SMS отправлен!", alert=True)
            except SendCodeUnavailableError:
                await e.answer("⏳ Telegram просит подождать около 60 сек перед повторным запросом SMS.", alert=True)
            except Exception as ex:
                await e.answer(f"Ошибка запроса SMS: {ex}", alert=True)

        elif data.startswith("view_acc_"):
            acc_id = int(data.split("_")[2])
            acc = db_get_account_by_id(acc_id)
            if acc:
                await e.edit(
                    f"📱 **Аккаунт ID: `{acc['id']}`**\n"
                    f"📞 Телефон: `{acc['phone']}`\n"
                    f"📌 Статус: `{acc['status']}`",
                    buttons=[[styled_btn("❌ Удалить", f"del_acc_{acc['id']}".encode(), style="danger")], [styled_btn("🔙 Назад", b"menu_accounts")]]
                )

        elif data == "menu_accounts":
            states.pop(uid, None)
            accs = db_get_user_accounts(uid)
            if not accs:
                await e.edit(
                    "📱 **У вас пока нет подключенных аккаунтов.**\n\n"
                    "Нажмите кнопку ниже, чтобы привязать рабочий профиль:",
                    buttons=[
                        [styled_btn("➕ Добавить аккаунт", b"add_account", style="success")],
                        [styled_btn("🔙 Главное меню", b"main_menu")]
                    ]
                )
            else:
                await e.edit("📱 **Список ваших аккаунтов:**", buttons=accounts_keyboard(uid))

        elif data.startswith("del_acc_"):
            acc_id = int(data.split("_")[2])
            acc = db_get_account_by_id(acc_id)
            if acc and acc["user_id"] == uid:
                if acc["phone"] in active_clients:
                    client = active_clients.pop(acc["phone"])
                    try: await client.disconnect()
                    except Exception: pass
                db_delete_account(acc["phone"], uid)
                await e.answer("✅ Аккаунт удален", alert=True)
            await e.edit("📱 **Список ваших аккаунтов:**", buttons=accounts_keyboard(uid))

        # ── ЗАДАЧИ ──
        elif data == "menu_tasks":
            states.pop(uid, None)
            tasks = db_get_user_tasks(uid)
            if not tasks:
                await e.edit(
                    "📨 **У вас пока нет созданных задач рассылки.**\n\n"
                    "Создайте новую задачу, указав рекламный текст и список получателей:",
                    buttons=[
                        [styled_btn("➕ Создать задачу", b"new_task", style="primary")],
                        [styled_btn("🔙 Главное меню", b"main_menu")]
                    ]
                )
            else:
                await e.edit("📨 **Список ваших задач рассылки:**", buttons=tasks_keyboard(uid))

        elif data == "new_task":
            db_set_user_funnel(uid, "clicked_create_task")
            accs = [a for a in db_get_user_accounts(uid) if a["status"] == "active"]
            if not accs:
                await e.answer("❌ Сначала подключите хотя бы один аккаунт в разделе «Аккаунты»!", alert=True)
                return

            buttons = [
                [styled_btn("🌐 Для ВСЕХ активных аккаунтов", b"sel_acc_all", style="primary")]
            ]
            for a in accs:
                buttons.append([styled_btn(f"📱 {a['phone']}", f"sel_acc_single_{a['id']}".encode())])
            buttons.append([styled_btn("❌ Отмена", b"cancel_fsm", style="danger")])

            await e.edit("🎯 **Выберите аккаунты для рассылки:**", buttons=buttons)

        elif data.startswith("sel_acc_"):
            target_accs = "all" if data == "sel_acc_all" else data.replace("sel_acc_single_", "")
            states[uid] = {"state": "task_text", "target_accs": target_accs}
            await e.edit("✍️ **Введите текст рекламного сообщения:**", buttons=cancel_keyboard())

        elif data.startswith("task_detail_"):
            task_id = int(data.split("_")[2])
            task = db_get_task(task_id)
            if not task or task["user_id"] != uid:
                await e.answer("Задача не найдена", alert=True)
                return
            await e.edit(task_detail_text(task), buttons=task_action_keyboard(task_id))

        elif data.startswith("del_task_"):
            task_id = int(data.split("_")[2])
            if task_id in running_tasks:
                t = running_tasks.pop(task_id)
                t.cancel()
            db_delete_task(task_id, uid)
            await e.answer("✅ Задача удалена")
            tasks = db_get_user_tasks(uid)
            if tasks:
                await e.edit("📨 **Список ваших задач:**", buttons=tasks_keyboard(uid))
            else:
                await e.edit("📨 **Задач пока нет.**", buttons=[[styled_btn("➕ Создать задачу", b"new_task", style="primary")], [styled_btn("🔙 Главное меню", b"main_menu")]])

        elif data.startswith("toggle_loop_"):
            task_id = int(data.split("_")[2])
            task = db_get_task(task_id)
            if not task or task["user_id"] != uid:
                await e.answer("Задача не найдена", alert=True)
                return
            new_val = not bool(task["loop"])
            db_set_task_loop(task_id, new_val)
            task = db_get_task(task_id)
            await e.edit(task_detail_text(task), buttons=task_action_keyboard(task_id))

        elif data.startswith("start_task_"):
            task_id = int(data.split("_")[2])
            task = db_get_task(task_id)
            if not task or task["user_id"] != uid:
                await e.answer("Задача не найдена", alert=True)
                return
            if task_id in running_tasks:
                await e.answer("Задача уже запущена!", alert=True)
                return

            can_send, limit_err, _ = db_check_user_limits(uid)
            if not can_send:
                await e.answer(limit_err, alert=True)
                return

            chats = db_get_pending_chats(task_id)
            if not chats:
                if task["loop"]:
                    db_reset_chats(task_id)
                    chats = db_get_pending_chats(task_id)
                if not chats:
                    await e.answer("Нет доступных чатов!", alert=True)
                    return

            db_set_task_status(task_id, "running")

            async def done_cb(tid, sent, errs, total, status):
                icons = {"done":"✅","stopped":"⏹","stopped_flood":"⛔","account_banned":"🚫","limit_reached":"⚠️"}
                text = (
                    f"{icons.get(status,'❓')} **Задача #{tid} завершена!**\n\n"
                    f"✅ Отправлено: `{sent}` | ❌ Ошибок: `{errs}`"
                )
                try:
                    await bot.send_message(uid, text)
                except Exception as ex:
                    log.warning(f"Не удалось отправить уведомление {uid}: {ex}")

            t = asyncio.create_task(
                broadcast_multi(uid, task_id, task["text"], task.get("media"),
                                task["delay_min"], task["delay_max"], done_cb)
            )
            running_tasks[task_id] = t
            await e.edit(task_detail_text(task), buttons=task_action_keyboard(task_id))

        elif data.startswith("stop_task_"):
            task_id = int(data.split("_")[2])
            if task_id in running_tasks:
                task_t = running_tasks.pop(task_id)
                task_t.cancel()
                db_set_task_status(task_id, "stopped")
            await e.edit(f"⏹ **Задача #{task_id} остановлена.**", buttons=task_action_keyboard(task_id))

        elif data == "skip_media":
            st = states.get(uid)
            if st and st.get("state") == "task_media":
                st["media"] = None
                st["state"] = "task_chats"
                await e.edit(
                    "📂 **Введите список чатов/получателей (каждый с новой строки):**\n\n"
                    "Пример:\n`@username`\n`@chat_name`\n`https://t.me/channel`",
                    buttons=cancel_keyboard()
                )

        elif data == "delay_default":
            try:
                await e.answer("⚡ Создаём задачу с параметрами по умолчанию...")
            except Exception:
                pass
            st = states.get(uid, {})
            u = db_get_or_create_user(uid)
            plan = SUBSCRIPTION_PLANS.get(u.get("sub_plan", "free"), SUBSCRIPTION_PLANS["free"])
            d_min = max(10, plan.get("min_delay", 15))
            d_max = max(30, d_min + 15)

            target_accs = st.get("target_accs", "all")
            text = st.get("text") or "Рекламное сообщение"
            chats = st.get("chats") or []
            media = st.get("media")

            if not chats:
                await e.edit(
                    "⚠️ **Список получателей не найден.**\n\nПожалуйста, начните создание задачи заново:",
                    buttons=[[styled_btn("➕ Создать задачу", b"new_task", style="primary")], [styled_btn("🔙 Главное меню", b"main_menu")]]
                )
                states.pop(uid, None)
                return

            try:
                task_id = db_create_task(
                    uid, 0, target_accs, text, chats, d_min, d_max,
                    loop=False, media=media,
                    auto_reply=int(st.get("auto_reply", 0)),
                    auto_reply_text=st.get("auto_reply_text", "")
                )
                states.pop(uid, None)
                await e.edit(
                    f"✅ **Задача #{task_id} успешно создана!**\n\n"
                    f"📊 Получателей: `{len(chats)}`\n"
                    f"📷 Медиа: `{'Есть' if media else 'Нет'}`\n"
                    f"⏱ Задержка: `{d_min}–{d_max} сек` (по умолчанию)\n"
                    f"🎯 Аккаунты: `{target_accs}`",
                    buttons=task_action_keyboard(task_id)
                )
            except Exception as ex:
                log.error(f"Ошибка создания задачи в delay_default: {ex}")
                await e.respond(f"❌ Ошибка создания задачи: `{ex}`", buttons=main_menu_keyboard(uid))
                states.pop(uid, None)

        # ── ОПЛАТА ──
        elif data == "buy_crypto":
            buttons = [
                [styled_btn("🚀 Pro ($1.99 USDT)", b"pay_crypto_pro", style="primary")],
                [styled_btn("💎 Premium+ ($4.49 USDT)", b"pay_crypto_premium", style="primary")],
                [styled_btn("🔙 Отмена", b"menu_sub", style="danger")]
            ]
            await e.edit("🤖 **Оплата через CryptoBot (USDT):**\nВыберите нужный тариф:", buttons=buttons)

        elif data in ["pay_crypto_pro", "pay_crypto_premium"]:
            plan_name = "pro" if data == "pay_crypto_pro" else "premium"
            plan = SUBSCRIPTION_PLANS[plan_name]
            inv = await create_cryptobot_invoice(plan["price_usd"], f"Подписка {plan['name']}")

            if inv and inv.get("pay_url") and inv.get("invoice_id"):
                pay_url = inv["pay_url"]
                inv_id = inv["invoice_id"]
                buttons = [
                    [Button.url("💳 Перейти к оплате (CryptoBot)", pay_url)],
                    [styled_btn("✅ Я оплатил", f"check_crypto_{plan_name}_{inv_id}".encode(), style="success")],
                    [styled_btn("🔙 Назад", b"buy_crypto")]
                ]
                await e.edit(
                    f"🤖 **Счёт #{inv_id} на оплату тарифа {plan['name']}**\n\n"
                    f"💰 Сумма к оплате: **{plan['price_usd']} USDT**\n\n"
                    f"Нажмите кнопку ниже для перехода в CryptoBot:",
                    buttons=buttons
                )
            else:
                await e.edit("⚠️ Ошибка генерации счета. Попробуйте позже или выберите оплату картой/Stars.", buttons=[[styled_btn("🔙 Назад", b"buy_crypto")]])

        elif data.startswith("check_crypto_"):
            parts = data.split("_")
            if len(parts) >= 4:
                plan_name = parts[2]
                inv_id = int(parts[3])

                is_paid = await check_cryptobot_invoice(inv_id)
                if is_paid:
                    plan = SUBSCRIPTION_PLANS[plan_name]
                    db_update_user_sub(uid, plan_name, 30, method="cryptobot", amount=plan["price_usd"])
                    await e.edit(f"🎉 **Подписка {plan_name.upper()} успешно оплачена и активирована на 30 дней!**", buttons=main_menu_keyboard(uid))
                else:
                    await e.answer("❌ Счет ещё не оплачен в CryptoBot! Оплатите чек и попробуйте снова.", alert=True)
            else:
                await e.answer("❌ Неверные данные счета.", alert=True)

        elif data in ["buy_pro_stars", "buy_premium_stars"]:
            plan_name = "pro" if data == "buy_pro_stars" else "premium"
            plan = SUBSCRIPTION_PLANS[plan_name]

            invoice = InputMediaInvoice(
                invoice=Invoice(
                    currency="XTR",
                    prices=[types.LabeledPrice(label=f"Подписка {plan['name']}", amount=plan["price_stars"])],
                    test=False
                ),
                title=f"Подписка {plan['name']}",
                description=f"Оплата подписки {plan['name']} на 30 дней",
                start_param="sub_payment",
                payload=f"sub_{plan_name}_{uid}".encode(),
                provider_data=types.DataJSON(data="{}")
            )
            try:
                await bot.send_message(uid, f"⭐ **Счёт на оплату {plan['name']} ({plan['price_stars']} Stars):**", file=invoice)
                await e.answer("📩 Счёт на оплату Stars отправлен сообщением!")
            except Exception as ex:
                log.error(f"Stars invoice error: {ex}")
                await e.answer(f"Ошибка выставления счета Stars: {ex}", alert=True)

    # ── FSM ВВОД ДАННЫХ ──
    @bot.on(events.NewMessage())
    async def fsm_handler(e):
        if e.text and e.text.startswith("/"): return

        uid = e.sender_id
        st = states.get(uid, {})
        step = st.get("state")
        txt = (e.text or "").strip()
        if not step: return

        if step == "session_string":
            if e.file:
                msg = await e.respond("⏳ Читаем файл и проверяем session...")
                try:
                    raw = await e.download_media(bytes)
                    session_str = raw.decode("utf-8", errors="ignore").strip()
                except Exception as ex:
                    await msg.edit(f"❌ Не удалось прочитать файл: `{ex}`", buttons=main_menu_keyboard(uid))
                    states.pop(uid, None)
                    return
            elif txt:
                msg = await e.respond("⏳ Проверяем session...")
                session_str = txt
            else:
                await e.respond("❌ Пришлите session-строку текстом или файлом.", buttons=cancel_keyboard())
                return

            try:
                info = await add_account_from_session_string(session_str, uid)
                states.pop(uid, None)
                name = info["name"].strip() or "—"
                await msg.edit(
                    f"✅ **Аккаунт успешно добавлен!**\n\n"
                    f"📱 Телефон: `{info['phone']}`\n"
                    f"👤 Имя: {name}\n"
                    f"🆔 ID: `{info['user_id']}`",
                    buttons=main_menu_keyboard(uid)
                )
                await db_reward_referrer_if_eligible(bot, uid)
            except Exception as ex:
                log.error(f"Ошибка добавления по session: {ex}")
                await msg.edit(f"❌ Ошибка: `{ex}`", buttons=main_menu_keyboard(uid))
                states.pop(uid, None)
            return

        if step == "admin_input_sub":
            if uid not in ADMIN_IDS: return
            parts = txt.split()
            if len(parts) < 2:
                await e.respond("❌ Неверный формат. Используйте: `<user_id> <pro/premium/free> <дни>`", buttons=cancel_keyboard())
                return
            try:
                target_uid = int(parts[0])
                plan = parts[1].lower()
                days = int(parts[2]) if len(parts) > 2 else 30
                db_update_user_sub(target_uid, plan, days, method="admin_manual")
                states.pop(uid, None)
                await e.respond(f"✅ Выдана подписка `{plan}` пользователю `{target_uid}` на {days} дней!", buttons=admin_keyboard())
                try:
                    await bot.send_message(target_uid, f"🎉 **Вам активирована подписка {plan.upper()} на {days} дней!**")
                except Exception:
                    pass
            except Exception as ex:
                await e.respond(f"❌ Ошибка данных: `{ex}`", buttons=cancel_keyboard())

        elif step == "phone":
            if not txt.startswith("+"):
                await e.respond("❌ Номер должен начинаться с `+` (например: `+79001234567`). Попробуйте еще раз:", buttons=cancel_keyboard())
                return

            msg = await e.respond(f"⏳ Отправляем код подтверждения на `{txt}`...")
            try:
                await auth_send_code(uid, txt)
                db_add_account(txt, uid)
                states[uid] = {"state": "code", "phone": txt}
                await msg.edit(
                    f"📨 **Код отправлен на номер `{txt}`!**\n\n"
                    f"Откройте официальное приложение Telegram.\n"
                    f"Если код не пришёл — нажмите «📩 Отправить через SMS».\n\n"
                    f"Введите полученный код:",
                    buttons=code_input_keyboard()
                )
            except ApiIdInvalidError:
                await msg.edit("❌ **Ошибка API_ID / API_HASH:**\nВведённые ключи недействительны. Сгенерируйте новые на my.telegram.org.", buttons=main_menu_keyboard(uid))
                states.pop(uid, None)
            except FloodWaitError as ex:
                mins = ex.seconds // 60
                await msg.edit(f"⏳ **Telegram ограничил частые запросы.**\nПожалуйста, подождите `{mins} мин.` перед повторной попыткой.", buttons=main_menu_keyboard(uid))
                states.pop(uid, None)
            except PhoneNumberBannedError:
                await msg.edit("❌ Данный номер телефона заблокирован в Telegram.", buttons=main_menu_keyboard(uid))
                states.pop(uid, None)
            except Exception as ex:
                log.error(f"Ошибка отправки кода: {ex}")
                await msg.edit(f"❌ Ошибка отправки кода: `{ex}`", buttons=main_menu_keyboard(uid))
                states.pop(uid, None)

        elif step == "code":
            msg = await e.respond("⏳ Проверяем код...")
            try:
                res = await auth_confirm_code(uid, txt)
                if res == "2fa":
                    states[uid]["state"] = "2fa"
                    await msg.edit("🔐 Введите пароль двухфакторной аутентификации (2FA):", buttons=cancel_keyboard())
                else:
                    phone = st["phone"]
                    db_save_session(phone, res, uid)
                    states.pop(uid, None)
                    await msg.edit(f"✅ Аккаунт `{phone}` успешно добавлен!", buttons=main_menu_keyboard(uid))
                    await db_reward_referrer_if_eligible(bot, uid)
            except (PhoneCodeInvalidError, PhoneCodeExpiredError):
                await msg.edit("❌ Неверный или истекший код. Попробуйте снова или нажмите отмену:", buttons=code_input_keyboard())
            except Exception as ex:
                log.error(f"Ошибка авторизации: {ex}")
                await msg.edit(f"❌ Ошибка входа: `{ex}`", buttons=main_menu_keyboard(uid))
                states.pop(uid, None)

        elif step == "2fa":
            phone = st["phone"]
            msg = await e.respond("⏳ Проверяем пароль 2FA...")
            try:
                session_str = await auth_confirm_2fa(uid, txt)
                db_save_session(phone, session_str, uid)
                states.pop(uid, None)
                await msg.edit(f"✅ Аккаунт `{phone}` успешно добавлен!", buttons=main_menu_keyboard(uid))
                await db_reward_referrer_if_eligible(bot, uid)
            except Exception as ex:
                await msg.edit(f"❌ Неверный пароль 2FA: `{ex}`", buttons=cancel_keyboard())

        elif step == "task_text":
            states[uid]["text"] = txt
            states[uid]["state"] = "task_media"
            await e.respond(
                "📷 **Прикрепите фото для рассылки** (или нажмите «Пропустить»):",
                buttons=[
                    [styled_btn("⏭ Пропустить", b"skip_media", style="primary")],
                    [styled_btn("❌ Отмена", b"cancel_fsm", style="danger")]
                ]
            )

        elif step == "task_media":
            if e.photo or e.document or e.video:
                msg = await e.respond("⏳ Скачиваем медиафайл...")
                try:
                    path = await e.download_media(file="data/media/")
                    states[uid]["media"] = path
                    states[uid]["state"] = "task_chats"
                    await msg.edit(
                        f"✅ Медиа сохранено: `{os.path.basename(path)}`\n\n"
                        f"📂 Введите список чатов/получателей (каждый с новой строки):",
                        buttons=cancel_keyboard()
                    )
                except Exception as ex:
                    await msg.edit(f"❌ Ошибка скачивания файла: `{ex}`", buttons=cancel_keyboard())

        elif step == "task_chats":
            links = [l.strip() for l in txt.splitlines() if l.strip()]
            if not links:
                await e.respond("❌ Не найдено ссылок. Введите список получателей.", buttons=cancel_keyboard())
                return

            chats = parse_chat_links(links)
            states[uid]["chats"] = chats
            states[uid]["state"] = "task_delay"

            u = db_get_or_create_user(uid)
            plan = SUBSCRIPTION_PLANS.get(u["sub_plan"], SUBSCRIPTION_PLANS["free"])

            await e.respond(
                f"✅ Добавлено получателей: `{len(chats)}`\n\n"
                f"⏱ Укажите интервал задержки в секундах (мин макс):\n"
                f"Минимальная задержка для вашего тарифа: `{plan['min_delay']} сек`\n"
                f"Пример: `15 45`",
                buttons=[
                    [styled_btn(f"⏱ По умолчанию ({plan['min_delay']}–30с)", b"delay_default", style="primary")],
                    [styled_btn("❌ Отмена", b"cancel_fsm", style="danger")]
                ]
            )

        elif step == "task_delay":
            u = db_get_or_create_user(uid)
            plan = SUBSCRIPTION_PLANS.get(u.get("sub_plan", "free"), SUBSCRIPTION_PLANS["free"])
            min_plan_delay = plan.get("min_delay", 15)
            d_min = max(10, min_plan_delay)
            d_max = max(30, d_min + 15)

            clean_txt = (txt or "").strip().lower()
            if clean_txt in ["по умолчанию", "дефолт", "default", "ок", "ok", "да"]:
                d_min = max(10, min_plan_delay)
                d_max = max(30, d_min + 15)
            elif txt:
                nums = re.findall(r"\d+", txt)
                if nums:
                    val1 = int(nums[0])
                    if val1 < min_plan_delay:
                        await e.respond(f"⚠️ Минимальная задержка для вашего тарифа составляет {min_plan_delay} сек.\nВведите число от {min_plan_delay} сек или нажмите кнопку «По умолчанию»:")
                        return
                    d_min = val1
                    if len(nums) > 1:
                        val2 = int(nums[1])
                        d_max = max(d_min, val2)
                    else:
                        d_max = d_min + 15

            target_accs = st.get("target_accs", "all")
            text = st.get("text") or "Рекламное сообщение"
            chats = st.get("chats") or []
            media = st.get("media")

            if not chats:
                await e.respond("⚠️ Список получателей не найден. Пожалуйста, начните создание задачи заново.", buttons=main_menu_keyboard(uid))
                states.pop(uid, None)
                return

            try:
                task_id = db_create_task(
                    uid, 0, target_accs, text, chats, d_min, d_max,
                    loop=False, media=media,
                    auto_reply=int(st.get("auto_reply", 0)),
                    auto_reply_text=st.get("auto_reply_text", "")
                )
                states.pop(uid, None)
                await e.respond(
                    f"✅ **Задача #{task_id} успешно создана!**\n\n"
                    f"📊 Получателей: `{len(chats)}`\n"
                    f"📷 Медиа: `{'Есть' if media else 'Нет'}`\n"
                    f"⏱ Задержка: `{d_min}–{d_max} сек`\n"
                    f"🎯 Аккаунты: `{target_accs}`",
                    buttons=task_action_keyboard(task_id)
                )
            except Exception as ex:
                log.error(f"Ошибка создания задачи в task_delay: {ex}")
                await e.respond(f"❌ Ошибка создания задачи: `{ex}`", buttons=main_menu_keyboard(uid))
                states.pop(uid, None)

# ─────────────────────────────────────────────────────
#  API СЕРВЕР ДЛЯ TELEGRAM MINI APP (VERCEL SYNC)
# ─────────────────────────────────────────────────────

from aiohttp import web

@web.middleware
async def cors_middleware(request, handler):
    if request.method == "OPTIONS":
        resp = web.Response(status=200)
    else:
        try:
            resp = await handler(request)
        except Exception as e:
            resp = web.json_response({"ok": False, "error": str(e)}, status=500)
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    return resp

def init_api_routes(app: web.Application, bot: TelegramClient):
    async def api_health(req):
        return web.json_response({
            "status": "ok",
            "message": "TG Broadcaster API is running",
            "bot_connected": bot.is_connected()
        })

    async def api_get_user(req):
        uid = int(req.query.get("user_id", 0))
        if not uid:
            return web.json_response({"error": "user_id required"}, status=400)
        u = db_get_or_create_user(uid)
        ref_stats = db_get_referral_stats(uid)
        u["referrals_count"] = ref_stats["total_invited"]
        u["referrals_active"] = ref_stats["active_invited"]
        return web.json_response(u)

    async def api_accept_terms(req):
        data = await req.json()
        uid = int(data.get("user_id", 0))
        if not uid:
            return web.json_response({"error": "user_id required"}, status=400)
        db_set_terms_accepted(uid)
        return web.json_response({"ok": True, "terms_accepted": 1})

    async def api_get_referrals(req):
        uid = int(req.query.get("user_id", 0))
        if not uid:
            return web.json_response({"error": "user_id required"}, status=400)
        stats = db_get_referral_stats(uid)
        try:
            me = await bot.get_me()
            bname = me.username if me and me.username else BOT_USERNAME
        except Exception:
            bname = BOT_USERNAME
        stats["referral_link"] = f"https://t.me/{bname}?start=ref_{uid}"
        return web.json_response(stats)

    async def api_get_admin_stats(req):
        stats = db_get_admin_stats()
        return web.json_response(stats)

    async def api_get_accounts(req):
        uid = int(req.query.get("user_id", 0))
        accs = db_get_user_accounts(uid)
        return web.json_response(accs)

    async def api_delete_account(req):
        acc_id = int(req.match_info["id"])
        uid = int(req.query.get("user_id", 0))
        acc = db_get_account_by_id(acc_id)
        if acc:
            db_delete_account(acc["phone"], uid)
        return web.json_response({"ok": True})

    async def api_auth_send_code(req):
        data = await req.json()
        uid = int(data.get("user_id", 0))
        phone = data.get("phone", "").strip()
        db_set_user_funnel(uid, "clicked_add_acc")
        try:
            p_hash = await auth_send_code(uid, phone)
            return web.json_response({"ok": True, "phone_hash": p_hash})
        except Exception as ex:
            return web.json_response({"ok": False, "error": str(ex)})

    async def api_auth_confirm_code(req):
        data = await req.json()
        uid = int(data.get("user_id", 0))
        phone = data.get("phone", "").strip()
        code = data.get("code", "").strip()
        try:
            res = await auth_confirm_code(uid, code)
            if res == "2fa":
                return web.json_response({"ok": True, "need_2fa": True})
            else:
                db_save_session(phone, res, uid)
                acc = db_get_account(phone)
                await db_reward_referrer_if_eligible(bot, uid)
                return web.json_response({"ok": True, "need_2fa": False, "account": acc})
        except Exception as ex:
            return web.json_response({"ok": False, "error": str(ex)})

    async def api_auth_confirm_2fa(req):
        data = await req.json()
        uid = int(data.get("user_id", 0))
        phone = data.get("phone", "").strip()
        password = data.get("password", "").strip()
        try:
            res = await auth_confirm_2fa(uid, password)
            db_save_session(phone, res, uid)
            acc = db_get_account(phone)
            await db_reward_referrer_if_eligible(bot, uid)
            return web.json_response({"ok": True, "account": acc})
        except Exception as ex:
            return web.json_response({"ok": False, "error": str(ex)})

    async def api_auth_add_session(req):
        data = await req.json()
        uid = int(data.get("user_id", 0))
        sess = data.get("session", "").strip()
        db_set_user_funnel(uid, "clicked_add_acc")
        try:
            res = await add_account_from_session_string(sess, uid)
            acc = db_get_account(res["phone"])
            await db_reward_referrer_if_eligible(bot, uid)
            return web.json_response({"ok": True, "account": acc})
        except Exception as ex:
            return web.json_response({"ok": False, "error": str(ex)})

    async def api_get_tasks(req):
        uid = int(req.query.get("user_id", 0))
        tasks = db_get_user_tasks(uid)
        for t in tasks:
            t["chats"] = db_get_pending_chats(t["id"])
        return web.json_response(tasks)

    async def api_create_task(req):
        data = await req.json()
        uid = int(data.get("user_id", 0))
        chats = data.get("chats", [])
        db_set_user_funnel(uid, "clicked_create_task")
        tid = db_create_task(
            uid,
            data.get("account_id", 0),
            data.get("target_accs", "all"),
            data.get("text", ""),
            chats,
            int(data.get("delay_min", 10)),
            int(data.get("delay_max", 30)),
            loop=bool(data.get("loop")),
            media=data.get("media"),
            auto_reply=1 if data.get("auto_reply") else 0,
            auto_reply_text=data.get("auto_reply_text", ""),
            auto_reply_mode=data.get("auto_reply_mode", "reply_latest")
        )
        task = db_get_task(tid)
        task["chats"] = chats
        return web.json_response(task)

    async def api_update_task(req):
        tid = int(req.match_info["id"])
        data = await req.json()
        uid = int(data.get("user_id", req.query.get("user_id", 0)))
        task = db_get_task(tid)
        if not task or (uid and task.get("user_id") != uid):
            return web.json_response({"error": "Forbidden or not found"}, status=403)
        with db_conn() as c:
            if "text" in data:
                c.execute("UPDATE tasks SET text=? WHERE id=?", (data["text"], tid))
            if "delay_min" in data:
                c.execute("UPDATE tasks SET delay_min=? WHERE id=?", (data["delay_min"], tid))
            if "delay_max" in data:
                c.execute("UPDATE tasks SET delay_max=? WHERE id=?", (data["delay_max"], tid))
            if "loop" in data:
                c.execute("UPDATE tasks SET loop=? WHERE id=?", (1 if data["loop"] else 0, tid))
            if "target_accs" in data:
                c.execute("UPDATE tasks SET target_accs=? WHERE id=?", (data["target_accs"], tid))
            if "auto_reply" in data:
                c.execute("UPDATE tasks SET auto_reply=? WHERE id=?", (1 if data["auto_reply"] else 0, tid))
            if "auto_reply_text" in data:
                c.execute("UPDATE tasks SET auto_reply_text=? WHERE id=?", (data["auto_reply_text"], tid))
            if "auto_reply_mode" in data:
                c.execute("UPDATE tasks SET auto_reply_mode=? WHERE id=?", (data["auto_reply_mode"], tid))
        task = db_get_task(tid)
        return web.json_response(task)

    async def api_start_task(req):
        tid = int(req.match_info["id"])
        uid = int(req.query.get("user_id", 0))
        task = db_get_task(tid)
        if not task:
            return web.json_response({"error": "Task not found"}, status=404)
        if uid and task.get("user_id") != uid:
            return web.json_response({"error": "Forbidden"}, status=403)
        if tid not in running_tasks:
            db_set_task_status(tid, "running")
            async def _done_cb(tid, sent, err, tot, st):
                pass
            t = asyncio.create_task(broadcast_multi(
                task["user_id"], tid, task["text"], task["media"],
                task["delay_min"], task["delay_max"], _done_cb
            ))
            running_tasks[tid] = t
        return web.json_response({"ok": True, "status": "running"})

    async def api_stop_task(req):
        tid = int(req.match_info["id"])
        uid = int(req.query.get("user_id", 0))
        task = db_get_task(tid)
        if not task:
            return web.json_response({"error": "Task not found"}, status=404)
        if uid and task.get("user_id") != uid:
            return web.json_response({"error": "Forbidden"}, status=403)
        if tid in running_tasks:
            running_tasks[tid].cancel()
            running_tasks.pop(tid, None)
        db_set_task_status(tid, "stopped")
        return web.json_response({"ok": True, "status": "stopped"})

    async def api_delete_task(req):
        tid = int(req.match_info["id"])
        uid = int(req.query.get("user_id", 0))
        task = db_get_task(tid)
        if not task:
            return web.json_response({"ok": True})
        if uid and task.get("user_id") != uid:
            return web.json_response({"error": "Forbidden"}, status=403)
        if tid in running_tasks:
            running_tasks[tid].cancel()
            running_tasks.pop(tid, None)
        with db_conn() as c:
            c.execute("DELETE FROM tasks WHERE id=?", (tid,))
            c.execute("DELETE FROM chats WHERE task_id=?", (tid,))
        return web.json_response({"ok": True})

    async def api_activate_sub(req):
        data = await req.json()
        uid = int(data.get("user_id", 0))
        plan = data.get("plan", "pro")
        days = int(data.get("days", 30))
        method = data.get("method", "manual")
        db_update_user_sub(uid, plan, days, method=method)
        u = db_get_or_create_user(uid)
        return web.json_response(u)

    async def api_cryptobot_invoice(req):
        data = await req.json()
        uid = int(data.get("user_id", 0))
        plan = data.get("plan", "pro")
        amount = float(data.get("amount_usd", 1.99))
        inv = await create_cryptobot_invoice(amount, f"Подписка {plan.upper()} для TG ID {uid}")
        if inv:
            return web.json_response({
                "ok": True,
                "invoice_url": inv.get("bot_invoice_url", inv.get("mini_app_invoice_url", inv.get("pay_url"))),
                "invoice_id": inv.get("invoice_id")
            })
        return web.json_response({"ok": False, "error": "CryptoBot unavailable"})

    app.router.add_get("/api/health", api_health)
    app.router.add_get("/api/user", api_get_user)
    app.router.add_post("/api/user/accept_terms", api_accept_terms)
    app.router.add_get("/api/referrals", api_get_referrals)
    app.router.add_get("/api/admin/stats", api_get_admin_stats)
    app.router.add_get("/api/accounts", api_get_accounts)
    app.router.add_delete("/api/accounts/{id}", api_delete_account)
    app.router.add_post("/api/auth/send_code", api_auth_send_code)
    app.router.add_post("/api/auth/confirm_code", api_auth_confirm_code)
    app.router.add_post("/api/auth/confirm_2fa", api_auth_confirm_2fa)
    app.router.add_post("/api/auth/add_session", api_auth_add_session)
    app.router.add_get("/api/tasks", api_get_tasks)
    app.router.add_post("/api/tasks", api_create_task)
    app.router.add_patch("/api/tasks/{id}", api_update_task)
    app.router.add_post("/api/tasks/{id}/start", api_start_task)
    app.router.add_post("/api/tasks/{id}/stop", api_stop_task)
    app.router.add_delete("/api/tasks/{id}", api_delete_task)
    app.router.add_post("/api/subscription/activate", api_activate_sub)
    app.router.add_post("/api/subscription/cryptobot_invoice", api_cryptobot_invoice)

# ─────────────────────────────────────────────────────
#  ТОЧКА ВХОДА
# ─────────────────────────────────────────────────────

async def main():
    db_init()
    log.info("БД готова")

    bot = TelegramClient(
        "data/manager_bot",
        API_ID,
        API_HASH,
        connection=connection.ConnectionTcpAbridged,
        device_model="Telegram Desktop",
        system_version="Windows 10",
        app_version="4.16.30",
        lang_code="ru"
    )

    api_app = web.Application(middlewares=[cors_middleware])
    init_api_routes(api_app, bot)
    web_port = int(os.environ.get("PORT", os.environ.get("WEB_PORT", "3000")))
    runner = web.AppRunner(api_app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", web_port)
    await site.start()
    log.info(f"API сервер запущен на http://0.0.0.0:{web_port} ✅")

    try:
        await bot.start(bot_token=BOT_TOKEN)
        log.info("Бот рассылки и управления запущен ✅")
        register_handlers(bot)
    except Exception as ex:
        log.warning(f"Не удалось запустить Telegram bot клиент ({ex}). API сервер продолжает работу.")

    asyncio.create_task(_auth_sessions_gc_loop())
    await bot.run_until_disconnected()

if __name__ == "__main__":
    asyncio.run(main())
