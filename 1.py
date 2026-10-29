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

from telethon import TelegramClient, events, connection, types, functions
from telethon.sessions import StringSession
from telethon.tl.custom import Button
from telethon.tl.types import InputMediaInvoice, Invoice
from telethon.errors import (
    FloodWaitError, ChatWriteForbiddenError,
    SlowModeWaitError, PeerFloodError,
    UserBannedInChannelError, UserDeactivatedBanError,
    SessionPasswordNeededError, PhoneCodeInvalidError, PhoneCodeExpiredError,
    SendCodeUnavailableError, PhoneNumberBannedError, ApiIdInvalidError
)

# ─────────────────────────────────────────────────────
#  НАСТРОЙКИ
# ─────────────────────────────────────────────────────

API_ID           = int(os.environ.get("API_ID", "30973996"))
API_HASH         = os.environ.get("API_HASH", "dc58ef881ea53b1faafcf6ad974306a7")

BOT_TOKEN        = os.environ.get("BOT_TOKEN", "8345869119:AAGFhcUORebKHj0TeABn_3ZcZIi_BwQr6SE")
ADMIN_IDS        = [int(x.strip()) for x in os.environ.get("ADMIN_IDS", "7459502130, 8658384308").split(",") if x.strip()]

# Ключ CryptoBot
CRYPTO_BOT_TOKEN = os.environ.get("CRYPTO_BOT_TOKEN", "662370:AARfAYc3i7xelw6VdEomWOY043wF8cQ4wGb")

AUTH_SESSION_TTL = 600

