"""
╔══════════════════════════════════════════════════════╗
║   TG BROADCASTER — Telethon (фото + бесконечный)     ║
║  Установка:  pip install telethon                    ║
║  Запуск:     python bot.py                           ║
╚══════════════════════════════════════════════════════╝
"""

import asyncio
import logging
import random
import re
import sqlite3
import os

from telethon import TelegramClient, events, connection
from telethon.sessions import StringSession
from telethon.tl.custom import Button
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

API_ID    = int(os.environ.get("API_ID", "30973996"))
API_HASH  = os.environ.get("API_HASH", "dc58ef881ea53b1faafcf6ad974306a7")

BOT_TOKEN = os.environ.get("BOT_TOKEN", "8345869119:AAGFhcUORebKHj0TeABn_3ZcZIi_BwQr6SE")
ADMIN_IDS = [int(x) for x in os.environ.get("ADMIN_IDS", "7459502130, 8658384308").split(",")]

AUTH_SESSION_TTL = 600

DELAY_MIN = 10
DELAY_MAX = 30

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
            CREATE TABLE IF NOT EXISTS accounts (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                phone    TEXT UNIQUE NOT NULL,
                session  TEXT,
                status   TEXT DEFAULT 'pending'
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER,
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
        # Миграции для старых БД
        cols = [r[1] for r in c.execute("PRAGMA table_info(tasks)").fetchall()]
        if "loop" not in cols:
            c.execute("ALTER TABLE tasks ADD COLUMN loop INTEGER DEFAULT 0")
        if "media" not in cols:
            c.execute("ALTER TABLE tasks ADD COLUMN media TEXT DEFAULT NULL")

def db_add_account(phone):
    with db_conn() as c:
        c.execute("INSERT OR IGNORE INTO accounts (phone) VALUES (?)", (phone,))

def db_save_session(phone, session_str):
    with db_conn() as c:
        c.execute("UPDATE accounts SET session=?, status='active' WHERE phone=?", (session_str, phone))

def db_get_account(phone):
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        r = c.execute("SELECT * FROM accounts WHERE phone=?", (phone,)).fetchone()
        return dict(r) if r else None

def db_get_account_by_id(acc_id: int):
    if not acc_id:
        return None
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        r = c.execute("SELECT * FROM accounts WHERE id=?", (acc_id,)).fetchone()
        return dict(r) if r else None

def db_get_all_accounts():
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        return [dict(r) for r in c.execute("SELECT * FROM accounts ORDER BY id").fetchall()]

def db_delete_account(phone):
    with db_conn() as c:
        c.execute("DELETE FROM accounts WHERE phone=?", (phone,))

def db_create_task(account_id, text, chats, delay_min, delay_max, loop=False, media=None):
    with db_conn() as c:
        cur = c.execute(
            "INSERT INTO tasks (account_id,text,delay_min,delay_max,loop,media) VALUES (?,?,?,?,?,?)",
            (account_id, text, delay_min, delay_max, 1 if loop else 0, media)
        )
        task_id = cur.lastrowid
        for ch in chats:
            c.execute(
                "INSERT INTO chats (task_id,chat_id,username,title) VALUES (?,?,?,?)",
                (task_id, ch.get("id", 0), ch.get("username",""), ch.get("title",""))
            )
        return task_id

def db_get_task(task_id):
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        r = c.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
        return dict(r) if r else None

def db_all_tasks():
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        return [dict(r) for r in c.execute("SELECT * FROM tasks ORDER BY id DESC").fetchall()]

def db_set_task_account(task_id: int, account_id: int):
    with db_conn() as c:
        c.execute("UPDATE tasks SET account_id=? WHERE id=?", (account_id, task_id))

def db_set_task_status(task_id, status):
    with db_conn() as c:
        c.execute("UPDATE tasks SET status=? WHERE id=?", (status, task_id))

def db_set_task_loop(task_id: int, loop: bool):
    with db_conn() as c:
        c.execute("UPDATE tasks SET loop=? WHERE id=?", (1 if loop else 0, task_id))

def db_inc_sent(task_id):
    with db_conn() as c:
        c.execute("UPDATE tasks SET sent=sent+1 WHERE id=?", (task_id,))

def db_inc_errors(task_id):
    with db_conn() as c:
        c.execute("UPDATE tasks SET errors=errors+1 WHERE id=?", (task_id,))

def db_get_pending_chats(task_id):
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        return [dict(r) for r in c.execute(
            "SELECT * FROM chats WHERE task_id=? AND status='pending'", (task_id,)
        ).fetchall()]

def db_get_all_chats(task_id):
    with db_conn() as c:
        c.row_factory = sqlite3.Row
        return [dict(r) for r in c.execute(
            "SELECT * FROM chats WHERE task_id=? ORDER BY id", (task_id,)
        ).fetchall()]

def db_mark_chat_done(chat_row_id):
    with db_conn() as c:
        c.execute("UPDATE chats SET status='done' WHERE id=?", (chat_row_id,))

def db_reset_chats(task_id):
    with db_conn() as c:
        c.execute("UPDATE chats SET status='pending' WHERE task_id=?", (task_id,))

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

async def add_account_from_session_string(session_str: str) -> dict:
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

    db_add_account(phone)
    db_save_session(phone, session_str)
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
            result.append({
                "id": int(clean_target),
                "username": "",
                "title": clean_target
            })
        else:
            result.append({
                "id": 0,
                "username": clean_target,
                "title": clean_target
            })
    return result

async def _send_one(client, target, text, media):
    """Отправляет одно сообщение — с фото (caption=text) или только текст."""
    if media and os.path.exists(media):
        await client.send_file(target, media, caption=text)
    else:
        await client.send_message(target, text)

async def broadcast(client: TelegramClient, task_id: int, text: str, media, delay_min: int, delay_max: int, done_cb):
    """Рассылка. Если у задачи loop=1 — крутится бесконечно до остановки."""
    total_sent = 0
    total_errors = 0

    try:
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
            sent = errors = 0

            for i, chat in enumerate(chats):
                if task_id not in running_tasks:
                    break

                target = chat.get("username") or chat["chat_id"]
                try:
                    await _send_one(client, target, text, media)
                    sent += 1
                    total_sent += 1
                    db_inc_sent(task_id)
                    db_mark_chat_done(chat["id"])
                    log.info(f"[{task_id}] ✅ {i+1}/{total} → {target}")
                except FloodWaitError as e:
                    log.warning(f"[{task_id}] FloodWait {e.seconds}s")
                    await asyncio.sleep(e.seconds + 5)
                    try:
                        await _send_one(client, target, text, media)
                        sent += 1
                        total_sent += 1
                        db_inc_sent(task_id)
                        db_mark_chat_done(chat["id"])
                    except Exception:
                        errors += 1
                        total_errors += 1
                        db_inc_errors(task_id)
                except PeerFloodError:
                    log.error(f"[{task_id}] ⛔ PeerFlood — останавливаем")
                    db_set_task_status(task_id, "stopped_flood")
                    running_tasks.pop(task_id, None)
                    await done_cb(task_id, total_sent, total_errors, total, "stopped_flood")
                    return
                except UserDeactivatedBanError:
                    log.error(f"[{task_id}] ⛔ Аккаунт заблокирован")
                    db_set_task_status(task_id, "account_banned")
                    running_tasks.pop(task_id, None)
                    await done_cb(task_id, total_sent, total_errors, total, "account_banned")
                    return
                except (ChatWriteForbiddenError, UserBannedInChannelError) as e:
                    errors += 1
                    total_errors += 1
                    db_inc_errors(task_id)
                    log.warning(f"[{task_id}] ⚠️ {target}: {e}")
                except SlowModeWaitError as e:
                    log.warning(f"[{task_id}] SlowModeWait {e.seconds}s")
                    await asyncio.sleep(e.seconds + 2)
                    try:
                        await _send_one(client, target, text, media)
                        sent += 1
                        total_sent += 1
                        db_inc_sent(task_id)
                        db_mark_chat_done(chat["id"])
                    except Exception:
                        errors += 1
                        total_errors += 1
                        db_inc_errors(task_id)
                except Exception as e:
                    errors += 1
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

def main_menu_keyboard():
    return [
        [Button.inline("➕ Добавить аккаунт", b"add_account")],
        [Button.inline("📁 Добавить по session", b"add_account_session")],
        [Button.inline("📱 Аккаунты", b"menu_accounts"), Button.inline("📨 Задачи", b"menu_tasks")],
        [Button.inline("➕ Создать задачу", b"new_task")],
        [Button.inline("ℹ️ Помощь", b"menu_help")]
    ]

def cancel_keyboard():
    return [[Button.inline("❌ Отмена", b"cancel_fsm")]]

def code_input_keyboard():
    return [
        [Button.inline("📩 Отправить через SMS", b"resend_sms")],
        [Button.inline("❌ Отмена", b"cancel_fsm")]
    ]

def accounts_keyboard():
    accs = db_get_all_accounts()
    buttons = []
    for a in accs:
        buttons.append([
            Button.inline(f"📱 {a['phone']}", f"view_acc_{a['id']}".encode()),
            Button.inline("❌ Удалить", f"del_acc_{a['id']}".encode())
        ])
    buttons.append([Button.inline("➕ Добавить аккаунт", b"add_account")])
    buttons.append([Button.inline("🔙 Главное меню", b"main_menu")])
    return buttons

def tasks_keyboard():
    tasks = db_all_tasks()
    buttons = []
    icons = {"running":"🔄","done":"✅","stopped":"⏹","stopped_flood":"⛔","account_banned":"🚫"}
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

def task_detail_text(task: dict) -> str:
    acc = db_get_account_by_id(task["account_id"])
    phone = acc["phone"] if acc else "Не привязан"
    live = task["id"] in running_tasks
    media_str = "📷 есть" if task.get("media") else "❌ нет"
    return (
        f"📊 **Задача #{task['id']}**\n\n"
        f"📱 Аккаунт: `{phone}`\n"
        f"Статус: `{task['status']}`\n"
        f"Режим: {'🔁 бесконечно' if task['loop'] else '1️⃣ один раз'}\n"
        f"Фото: {media_str}\n"
        f"Отправлено: `{task['sent']}`\n"
        f"Ошибок: `{task['errors']}`\n"
        f"Интервал: `{task['delay_min']}–{task['delay_max']} сек`\n"
        f"Активна: {'🟢 Да' if live else '🔴 Нет'}\n\n"
        f"💬 **Текст:**\n{task['text'][:150]}..."
    )

# ─────────────────────────────────────────────────────
#  ХЕНДЛЕРЫ И FSM
# ─────────────────────────────────────────────────────

HELP_TEXT = """
🤖 **TG Broadcaster Bot**

👥 Все администраторы из конфига (`ADMIN_IDS`) работают с **общими**
аккаунтами и задачами.

📱 **Управление аккаунтами:**
Нажмите **«➕ Добавить аккаунт»** и введите номер телефона,
или **«📁 Добавить по session»**, если уже есть готовая сессия.

📨 **Создание рассылки:**
1. Нажмите **«➕ Создать задачу»**.
2. Выберите аккаунт (или «без аккаунта»).
3. Введите рекламный текст.
4. Отправьте **фото** (или нажмите «⏭ Пропустить»).
5. Укажите список чатов/получателей.
6. Настройте задержки.
7. В карточке задачи переключите режим **🔁 бесконечно** (если нужно
   крутить по кругу до нажатия «Остановить»).
"""

def register_handlers(bot: TelegramClient):

    def is_admin(user_id):
        return user_id in ADMIN_IDS

    @bot.on(events.NewMessage(pattern=r"^/(start|help)"))
    async def start_cmd(e):
        if not is_admin(e.sender_id): return
        states.pop(e.sender_id, None)
        await e.respond(f"👋 Привет!\n{HELP_TEXT}", buttons=main_menu_keyboard())

    @bot.on(events.CallbackQuery())
    async def callback_handler(e):
        uid = e.sender_id
        if not is_admin(uid): return
        data = e.data.decode("utf-8")

        if data == "main_menu":
            states.pop(uid, None)
            await e.edit(f"👋 Главное меню:\n{HELP_TEXT}", buttons=main_menu_keyboard())

        elif data == "menu_help":
            await e.edit(HELP_TEXT, buttons=[[Button.inline("🔙 Назад", b"main_menu")]])

        elif data == "cancel_fsm":
            await cancel_auth(uid)
            states.pop(uid, None)
            await e.edit("❌ Действие отменено.", buttons=main_menu_keyboard())

        elif data == "resend_sms":
            try:
                await auth_resend_code_sms(uid)
                await e.answer("📩 Запрос отправки кода по SMS отправлен!", alert=True)
            except SendCodeUnavailableError:
                await e.answer("⏳ Telegram просит подождать около 60 сек перед повторным запросом SMS.", alert=True)
            except Exception as ex:
                await e.answer(f"Ошибка запроса SMS: {ex}", alert=True)

        elif data == "menu_accounts":
            states.pop(uid, None)
            accs = db_get_all_accounts()
            if not accs:
                await e.edit(
                    "📋 Аккаунтов пока нет. Вы можете добавить аккаунт сейчас!",
                    buttons=[
                        [Button.inline("➕ Добавить аккаунт", b"add_account")],
                        [Button.inline("🔙 Главное меню", b"main_menu")]
                    ]
                )
            else:
                await e.edit("📋 **Список подключенных аккаунтов:**", buttons=accounts_keyboard())

        elif data == "add_account":
            states[uid] = {"state": "phone"}
            await e.edit(
                "📱 **Добавление аккаунта**\n\n"
                "Введите номер телефона аккаунта в международном формате:\n"
                "Пример: `+79001234567`",
                buttons=cancel_keyboard()
            )

        elif data == "add_account_session":
            states[uid] = {"state": "session_string"}
            await e.edit(
                "📁 **Добавление аккаунта по готовой session**\n\n"
                "Пришлите **либо текстом**, либо **файлом (.session / .txt)** "
                "строку StringSession (Telethon).\n\n"
                "⚠️ Это файл с полным доступом к аккаунту — используйте только свои сессии.",
                buttons=cancel_keyboard()
            )

        elif data.startswith("del_acc_"):
            acc_id = int(data.split("_")[2])
            acc = db_get_account_by_id(acc_id)
            if acc:
                if acc["phone"] in active_clients:
                    client = active_clients.pop(acc["phone"])
                    try: await client.disconnect()
                    except Exception: pass
                db_delete_account(acc["phone"])
                await e.answer("✅ Аккаунт удален", alert=True)
            await e.edit("📋 **Список подключенных аккаунтов:**", buttons=accounts_keyboard())

        elif data == "menu_tasks":
            states.pop(uid, None)
            tasks = db_all_tasks()
            if not tasks:
                await e.edit(
                    "📋 Задач нет. Нажмите «➕ Создать задачу», чтобы настроить новую рассылку!",
                    buttons=[
                        [Button.inline("➕ Создать задачу", b"new_task")],
                        [Button.inline("🔙 Главное меню", b"main_menu")]
                    ]
                )
            else:
                await e.edit("📋 **Список задач:**", buttons=tasks_keyboard())

        elif data.startswith("task_detail_"):
            task_id = int(data.split("_")[2])
            task = db_get_task(task_id)
            if not task:
                await e.answer("Задача не найдена", alert=True)
                return
            await e.edit(task_detail_text(task), buttons=task_action_keyboard(task_id))

        elif data.startswith("toggle_loop_"):
            task_id = int(data.split("_")[2])
            task = db_get_task(task_id)
            if not task:
                await e.answer("Задача не найдена", alert=True)
                return
            new_val = not bool(task["loop"])
            db_set_task_loop(task_id, new_val)
            await e.answer(
                "🔁 Бесконечный режим включён" if new_val else "1️⃣ Одиночный режим",
                alert=True
            )
            task = db_get_task(task_id)
            await e.edit(task_detail_text(task), buttons=task_action_keyboard(task_id))

        elif data.startswith("start_task_"):
            task_id = int(data.split("_")[2])
            task = db_get_task(task_id)
            if not task:
                await e.answer("Задача не найдена", alert=True)
                return
            if task_id in running_tasks:
                await e.answer("Задача уже запущена!", alert=True)
                return

            acc = db_get_account_by_id(task["account_id"])
            if not acc:
                active_accs = [a for a in db_get_all_accounts() if a["status"] == "active"]
                if active_accs:
                    acc = active_accs[0]
                    db_set_task_account(task_id, acc["id"])
                else:
                    await e.answer("❌ Сначала добавьте активный аккаунт!", alert=True)
                    return

            try:
                client = await get_client(acc["phone"])
            except Exception as ex:
                await e.answer(f"Ошибка подключения аккаунта: {ex}", alert=True)
                return

            chats = db_get_pending_chats(task_id)
            if not chats:
                if task["loop"]:
                    db_reset_chats(task_id)
                    chats = db_get_pending_chats(task_id)
                if not chats:
                    await e.answer("Нет доступных чатов для рассылки!", alert=True)
                    return

            media = task.get("media")
            if media and not os.path.exists(media):
                await e.answer(f"⚠️ Файл фото не найден: {media}", alert=True)
                return

            db_set_task_status(task_id, "running")

            async def done_cb(tid, sent, errs, total, status):
                icons = {"done":"✅","stopped":"⏹","stopped_flood":"⛔","account_banned":"🚫"}
                text = (
                    f"{icons.get(status,'❓')} Задача `{tid}` завершена!\n"
                    f"Отправлено: {sent} | Ошибок: {errs}"
                )
                for admin_id in ADMIN_IDS:
                    try:
                        await bot.send_message(admin_id, text)
                    except Exception as ex:
                        log.warning(f"Не удалось отправить уведомление админу {admin_id}: {ex}")

            t = asyncio.create_task(
                broadcast(client, task_id, task["text"], media,
                          task["delay_min"], task["delay_max"], done_cb)
            )
            running_tasks[task_id] = t
            await e.answer("🚀 Задача запущена!")

            await e.edit(
                f"🚀 **Задача #{task_id} запущена!**\n"
                f"Режим: {'🔁 бесконечно' if task['loop'] else '1️⃣ один раз'}\n"
                f"Фото: {'📷 есть' if media else '❌ нет'}\n"
                f"Задержка: {task['delay_min']}–{task['delay_max']} сек",
                buttons=task_action_keyboard(task_id)
            )

        elif data.startswith("stop_task_"):
            task_id = int(data.split("_")[2])
            if task_id in running_tasks:
                task = running_tasks.pop(task_id)
                task.cancel()
                db_set_task_status(task_id, "stopped")
                await e.answer("⏹ Задача остановлена", alert=True)
            await e.edit(f"⏹ Задача #{task_id} остановлена.", buttons=task_action_keyboard(task_id))

        elif data == "new_task":
            accs = [a for a in db_get_all_accounts() if a["status"] == "active"]
            if not accs:
                states[uid] = {"state": "task_text", "acc": None}
                await e.edit(
                    "✍️ **Создание задачи (без аккаунта)**\n\n"
                    "Введите текст сообщения для рассылки:",
                    buttons=cancel_keyboard()
                )
            else:
                buttons = []
                for a in accs:
                    buttons.append([Button.inline(f"📱 {a['phone']}", f"select_acc_{a['id']}".encode())])
                buttons.append([Button.inline("⏭ Без аккаунта (выбрать позже)", b"select_acc_0")])
                buttons.append([Button.inline("❌ Отмена", b"cancel_fsm")])
                await e.edit("Выберите аккаунт для рассылки:", buttons=buttons)

        elif data.startswith("select_acc_"):
            acc_id = int(data.split("_")[2])
            acc = db_get_account_by_id(acc_id)
            states[uid] = {"state": "task_text", "acc": acc}
            await e.edit("✍️ Введите текст сообщения для рассылки:", buttons=cancel_keyboard())

        elif data == "skip_media":
            st = states.get(uid)
            if st and st.get("state") == "task_media":
                st["media"] = None
                st["state"] = "task_chats"
                await e.edit(
                    "📂 Введите ссылки на чаты — каждый с новой строки:\n\n"
                    "Пример:\n`@chat1`\n`@chat2`\n`https://t.me/group_name`",
                    buttons=cancel_keyboard()
                )
            else:
                await e.answer("Ошибка сессии создания задачи", alert=True)

        elif data == "delay_default":
            st = states.get(uid)
            if not st or st.get("state") != "task_delay":
                await e.answer("Ошибка сессии создания задачи", alert=True)
                return

            acc = st.get("acc")
            acc_id = acc["id"] if acc else None
            task_id = db_create_task(
                acc_id, st["text"], st["chats"], DELAY_MIN, DELAY_MAX,
                loop=False, media=st.get("media")
            )
            states.pop(uid, None)
            await e.edit(
                f"✅ **Задача #{task_id} успешно создана!**\n\n"
                f"📊 Чатов: {len(st['chats'])}\n"
                f"📷 Фото: {'есть' if st.get('media') else 'нет'}\n"
                f"⏱ Задержка по умолчанию: {DELAY_MIN}–{DELAY_MAX} сек\n"
                f"📱 Аккаунт: {acc['phone'] if acc else 'Не выбран'}\n\n"
                f"💡 Не забудь включить режим 🔁 бесконечно, если нужно крутить по кругу.",
                buttons=task_action_keyboard(task_id)
            )

    # Ввод текста/файла (FSM)
    @bot.on(events.NewMessage())
    async def fsm_handler(e):
        if not is_admin(e.sender_id): return
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
                    await msg.edit(f"❌ Не удалось прочитать файл: `{ex}`", buttons=main_menu_keyboard())
                    states.pop(uid, None)
                    return
            elif txt:
                msg = await e.respond("⏳ Проверяем session...")
                session_str = txt
            else:
                await e.respond("❌ Пришлите session-строку текстом или файлом.", buttons=cancel_keyboard())
                return

            try:
                info = await add_account_from_session_string(session_str)
                states.pop(uid, None)
                name = info["name"].strip() or "—"
                await msg.edit(
                    f"✅ **Аккаунт добавлен из session!**\n\n"
                    f"📱 Телефон: `{info['phone']}`\n"
                    f"👤 Имя: {name}\n"
                    f"🆔 ID: `{info['user_id']}`",
                    buttons=main_menu_keyboard()
                )
            except Exception as ex:
                log.error(f"Ошибка добавления по session: {ex}")
                await msg.edit(f"❌ Ошибка: `{ex}`", buttons=main_menu_keyboard())
                states.pop(uid, None)
            return

        if step == "phone":
            if not txt.startswith("+"):
                await e.respond("❌ Номер должен начинаться с `+` (например: `+79001234567`). Попробуйте еще раз:", buttons=cancel_keyboard())
                return

            msg = await e.respond(f"⏳ Отправляем код подтверждения на `{txt}`...")
            try:
                await auth_send_code(uid, txt)
                db_add_account(txt)
                states[uid] = {"state": "code", "phone": txt}
                await msg.edit(
                    f"📨 **Код отправлен на номер `{txt}`!**\n\n"
                    f"📌 Откройте **официальное приложение Telegram** (чат *Telegram* с синей галочкой).\n"
                    f"Если код не приходит — нажмите **«📩 Отправить через SMS»** ниже.\n\n"
                    f"Введите полученный код:",
                    buttons=code_input_keyboard()
                )
            except ApiIdInvalidError:
                await msg.edit("❌ **Ошибка API_ID / API_HASH:**\nВведённые в боте ключи недействительны. Сгенерируйте новые ключи на **my.telegram.org**.", buttons=main_menu_keyboard())
                states.pop(uid, None)
            except FloodWaitError as ex:
                mins = ex.seconds // 60
                await msg.edit(f"⏳ **Telegram ограничил частые запросы.**\nПожалуйста, подождите `{mins} мин.` перед повторной попыткой.", buttons=main_menu_keyboard())
                states.pop(uid, None)
            except PhoneNumberBannedError:
                await msg.edit("❌ Данный номер телефона заблокирован в Telegram.", buttons=main_menu_keyboard())
                states.pop(uid, None)
            except Exception as ex:
                log.error(f"Ошибка отправки кода: {ex}")
                await msg.edit(f"❌ Ошибка отправки кода: `{ex}`", buttons=main_menu_keyboard())
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
                    db_save_session(phone, res)
                    states.pop(uid, None)
                    await msg.edit(f"✅ Аккаунт `{phone}` успешно добавлен!", buttons=main_menu_keyboard())
            except (PhoneCodeInvalidError, PhoneCodeExpiredError):
                await msg.edit("❌ Неверный или истекший код. Попробуйте снова или нажмите отмену:", buttons=code_input_keyboard())
            except Exception as ex:
                log.error(f"Ошибка авторизации: {ex}")
                await msg.edit(f"❌ Ошибка входа: `{ex}`", buttons=main_menu_keyboard())
                states.pop(uid, None)

        elif step == "2fa":
            phone = st["phone"]
            msg = await e.respond("⏳ Проверяем пароль 2FA...")
            try:
                session_str = await auth_confirm_2fa(uid, txt)
                db_save_session(phone, session_str)
                states.pop(uid, None)
                await msg.edit(f"✅ Аккаунт `{phone}` успешно добавлен!", buttons=main_menu_keyboard())
            except Exception as ex:
                await msg.edit(f"❌ Неверный пароль 2FA: `{ex}`", buttons=cancel_keyboard())

        elif step == "task_text":
            states[uid]["text"] = txt
            states[uid]["state"] = "task_media"
            await e.respond(
                "📷 **Отправьте фото для рассылки**\n\n"
                "Пришлите одно фото (или видео/документ) — оно будет отправляться "
                "вместе с текстом (caption).\n\n"
                "Если фото не нужно — нажмите «⏭ Пропустить».",
                buttons=[
                    [Button.inline("⏭ Пропустить", b"skip_media")],
                    [Button.inline("❌ Отмена", b"cancel_fsm")]
                ]
            )

        elif step == "task_media":
            if e.photo or e.document or e.video:
                msg = await e.respond("⏳ Скачиваем файл...")
                try:
                    path = await e.download_media(file="data/media/")
                    states[uid]["media"] = path
                    states[uid]["state"] = "task_chats"
                    await msg.edit(
                        f"✅ Фото сохранено: `{os.path.basename(path)}`\n\n"
                        f"📂 Введите ссылки на чаты — каждый с новой строки:\n\n"
                        f"Пример:\n`@chat1`\n`@chat2`\n`https://t.me/group_name`",
                        buttons=cancel_keyboard()
                    )
                except Exception as ex:
                    await msg.edit(
                        f"❌ Не удалось скачать файл: `{ex}`\n\n"
                        f"Попробуйте ещё раз или нажмите «⏭ Пропустить».",
                        buttons=[
                            [Button.inline("⏭ Пропустить", b"skip_media")],
                            [Button.inline("❌ Отмена", b"cancel_fsm")]
                        ]
                    )
            else:
                await e.respond(
                    "❌ Отправьте фото/видео/документ или нажмите «⏭ Пропустить».",
                    buttons=[
                        [Button.inline("⏭ Пропустить", b"skip_media")],
                        [Button.inline("❌ Отмена", b"cancel_fsm")]
                    ]
                )

        elif step == "task_chats":
            links = [l.strip() for l in txt.splitlines() if l.strip()]
            if not links:
                await e.respond("❌ Не найдено ссылок. Введите хотя бы одну ссылку.", buttons=cancel_keyboard())
                return

            chats = parse_chat_links(links)
            states[uid]["chats"] = chats
            states[uid]["state"] = "task_delay"

            delay_keyboard = [
                [Button.inline(f"⏱ По умолчанию ({DELAY_MIN}–{DELAY_MAX}с)", b"delay_default")],
                [Button.inline("❌ Отмена", b"cancel_fsm")]
            ]

            await e.respond(
                f"✅ Добавлено чатов: {len(chats)}\n\n"
                f"⏱ Напишите интервал задержки между отправками в секундах (мин макс):\n"
                f"Пример: `15 45`",
                buttons=delay_keyboard
            )

        elif step == "task_delay":
            d_min, d_max = DELAY_MIN, DELAY_MAX
            if txt:
                parts = txt.split()
                try:
                    d_min = int(parts[0])
                    d_max = int(parts[1]) if len(parts) > 1 else d_min + 15
                except (ValueError, IndexError):
                    pass

            acc = st.get("acc")
            acc_id = acc["id"] if acc else None
            task_id = db_create_task(
                acc_id, st["text"], st["chats"], d_min, d_max,
                loop=False, media=st.get("media")
            )
            states.pop(uid, None)
            await e.respond(
                f"✅ **Задача #{task_id} успешно создана!**\n\n"
                f"📊 Чатов: {len(st['chats'])}\n"
                f"📷 Фото: {'есть' if st.get('media') else 'нет'}\n"
                f"⏱ Задержка: {d_min}–{d_max} сек\n"
                f"📱 Аккаунт: {acc['phone'] if acc else 'Не выбран'}\n\n"
                f"💡 Не забудь включить режим 🔁 бесконечно, если нужно крутить по кругу.",
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
        lang_code="en"
    )
    await bot.start(bot_token=BOT_TOKEN)
    log.info("Бот запущен ✅")
    register_handlers(bot)
    asyncio.create_task(_auth_sessions_gc_loop())
    await bot.run_until_disconnected()

if __name__ == "__main__":
    asyncio.run(main())