# Тарифные планы
SUBSCRIPTION_PLANS = {
    "free": {
        "name": "Free (Старт)",
        "max_accounts": 1,
        "daily_limit": 500,
        "min_delay": 10,
        "price_stars": 0,
        "price_usd": 0.0
    },
    "pro": {
        "name": "Pro",
        "max_accounts": 5,
        "daily_limit": 5000,
        "min_delay": 5,
        "price_stars": 69,
        "price_usd": 1.99
    },
    "premium": {
        "name": "Premium+",
        "max_accounts": 15,
        "daily_limit": 10000,
        "min_delay": 1,
        "price_stars": 159,
        "price_usd": 4.49
    }
}

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
                user_id           INTEGER PRIMARY KEY,
                sub_plan          TEXT DEFAULT 'free',
                sub_expires_at    INTEGER DEFAULT 0,
                daily_sent        INTEGER DEFAULT 0,
                last_sent_date    TEXT DEFAULT '',
                free_limit_used   INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS accounts (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id  INTEGER DEFAULT 0,
                phone    TEXT UNIQUE NOT NULL,
                session  TEXT,
                status   TEXT DEFAULT 'pending'
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER DEFAULT 0,
                account_id INTEGER DEFAULT 0,
                target_accs TEXT DEFAULT 'all',
                text       TEXT NOT NULL,
                delay_min  INTEGER DEFAULT 10,
                delay_max  INTEGER DEFAULT 30,
                status     TEXT DEFAULT 'stopped',
                sent       INTEGER DEFAULT 0,
                errors     INTEGER DEFAULT 0,
                loop       INTEGER DEFAULT 0,
                media      TEXT DEFAULT NULL
            );
            CREATE TABLE IF NOT EXISTS chats (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id  INTEGER,
                chat_id  INTEGER,
                username TEXT,
                title    TEXT,
                status   TEXT DEFAULT 'pending'
            );
        """)

        # ── МИГРАЦИИ ДЛЯ СУЩЕСТВУЮЩЕЙ БАЗЫ ──
        acc_cols = [r[1] for r in c.execute("PRAGMA table_info(accounts)").fetchall()]
        if "user_id" not in acc_cols:
            c.execute("ALTER TABLE accounts ADD COLUMN user_id INTEGER DEFAULT 0")

        task_cols = [r[1] for r in c.execute("PRAGMA table_info(tasks)").fetchall()]
        if "user_id" not in task_cols:
            c.execute("ALTER TABLE tasks ADD COLUMN user_id INTEGER DEFAULT 0")
        if "target_accs" not in task_cols:
            c.execute("ALTER TABLE tasks ADD COLUMN target_accs TEXT DEFAULT 'all'")

def db_get_or_create_user(user_id: int):
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        u = c.execute("SELECT * FROM users WHERE user_id=?", (user_id,)).fetchone()
        if not u:
            c.execute("INSERT INTO users (user_id, sub_plan, sub_expires_at, free_limit_used) VALUES (?, 'free', 0, 0)", (user_id,))
            u = c.execute("SELECT * FROM users WHERE user_id=?", (user_id,)).fetchone()
        return dict(u)

def db_get_all_users():
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        return [dict(r) for r in c.execute("SELECT * FROM users ORDER BY user_id").fetchall()]

def db_update_user_sub(user_id: int, plan: str, duration_days: int = 30):
    expires_at = int(time.time()) + (duration_days * 86400) if duration_days > 0 else 0
    with db_conn() as c:
        c.execute("UPDATE users SET sub_plan=?, sub_expires_at=? WHERE user_id=?", (plan, expires_at, user_id))

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

    plan = SUBSCRIPTION_PLANS.get(plan_key, SUBSCRIPTION_PLANS["free"])

    if plan_key == "free":
        if u["free_limit_used"] >= plan["daily_limit"]:
            return False, "⚠️ Вы израсходовали лимит бесплатного пакета (500 сообщений). Приобретите подписку Pro или Premium+!", plan
    else:
        if u["daily_sent"] >= plan["daily_limit"]:
            return False, f"⚠️ Достигнут дневной лимит отправки для тарифа {plan['name']} ({plan['daily_limit']} сообщений/день).", plan

    return True, "", plan

def db_inc_user_sent(user_id: int):
    u = db_get_or_create_user(user_id)
    with db_conn() as c:
        if u["sub_plan"] == "free":
            c.execute("UPDATE users SET daily_sent=daily_sent+1, free_limit_used=free_limit_used+1 WHERE user_id=?", (user_id,))
        else:
            c.execute("UPDATE users SET daily_sent=daily_sent+1 WHERE user_id=?", (user_id,))

def db_add_account(phone: str, user_id: int = 0):
    with db_conn() as c:
        c.execute("INSERT OR IGNORE INTO accounts (phone, user_id) VALUES (?, ?)", (phone, user_id))

def db_save_session(phone: str, session_str: str, user_id: int = 0):
    with db_conn() as c:
        c.execute("UPDATE accounts SET session=?, status='active', user_id=? WHERE phone=?", (session_str, user_id, phone))

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
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        return [dict(r) for r in c.execute("SELECT * FROM accounts WHERE user_id=? ORDER BY id", (user_id,)).fetchall()]

def db_delete_account(phone: str, user_id: int):
    with db_conn() as c:
        c.execute("DELETE FROM accounts WHERE phone=? AND user_id=?", (phone, user_id))

def db_create_task(user_id: int, account_id: int, target_accs: str, text: str, chats: list, delay_min: int, delay_max: int, loop=False, media=None):
    with db_conn() as c:
        cur = c.execute(
            "INSERT INTO tasks (user_id, account_id, target_accs, text, delay_min, delay_max, loop, media) VALUES (?,?,?,?,?,?,?,?)",
            (user_id, account_id, target_accs, text, delay_min, delay_max, 1 if loop else 0, media)
        )
        task_id = cur.lastrowid
        for ch in chats:
            c.execute(
                "INSERT INTO chats (task_id, chat_id, username, title) VALUES (?,?,?,?)",
                (task_id, ch.get("id", 0), ch.get("username",""), ch.get("title",""))
            )
        return task_id

def db_get_task(task_id: int):
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        r = c.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
        return dict(r) if r else None

def db_get_user_tasks(user_id: int):
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        return [dict(r) for r in c.execute("SELECT * FROM tasks WHERE user_id=? ORDER BY id DESC", (user_id,)).fetchall()]

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

# ─────────────────────────────────────────────────────
#  CRYPTO BOT API INTEGRATION
# ─────────────────────────────────────────────────────

async def create_cryptobot_invoice(amount_usd: float, description: str) -> dict:
    """Создание инвойса в CryptoBot API (USDT)"""
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
    """Проверка статуса оплаты инвойса в CryptoBot API"""
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
#  USER-КЛИЕНТЫ И АВТОРИЗАЦИЯ (ИЗ СКТРИПТА 1_2.PY)
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

async def _send_one(client, target, text, media):
    if media and os.path.exists(media):
        await client.send_file(target, media, caption=text)
    else:
        await client.send_message(target, text)

async def broadcast_multi(user_id: int, task_id: int, text: str, media, delay_min: int, delay_max: int, done_cb):
    """Автоматическая мультиаккаунт-рассылка с точным считыванием отправленных сообщений."""
    total_sent = 0
    total_errors = 0

    try:
        task = db_get_task(task_id)
        if not task: return

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
                try:
                    await _send_one(client, target, text, media)
                    total_sent += 1
                    db_inc_sent(task_id)
                    db_inc_user_sent(user_id)
                    db_mark_chat_done(chat["id"])
                    log.info(f"[{task_id}] ✅ [{acc['phone']}] {i+1}/{total} → {target}")
                except FloodWaitError as e:
                    log.warning(f"[{task_id}] FloodWait {e.seconds}s на аккаунте {acc['phone']}")
                    await asyncio.sleep(e.seconds + 2)
                    try:
                        await _send_one(client, target, text, media)
                        total_sent += 1
                        db_inc_sent(task_id)
                        db_inc_user_sent(user_id)
                        db_mark_chat_done(chat["id"])
                    except Exception:
                        total_errors += 1
                        db_inc_errors(task_id)
                except PeerFloodError:
                    log.error(f"[{task_id}] ⛔ PeerFlood на {acc['phone']}")
                    total_errors += 1
                    db_inc_errors(task_id)
                except UserDeactivatedBanError:
                    log.error(f"[{task_id}] ⛔ Аккаунт {acc['phone']} заблокирован")
                    total_errors += 1
                    db_inc_errors(task_id)
                except (ChatWriteForbiddenError, UserBannedInChannelError) as e:
                    total_errors += 1
                    db_inc_errors(task_id)
                    log.warning(f"[{task_id}] ⚠️ {target}: {e}")
                except SlowModeWaitError as e:
                    await asyncio.sleep(e.seconds + 2)
                    try:
                        await _send_one(client, target, text, media)
                        total_sent += 1
                        db_inc_sent(task_id)
                        db_inc_user_sent(user_id)
                        db_mark_chat_done(chat["id"])
                    except Exception:
                        total_errors += 1
                        db_inc_errors(task_id)
                except Exception as e:
                    total_errors += 1
                    db_inc_errors(task_id)
                    log.error(f"[{task_id}] ❌ {target}: {e}")

                if i < total - 1 and task_id in running_tasks:
                    await asyncio.sleep(random.randint(delay_min, delay_max))

            task = db_get_task(task_id)
            if not task or not task["loop"]:
                break

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
#  КНОПКИ И КЛАВИАТУРЫ
# ─────────────────────────────────────────────────────

def main_menu_keyboard(user_id: int):
    kb = [
        [Button.inline("👤 Мой Профиль", b"menu_profile"), Button.inline("⭐ Подписки / Оплата", b"menu_sub")],
        [Button.inline("📱 Мои аккаунты", b"menu_accounts"), Button.inline("📨 Мои задачи", b"menu_tasks")],
        [Button.inline("➕ Добавить аккаунт", b"add_account"), Button.inline("📁 По session", b"add_account_session")],
        [Button.inline("➕ Создать задачу", b"new_task"), Button.inline("ℹ️ Помощь & Инфо", b"menu_help")]
    ]
    if user_id in ADMIN_IDS:
        kb.append([Button.inline("👑 Админ-панель", b"admin_menu")])
    return kb

def cancel_keyboard():
    return [[Button.inline("❌ Отмена", b"cancel_fsm")]]

def code_input_keyboard():
    return [
        [Button.inline("📩 Отправить через SMS", b"resend_sms")],
        [Button.inline("❌ Отмена", b"cancel_fsm")]
    ]

def accounts_keyboard(user_id: int):
    accs = db_get_user_accounts(user_id)
    buttons = []
    for a in accs:
        buttons.append([
            Button.inline(f"📱 {a['phone']} (ID: {a['id']})", f"view_acc_{a['id']}".encode()),
            Button.inline("❌ Удалить", f"del_acc_{a['id']}".encode())
        ])
    buttons.append([
        Button.inline("➕ Добавить аккаунт", b"add_account"),
        Button.inline("📁 По session", b"add_account_session")
    ])
    buttons.append([Button.inline("🔙 Главное меню", b"main_menu")])
    return buttons

def tasks_keyboard(user_id: int):
    tasks = db_get_user_tasks(user_id)
    buttons = []
    icons = {"running":"🔄","done":"✅","stopped":"⏹","stopped_flood":"⛔","account_banned":"🚫","limit_reached":"⚠️"}
    for t in tasks:
        icon = icons.get(t["status"], "❓")
        loop_icon = "🔁 " if t.get("loop") else ""
        media_icon = "📷 " if t.get("media") else ""
        buttons.append([
            Button.inline(
                f"{loop_icon}{media_icon}{icon} Задача #{t['id']} (✅{t['sent']} ❌{t['errors']})",
                f"task_detail_{t['id']}".encode()
            )
        ])
    buttons.append([Button.inline("➕ Создать задачу", b"new_task")])
    buttons.append([Button.inline("🔙 Главное меню", b"main_menu")])
    return buttons

def task_action_keyboard(task_id: int):
    task = db_get_task(task_id)
    is_running = task_id in running_tasks
    is_loop = bool(task and task["loop"])
    buttons = []
    if is_running:
        buttons.append([Button.inline("⏹ Остановить", f"stop_task_{task_id}".encode())])
    else:
        buttons.append([Button.inline("▶️ Запустить", f"start_task_{task_id}".encode())])
    buttons.append([
        Button.inline(
            ("🔁 Режим: бесконечно" if is_loop else "1️⃣ Режим: один раз"),
            f"toggle_loop_{task_id}".encode()
        )
    ])
    buttons.append([
        Button.inline("🔄 Обновить", f"task_detail_{task_id}".encode()),
        Button.inline("🔙 К задачам", b"menu_tasks")
    ])
    return buttons

def sub_keyboard():
    return [
        [Button.inline("🚀 Pro (69 ⭐ / $1.99)", b"buy_pro_stars"), Button.inline("💎 Premium+ (159 ⭐ / $4.49)", b"buy_premium_stars")],
        [Button.inline("🤖 Оплатить через CryptoBot (USDT)", b"buy_crypto")],
        [Button.inline("🔙 Главное меню", b"main_menu")]
    ]

def admin_keyboard():
    return [
        [Button.inline("🎁 Выдать подписку пользователю", b"admin_give_sub")],
        [Button.inline("👥 Список пользователей", b"admin_users_list")],
        [Button.inline("🔙 Главное меню", b"main_menu")]
    ]

def profile_text(user_id: int) -> str:
    u = db_get_or_create_user(user_id)
    plan_key = u["sub_plan"]
    plan = SUBSCRIPTION_PLANS.get(plan_key, SUBSCRIPTION_PLANS["free"])
    accs = db_get_user_accounts(user_id)
    tasks = db_get_user_tasks(user_id)

    expires_str = "♾️ Навсегда (Free)"
    if u["sub_expires_at"] > 0:
        rem_sec = u["sub_expires_at"] - int(time.time())
        if rem_sec > 0:
            days = rem_sec // 86400
            hours = (rem_sec % 86400) // 3600
            expires_str = f"⏳ `{days}д {hours}ч`"
        else:
            expires_str = "❌ Истекла"

    sent_today = u["free_limit_used"] if plan_key == "free" else u["daily_sent"]
    limit_str = f"{sent_today} / {plan['daily_limit']}"

    return (
        f"👤 **ЛИЧНЫЙ КАБИНЕТ**\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"🆔 **Ваш ID:** `{user_id}`\n\n"
        f"⭐ **Подписка:** `{plan['name']}`\n"
        f"⏱ **Срок действия:** {expires_str}\n"
        f"📊 **Отправлено сегодня:** `{limit_str}`\n\n"
        f"📱 **Подключено аккаунтов:** `{len(accs)} / {plan['max_accounts']}`\n"
        f"⚡ **Мин. задержка:** `{plan['min_delay']} сек`\n"
        f"📨 **Всего задач:** `{len(tasks)}`"
    )

def task_detail_text(task: dict) -> str:
    target = task.get("target_accs", "all")
    if target == "all":
        acc_str = "🌐 Все аккаунты"
    else:
        acc_str = f"📱 ID: {target}"
    live = task["id"] in running_tasks
    media_str = "📷 Прикреплено" if task.get("media") else "❌ Отсутствует"
    return (
        f"📊 **ИНФОРМАЦИЯ О ЗАДАЧЕ #{task['id']}**\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"📱 **Целевые аккаунты:** `{acc_str}`\n"
        f"📌 **Статус:** `{task['status']}`\n"
        f"🔁 **Режим:** {'Бесконечный' if task['loop'] else 'Одиночный'}\n"
        f"🖼 **Медиа:** {media_str}\n\n"
        f"📈 **Отправлено:** `{task['sent']}` | ❌ **Ошибок:** `{task['errors']}`\n"
        f"⏱ **Интервал:** `{task['delay_min']}–{task['delay_max']} сек`\n"
        f"🟢 **Запущена:** {'Да' if live else 'Нет'}\n\n"
        f"📝 **Текст рассылки:**\n_{task['text'][:150]}..._"
    )

# ─────────────────────────────────────────────────────
#  ХЕНДЛЕРЫ И FSM
# ─────────────────────────────────────────────────────

WELCOME_TEXT = """
👋 **ДОБРО ПОЖАЛОВАТЬ В TG BROADCASTER!**
━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 ** TG Broadcaster** — мощный автоматизированный инструмент для ведения безопасных рассылок в Telegram.

✨ **ОСНОВНЫЕ ВОЗМОЖНОСТИ:**
• 📱 **Мультиаккаунты** — рассылка сразу с нескольких аккаунтов.
• 🖼 **Поддержка медиа** — отправка текста с фотографиями.
• 🔁 **Бесконечный цикл** — авто-повтор рассылки по кругу.
• ⚡ **Умные задержки** — защита от спам-блоков.

👇 *Воспользуйтесь меню ниже для управления:*
"""

HELP_TEXT = """
ℹ️ **СПРАВОЧНОЕ РУКОВОДСТВО**
━━━━━━━━━━━━━━━━━━━━━━━━━

📌 **ПОЛЬЗОВАТЕЛЬСКИЕ КОМАНДЫ:**
• `/start` — Главное меню
• `/profile` — Личный кабинет и статистика
• `/accs` — Управление подключенными аккаунтами
• `/tasks` — Просмотр и запуск задач
• `/sub` — Приобретение тарифных планов

💎 **ТАРИФНЫЕ ПЛАНЫ И ЛИМИТЫ:**
1️⃣ **Free (Стартовый):** 500 сообщений (всего), 1 аккаунт, мин. задержка 10с.
2️⃣ **Pro (69 Звёзд / $1.99):** 5.000 сообщений/день, до 5 аккаунтов, мин. задержка от 5с.
3️⃣ **Premium+ (159 Звёзд / $4.49):** 10.000 сообщений/день, до 15 аккаунтов, мин. задержка от 1с.
"""

def register_handlers(bot: TelegramClient):

    @bot.on(events.NewMessage(pattern=r"^/start"))
    async def start_cmd(e):
        states.pop(e.sender_id, None)
        db_get_or_create_user(e.sender_id)
        await e.respond(WELCOME_TEXT, buttons=main_menu_keyboard(e.sender_id))

    # Обработка оплаты Telegram Stars
    @bot.on(events.Raw(types.UpdateNewPreCheckoutQuery))
    async def pre_checkout_handler(event):
        await bot(functions.messages.SetBotPrecheckoutResultsRequest(
            user_id=event.user_id,
            query_id=event.query_id,
            success=True
        ))

    @bot.on(events.Raw(types.UpdateMessageService))
    async def service_message_handler(event):
        if hasattr(event.message, 'action') and isinstance(event.message.action, types.MessageActionPaymentSentMe):
            payment = event.message.action
            payload = payment.payload.decode('utf-8') if isinstance(payment.payload, bytes) else str(payment.payload)
            parts = payload.split("_")
            if len(parts) >= 3 and parts[0] == "sub":
                plan_name = parts[1]
                user_id = int(parts[2])
                db_update_user_sub(user_id, plan_name, 30)
                try:
                    await bot.send_message(user_id, f"🎉 **Подписка {plan_name.upper()} успешно оплачена через Telegram Stars и активирована на 30 дней!**", buttons=main_menu_keyboard(user_id))
                except Exception as ex:
                    log.error(f"Error notifying payment: {ex}")

    @bot.on(events.NewMessage(pattern=r"^/profile"))
    async def profile_cmd(e):
        states.pop(e.sender_id, None)
        await e.respond(profile_text(e.sender_id), buttons=[[Button.inline("🔙 Главное меню", b"main_menu")]])

    @bot.on(events.NewMessage(pattern=r"^/(accs|accounts)"))
    async def accs_cmd(e):
        states.pop(e.sender_id, None)
        await e.respond("📱 **Управление аккаунтами:**", buttons=accounts_keyboard(e.sender_id))

    @bot.on(events.NewMessage(pattern=r"^/tasks"))
    async def tasks_cmd(e):
        states.pop(e.sender_id, None)
        await e.respond("📨 **Управление задачами:**", buttons=tasks_keyboard(e.sender_id))

    @bot.on(events.NewMessage(pattern=r"^/(sub|subscribe)"))
    async def sub_cmd(e):
        states.pop(e.sender_id, None)
        await e.respond("⭐ **Выберите подходящий тариф подписки:**", buttons=sub_keyboard())

    @bot.on(events.NewMessage(pattern=r"^/help"))
    async def help_cmd(e):
        states.pop(e.sender_id, None)
        await e.respond(HELP_TEXT, buttons=[[Button.inline("🔙 Главное меню", b"main_menu")]])

    # ── АДМИН КОМАНДЫ ──
    @bot.on(events.NewMessage(pattern=r"^/admin"))
    async def admin_cmd(e):
        if e.sender_id not in ADMIN_IDS: return
        states.pop(e.sender_id, None)
        await e.respond("👑 **Панель Администратора:**", buttons=admin_keyboard())

    @bot.on(events.NewMessage(pattern=r"^/give_sub\s+(\d+)\s+(pro|premium|free)\s*(\d+)?"))
    async def give_sub_cmd(e):
        if e.sender_id not in ADMIN_IDS: return
        target_uid = int(e.pattern_match.group(1))
        plan = e.pattern_match.group(2).lower()
        days = int(e.pattern_match.group(3) or 30)

        db_update_user_sub(target_uid, plan, days)
        await e.respond(f"✅ Пользователю `{target_uid}` выдана подписка **{plan.upper()}** на {days} дней!")
        try:
            await bot.send_message(target_uid, f"🎉 **Вам активирована подписка {plan.upper()} на {days} дней!**")
        except Exception:
            pass

    # ── CALLBACK BUTTONS ──
    @bot.on(events.CallbackQuery())
    async def callback_handler(e):
        uid = e.sender_id
        data = e.data.decode("utf-8")
        await e.answer()

        if data == "main_menu":
            states.pop(uid, None)
            await e.edit(WELCOME_TEXT, buttons=main_menu_keyboard(uid))

        elif data == "menu_profile":
            await e.edit(profile_text(uid), buttons=[[Button.inline("💳 Сменить тариф", b"menu_sub"), Button.inline("🔙 Главное меню", b"main_menu")]])

        elif data == "menu_sub":
            await e.edit("⭐ **Выберите тариф для оформления подписки:**", buttons=sub_keyboard())

        elif data == "menu_help":
            await e.edit(HELP_TEXT, buttons=[[Button.inline("🔙 Главное меню", b"main_menu")]])

        elif data == "cancel_fsm":
            await cancel_auth(uid)
            states.pop(uid, None)
            await e.edit("❌ **Действие отменено.**", buttons=main_menu_keyboard(uid))

        elif data == "add_account_session":
            u = db_get_or_create_user(uid)
            plan = SUBSCRIPTION_PLANS.get(u["sub_plan"], SUBSCRIPTION_PLANS["free"])
            accs = db_get_user_accounts(uid)

            if len(accs) >= plan["max_accounts"]:
                await e.answer(f"⚠️ На вашем тарифе можно добавить не более {plan['max_accounts']} аккаунтов!", alert=True)
                return

            states[uid] = {"state": "session_string"}
            await e.edit(
                "📁 **Добавление аккаунта по готовой session**\n\n"
                "Пришлите **либо текстом**, либо **файлом (.session / .txt)** "
                "строку StringSession (Telethon).",
                buttons=cancel_keyboard()
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
                    buttons=[[Button.inline("❌ Удалить", f"del_acc_{acc['id']}".encode())], [Button.inline("🔙 Назад", b"menu_accounts")]]
                )

        # ── АДМИН-ПАНЕЛЬ ──
        elif data == "admin_menu":
            if uid not in ADMIN_IDS: return
            await e.edit("👑 **Панель Администратора:**", buttons=admin_keyboard())

        elif data == "admin_users_list":
            if uid not in ADMIN_IDS: return
            users = db_get_all_users()
            msg = f"👥 **Пользователи в БД:** `{len(users)}`\n━━━━━━━━━━━━━━━━━━━\n"
            for u in users[:15]:
                msg += f"• ID: `{u['user_id']}` | План: `{u['sub_plan']}`\n"
            await e.edit(msg, buttons=[[Button.inline("🔙 Назад", b"admin_menu")]])

        elif data == "admin_give_sub":
            if uid not in ADMIN_IDS: return
            states[uid] = {"state": "admin_input_sub"}
            await e.edit(
                "✍️ **Выдача подписки**\n\n"
                "Введите данные в формате:\n`<user_id> <pro/premium> <дни>`\n\n"
                "Пример: `7459502130 pro 30`",
                buttons=cancel_keyboard()
            )

        # ── CRYPTOBOT ──
        elif data == "buy_crypto":
            buttons = [
                [Button.inline("🚀 Pro ($1.99 USDT)", b"pay_crypto_pro")],
                [Button.inline("💎 Premium+ ($4.49 USDT)", b"pay_crypto_premium")],
                [Button.inline("🔙 Отмена", b"menu_sub")]
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
                    [Button.inline("✅ Я оплатил", f"check_crypto_{plan_name}_{inv_id}".encode())],
                    [Button.inline("🔙 Назад", b"buy_crypto")]
                ]
                await e.edit(
                    f"🤖 **Счёт #{inv_id} на оплату тарифа {plan['name']}**\n"
                    f"━━━━━━━━━━━━━━━━━━━\n"
                    f"💰 Сумма: **{plan['price_usd']} USDT**\n\n"
                    f"Нажмите кнопку ниже для перехода к оплате:",
                    buttons=buttons
                )
            else:
                await e.edit("⚠️ Ошибка генерации счета. Проверьте правильность токена CryptoBot.", buttons=[[Button.inline("🔙 Назад", b"buy_crypto")]])

        elif data.startswith("check_crypto_"):
            parts = data.split("_")
            if len(parts) >= 4:
                plan_name = parts[2]
                inv_id = int(parts[3])

                is_paid = await check_cryptobot_invoice(inv_id)
                if is_paid:
                    db_update_user_sub(uid, plan_name, 30)
                    await e.edit(f"🎉 **Подписка {plan_name.upper()} успешно оплачена и активирована на 30 дней!**", buttons=main_menu_keyboard(uid))
                else:
                    await e.answer("❌ Счет ещё не был оплачен в CryptoBot! Оплатите чек и попробуйте снова.", alert=True)
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
                payload=f"sub_{plan_name}_{uid}".encode()
            )
            try:
                await bot.send_message(uid, f"⭐ **Счёт на оплату {plan['name']} ({plan['price_stars']} Telegram Stars):**", file=invoice)
                await e.answer("📩 Счёт на оплату Stars отправлен сообщением!")
            except Exception as ex:
                log.error(f"Stars invoice error: {ex}")
                await e.answer(f"Ошибка выявления счета Telegram Stars: {ex}", alert=True)

        elif data == "menu_accounts":
            states.pop(uid, None)
            accs = db_get_user_accounts(uid)
            if not accs:
                await e.edit(
                    "📱 **У вас пока нет подключенных аккаунтов.**",
                    buttons=[
                        [Button.inline("➕ Добавить аккаунт", b"add_account")],
                        [Button.inline("🔙 Главное меню", b"main_menu")]
                    ]
                )
            else:
                await e.edit("📱 **Список ваших аккаунтов:**", buttons=accounts_keyboard(uid))

        elif data == "add_account":
            u = db_get_or_create_user(uid)
            plan = SUBSCRIPTION_PLANS.get(u["sub_plan"], SUBSCRIPTION_PLANS["free"])
            accs = db_get_user_accounts(uid)

            if len(accs) >= plan["max_accounts"]:
                await e.answer(f"⚠️ На тарифном плане {plan['name']} можно добавить не более {plan['max_accounts']} аккаунтов!", alert=True)
                return

            states[uid] = {"state": "phone"}
            await e.edit(
                "📱 **Подключение аккаунта**\n\n"
                "Введите номер телефона в международном формате:\n"
                "Пример: `+79001234567`",
                buttons=cancel_keyboard()
            )

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

        elif data == "menu_tasks":
            states.pop(uid, None)
            tasks = db_get_user_tasks(uid)
            if not tasks:
                await e.edit(
                    "📨 **У вас пока нет созданных задач.**",
                    buttons=[
                        [Button.inline("➕ Создать задачу", b"new_task")],
                        [Button.inline("🔙 Главное меню", b"main_menu")]
                    ]
                )
            else:
                await e.edit("📨 **Список ваших задач:**", buttons=tasks_keyboard(uid))

        elif data.startswith("task_detail_"):
            task_id = int(data.split("_")[2])
            task = db_get_task(task_id)
            if not task or task["user_id"] != uid:
                await e.answer("Задача не найдена", alert=True)
                return
            await e.edit(task_detail_text(task), buttons=task_action_keyboard(task_id))

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

        elif data == "new_task":
            accs = [a for a in db_get_user_accounts(uid) if a["status"] == "active"]
            if not accs:
                await e.answer("❌ Сначала подключите хотя бы один аккаунт!", alert=True)
                return

            buttons = [
                [Button.inline("🌐 Для ВСЕХ подключенных аккаунтов", b"sel_acc_all")]
            ]
            for a in accs:
                buttons.append([Button.inline(f"📱 {a['phone']} (ID: {a['id']})", f"sel_acc_single_{a['id']}".encode())])
            buttons.append([Button.inline("❌ Отмена", b"cancel_fsm")])

            await e.edit("🎯 **Выберите аккаунты для рассылки:**", buttons=buttons)

        elif data.startswith("sel_acc_"):
            target_accs = "all" if data == "sel_acc_all" else data.replace("sel_acc_single_", "")
            states[uid] = {"state": "task_text", "target_accs": target_accs}
            await e.edit("✍️ **Введите текст рекламного сообщения:**", buttons=cancel_keyboard())

        elif data == "skip_media":
            st = states.get(uid)
            if st and st.get("state") == "task_media":
                st["media"] = None
                st["state"] = "task_chats"
                await e.edit(
                    "📂 **Введите список чатов/получателей (каждый с новой строки):**\n\n"
                    "Пример:\n`@chat1`\n`@chat2`\n`https://t.me/group_name`",
                    buttons=cancel_keyboard()
                )

        elif data == "delay_default":
            st = states.get(uid)
            if not st or st.get("state") != "task_delay": return
            u = db_get_or_create_user(uid)
            plan = SUBSCRIPTION_PLANS.get(u["sub_plan"], SUBSCRIPTION_PLANS["free"])
            d_min = max(10, plan["min_delay"])

            task_id = db_create_task(
                uid, 0, st["target_accs"], st["text"], st["chats"], d_min, 30,
                loop=False, media=st.get("media")
            )
            states.pop(uid, None)
            await e.edit(
                f"✅ **Задача #{task_id} успешно создана!**\n\n"
                f"📊 Чатов: `{len(st['chats'])}`\n"
                f"📷 Медиа: `{'Есть' if st.get('media') else 'Нет'}`\n"
                f"⏱ Задержка: `{d_min}–30 сек`\n"
                f"🎯 Аккаунты: `{st['target_accs']}`",
                buttons=task_action_keyboard(task_id)
            )

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
                    f"✅ **Аккаунт добавлен из session!**\n\n"
                    f"📱 Телефон: `{info['phone']}`\n"
                    f"👤 Имя: {name}\n"
                    f"🆔 ID: `{info['user_id']}`",
                    buttons=main_menu_keyboard(uid)
                )
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
                db_update_user_sub(target_uid, plan, days)
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
                    f"📌 Откройте **официальное приложение Telegram** (чат *Telegram* с синей галочкой).\n"
                    f"Если код не приходит — нажмите **«📩 Отправить через SMS»** ниже.\n\n"
                    f"Введите полученный код:",
                    buttons=code_input_keyboard()
                )
            except ApiIdInvalidError:
                await msg.edit("❌ **Ошибка API_ID / API_HASH:**\nВведённые в боте ключи недействительны. Сгенерируйте новые ключи на **my.telegram.org**.", buttons=main_menu_keyboard(uid))
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
            except Exception as ex:
                await msg.edit(f"❌ Неверный пароль 2FA: `{ex}`", buttons=cancel_keyboard())

        elif step == "task_text":
            states[uid]["text"] = txt
            states[uid]["state"] = "task_media"
            await e.respond(
                "📷 **Прикрепите фото для рассылки** (или нажмите «Пропустить»)",
                buttons=[
                    [Button.inline("⏭ Пропустить", b"skip_media")],
                    [Button.inline("❌ Отмена", b"cancel_fsm")]
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
                f"⏱ Укажите диапазон задержки между отправками в секундах (мин макс):\n"
                f"⚠️ Минимальная задержка для вашего тарифа: `{plan['min_delay']} сек`\n"
                f"Пример: `15 45`",
                buttons=[
                    [Button.inline(f"⏱ По умолчанию (от {plan['min_delay']}с)", b"delay_default")],
                    [Button.inline("❌ Отмена", b"cancel_fsm")]
                ]
            )

        elif step == "task_delay":
            u = db_get_or_create_user(uid)
            plan = SUBSCRIPTION_PLANS.get(u["sub_plan"], SUBSCRIPTION_PLANS["free"])
            d_min, d_max = max(10, plan["min_delay"]), 30

            if txt:
                parts = txt.split()
                try:
                    user_dmin = int(parts[0])
                    if user_dmin < plan["min_delay"]:
                        await e.respond(f"⚠️ Минимальная задержка для вашего тарифа составляет {plan['min_delay']} сек.")
                        return
                    d_min = user_dmin
                    d_max = int(parts[1]) if len(parts) > 1 else d_min + 15
                except (ValueError, IndexError):
                    pass

            task_id = db_create_task(
                uid, 0, st["target_accs"], st["text"], st["chats"], d_min, d_max,
                loop=False, media=st.get("media")
            )
            states.pop(uid, None)
            await e.respond(
                f"✅ **Задача #{task_id} успешно создана!**\n\n"
                f"📊 Получателей: `{len(st['chats'])}`\n"
                f"📷 Медиа: `{'Есть' if st.get('media') else 'Нет'}`\n"
                f"⏱ Задержка: `{d_min}–{d_max} сек`\n"
                f"🎯 Аккаунты: `{st['target_accs']}`",
                buttons=task_action_keyboard(task_id)
            )

# ─────────────────────────────────────────────────────
#  ЗАПУСК
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
    await bot.start(bot_token=BOT_TOKEN)
    log.info("Бот рассылки и управления запущен ✅")
    register_handlers(bot)
    asyncio.create_task(_auth_sessions_gc_loop())
    await bot.run_until_disconnected()

if __name__ == "__main__":
    asyncio.run(main())
