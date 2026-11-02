import asyncio
import json
import os
import random
import sqlite3
import uuid
import sys
from datetime import datetime
from typing import Dict, List, Set, Optional

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
import uvicorn

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
DB_PATH = os.path.join(BASE_DIR, "chat.db")

os.makedirs(UPLOADS_DIR, exist_ok=True)

def find_file(filename):
    p1 = os.path.join(BASE_DIR, filename)
    if os.path.exists(p1):
        return p1
    p2 = os.path.join(BASE_DIR, "static", filename)
    if os.path.exists(p2):
        return p2
    return p1

# ----------------- Database Setup -----------------
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Odalar tablosu
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rooms (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            icon TEXT,
            is_direct INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Mesajlar tablosu
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            room_id TEXT NOT NULL,
            sender TEXT NOT NULL,
            content TEXT,
            msg_type TEXT DEFAULT 'text',
            file_url TEXT,
            file_name TEXT,
            file_size TEXT,
            reply_to_id TEXT,
            reply_to_text TEXT,
            reply_to_sender TEXT,
            timestamp TEXT NOT NULL,
            reactions TEXT DEFAULT '{}',
            status TEXT DEFAULT 'sent'
        )
    """)

    try:
        cursor.execute("ALTER TABLE messages ADD COLUMN status TEXT DEFAULT 'sent'")
    except Exception:
        pass

    # Varsayılan Odalar
    default_rooms = [
        ("genel", "Genel Sohbet", "Herkes için genel sohbet ve muhabbet odası", "💬", 0),
        ("teknoloji", "Teknoloji & Yazılım", "Yazılım, yapay zeka ve teknoloji dünyası", "💻", 0),
        ("oyun", "Oyun Odası", "Masa oyunları, video oyunları ve etkinlikler", "🎮", 0),
        ("muzik", "Müzik & Sanat", "Favori şarkılar, çalma listeleri ve sanat", "🎵", 0)
    ]
    for room in default_rooms:
        cursor.execute("INSERT OR IGNORE INTO rooms (id, name, description, icon, is_direct) VALUES (?, ?, ?, ?, ?)", room)

    conn.commit()
    conn.close()

init_db()

# ----------------- Connection Manager -----------------
class ConnectionManager:
    def __init__(self):
        # room_id -> set of WebSockets
        self.room_connections: Dict[str, Set[WebSocket]] = {}
        # websocket -> {"username": username, "tag": tag, "handle": handle}
        self.user_info: Dict[WebSocket, dict] = {}
        # handle -> set of active websockets
        self.online_users: Dict[str, Set[WebSocket]] = {}
        # websocket -> active room_id
        self.socket_rooms: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, username: str, tag: str, handle: str):
        await websocket.accept()
        info = {"username": username, "tag": tag, "handle": handle}
        self.user_info[websocket] = info

        if handle not in self.online_users:
            self.online_users[handle] = set()
        self.online_users[handle].add(websocket)

        await self.broadcast_user_list()

        # Karşı taraf internete bağlandığı için gönderilen 'sent' mesajları 'delivered' (2 beyaz tik) yap
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE messages 
                SET status = 'delivered' 
                WHERE status = 'sent' AND sender != ? AND sender != ?
            """, (handle, username))
            if cursor.rowcount > 0:
                conn.commit()
                conn.close()
                deliv_msg = json.dumps({"type": "messages_delivered", "user": handle})
                for ws in list(self.user_info.keys()):
                    try:
                        await ws.send_text(deliv_msg)
                    except Exception:
                        pass
            else:
                conn.close()
        except Exception:
            pass

    def disconnect(self, websocket: WebSocket):
        info = self.user_info.pop(websocket, None)
        if info:
            handle = info["handle"]
            if handle in self.online_users:
                self.online_users[handle].discard(websocket)
                if not self.online_users[handle]:
                    del self.online_users[handle]

        old_room = self.socket_rooms.pop(websocket, None)
        if old_room and old_room in self.room_connections:
            self.room_connections[old_room].discard(websocket)

    async def join_room(self, websocket: WebSocket, room_id: str):
        old_room = self.socket_rooms.get(websocket)
        if old_room and old_room in self.room_connections:
            self.room_connections[old_room].discard(websocket)
            
        self.socket_rooms[websocket] = room_id
        if room_id not in self.room_connections:
            self.room_connections[room_id] = set()
        self.room_connections[room_id].add(websocket)

    async def send_to_user(self, target: str, message: dict, exclude_ws: WebSocket = None) -> bool:
        text = json.dumps(message)
        matched_sockets = set()
        target_clean = str(target).lower().strip()

        for ws, info in self.user_info.items():
            h = info["handle"].lower()
            u = info["username"].lower()
            t = info["tag"].lower()
            if target_clean in (h, u, f"#{t}", t):
                matched_sockets.add(ws)

        sent_any = False
        for s in list(matched_sockets):
            if exclude_ws and s == exclude_ws:
                continue
            try:
                await s.send_text(text)
                sent_any = True
            except Exception:
                pass
        return sent_any

    async def broadcast_user_list(self):
        seen = set()
        user_list = []
        for info in self.user_info.values():
            h = info["handle"]
            if h not in seen:
                seen.add(h)
                user_list.append(info)

        msg = {
            "type": "online_users",
            "users": user_list
        }
        text = json.dumps(msg)
        for ws in list(self.user_info.keys()):
            try:
                await ws.send_text(text)
            except Exception:
                pass

    async def broadcast_to_room(self, room_id: str, message: dict):
        text = json.dumps(message)
        # If it's a DM, also deliver to the other party's sockets even if they aren't looking at this exact room
        if room_id.startswith("dm_"):
            parts = room_id.split("__")
            if len(parts) == 2:
                target_users = [parts[0].replace("dm_", ""), parts[1]]
                sent_sockets = set()
                for target in target_users:
                    target_clean = target.lower().strip()
                    for ws, info in self.user_info.items():
                        if target_clean in (info["handle"].lower(), info["username"].lower(), f"#{info['tag']}".lower()):
                            if ws not in sent_sockets:
                                sent_sockets.add(ws)
                                try:
                                    await ws.send_text(text)
                                except Exception:
                                    pass
                return

        # Regular group room broadcast
        if room_id in self.room_connections:
            for s in list(self.room_connections[room_id]):
                try:
                    await s.send_text(text)
                except Exception:
                    pass

manager = ConnectionManager()

# ----------------- FastAPI App -----------------
app = FastAPI(title="Chat App")

# Static files & Routes
@app.get("/")
def get_index():
    return FileResponse(find_file("index.html"))

@app.get("/static/style.css")
@app.get("/style.css")
def get_css():
    return FileResponse(find_file("style.css"))

@app.get("/static/app.js")
@app.get("/app.js")
def get_js():
    return FileResponse(find_file("app.js"))

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

@app.get("/api/rooms")
def get_rooms():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, description, icon, is_direct FROM rooms WHERE is_direct = 0")
    rooms = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rooms

@app.get("/api/messages")
@app.get("/api/messages/{room_id}")
def get_messages(room_id: str = "genel", limit: int = 100):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM messages 
        WHERE room_id = ? 
        ORDER BY timestamp ASC 
        LIMIT ?
    """, (room_id, limit))
    messages = [dict(row) for row in cursor.fetchall()]
    for m in messages:
        if m["reactions"]:
            try:
                m["reactions"] = json.loads(m["reactions"])
            except Exception:
                m["reactions"] = {}
        else:
            m["reactions"] = {}
    conn.close()
    return messages

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    room_id: str = Form("genel"),
    sender: str = Form("Anonim")
):
    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4().hex[:12]}{ext}"
    dest_path = os.path.join(UPLOADS_DIR, unique_name)
    
    with open(dest_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    size_bytes = len(content)
    if size_bytes < 1024:
        size_str = f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        size_str = f"{size_bytes / 1024:.1f} KB"
    else:
        size_str = f"{size_bytes / (1024*1024):.1f} MB"

    file_url = f"/uploads/{unique_name}"
    content_type = file.content_type or ""
    
    if content_type.startswith("image/"):
        msg_type = "image"
    elif content_type.startswith("audio/"):
        msg_type = "audio"
    elif content_type.startswith("video/"):
        msg_type = "video"
    else:
        msg_type = "file"

    msg_id = uuid.uuid4().hex[:10]
    now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO messages 
        (id, room_id, sender, content, msg_type, file_url, file_name, file_size, reply_to_id, reply_to_text, reply_to_sender, timestamp, reactions, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (msg_id, room_id, sender, "", msg_type, file_url, file.filename, size_str, None, None, None, now_iso, "{}", "delivered"))
    conn.commit()
    conn.close()

    out_msg = {
        "type": "new_message",
        "id": msg_id,
        "room_id": room_id,
        "sender": sender,
        "content": "",
        "msg_type": msg_type,
        "file_url": file_url,
        "file_name": file.filename,
        "file_size": size_str,
        "reply_to_id": None,
        "reply_to_text": None,
        "reply_to_sender": None,
        "timestamp": now_iso,
        "reactions": {},
        "status": "delivered"
    }
    await manager.broadcast_to_room(room_id, out_msg)

    return {
        "url": file_url,
        "name": file.filename,
        "size": size_str,
        "type": file.content_type
    }

# ----------------- WebSocket -----------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    query_params = dict(websocket.query_params)
    username = query_params.get("username", "Anonim").strip()
    tag = query_params.get("tag", "").strip()
    if not tag:
        tag = str(random.randint(1000, 9999))
    handle = f"{username}#{tag}"

    await manager.connect(websocket, username, tag, handle)

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            action = payload.get("action")

            if action == "join_room":
                room_id = payload.get("room_id")
                await manager.join_room(websocket, room_id)

                # Okundu yap
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE messages 
                    SET status = 'read' 
                    WHERE room_id = ? AND sender != ? AND sender != ? AND status != 'read'
                """, (room_id, handle, username))
                updated_count = cursor.rowcount
                conn.commit()
                conn.close()

                if updated_count > 0:
                    await manager.broadcast_to_room(room_id, {
                        "type": "messages_read",
                        "room_id": room_id,
                        "reader": handle
                    })

            elif action == "read_messages":
                room_id = payload.get("room_id")
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE messages 
                    SET status = 'read' 
                    WHERE room_id = ? AND sender != ? AND sender != ? AND status != 'read'
                """, (room_id, handle, username))
                updated_count = cursor.rowcount
                conn.commit()
                conn.close()

                if updated_count > 0:
                    await manager.broadcast_to_room(room_id, {
                        "type": "messages_read",
                        "room_id": room_id,
                        "reader": handle
                    })

            elif action == "send_message":
                msg_id = uuid.uuid4().hex[:10]
                room_id = payload.get("room_id")
                content = payload.get("content", "")
                msg_type = payload.get("msg_type", "text")
                file_url = payload.get("file_url")
                file_name = payload.get("file_name")
                file_size = payload.get("file_size")
                reply_to_id = payload.get("reply_to_id")
                reply_to_text = payload.get("reply_to_text")
                reply_to_sender = payload.get("reply_to_sender")
                now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                msg_status = "sent"

                if room_id.startswith("dm_"):
                    parts = room_id.split("__")
                    if len(parts) == 2:
                        u1 = parts[0].replace("dm_", "")
                        u2 = parts[1]
                        other_target = u2 if (u1.lower() == handle.lower() or u1.lower() == username.lower()) else u1

                        target_clean = other_target.lower().strip()
                        matched_sockets = [
                            ws for ws, inf in manager.user_info.items() 
                            if target_clean in (inf["handle"].lower(), inf["username"].lower(), f"#{inf['tag']}".lower())
                        ]

                        if matched_sockets:
                            in_room = any(manager.socket_rooms.get(s) == room_id for s in matched_sockets)
                            if in_room:
                                msg_status = "read"
                            else:
                                msg_status = "delivered"
                        else:
                            msg_status = "sent"
                else:
                    active_sockets_in_room = manager.room_connections.get(room_id, set())
                    other_sockets_in_room = [s for s in active_sockets_in_room if s != websocket]
                    other_online_sockets = [s for s in manager.user_info.keys() if s != websocket]

                    if other_sockets_in_room:
                        msg_status = "read"
                    elif other_online_sockets:
                        msg_status = "delivered"
                    else:
                        msg_status = "sent"

                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO messages 
                    (id, room_id, sender, content, msg_type, file_url, file_name, file_size, reply_to_id, reply_to_text, reply_to_sender, timestamp, reactions, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (msg_id, room_id, handle, content, msg_type, file_url, file_name, file_size, reply_to_id, reply_to_text, reply_to_sender, now_iso, "{}", msg_status))
                conn.commit()
                conn.close()

                out_msg = {
                    "type": "new_message",
                    "id": msg_id,
                    "room_id": room_id,
                    "sender": handle,
                    "content": content,
                    "msg_type": msg_type,
                    "file_url": file_url,
                    "file_name": file_name,
                    "file_size": file_size,
                    "reply_to_id": reply_to_id,
                    "reply_to_text": reply_to_text,
                    "reply_to_sender": reply_to_sender,
                    "timestamp": now_iso,
                    "reactions": {},
                    "status": msg_status
                }
                await manager.broadcast_to_room(room_id, out_msg)

            elif action == "typing":
                room_id = payload.get("room_id")
                is_typing = payload.get("is_typing", False)
                await manager.broadcast_to_room(room_id, {
                    "type": "user_typing",
                    "room_id": room_id,
                    "user": handle,
                    "is_typing": is_typing
                })

            elif action == "reaction":
                msg_id = payload.get("msg_id")
                emoji = payload.get("emoji")
                room_id = payload.get("room_id")

                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("SELECT reactions FROM messages WHERE id = ?", (msg_id,))
                row = cursor.fetchone()
                
                reactions_dict = {}
                if row and row[0]:
                    try:
                        reactions_dict = json.loads(row[0])
                    except Exception:
                        reactions_dict = {}

                if emoji not in reactions_dict:
                    reactions_dict[emoji] = []

                if handle in reactions_dict[emoji]:
                    reactions_dict[emoji].remove(handle)
                    if not reactions_dict[emoji]:
                        del reactions_dict[emoji]
                else:
                    reactions_dict[emoji].append(handle)

                cursor.execute("UPDATE messages SET reactions = ? WHERE id = ?", (json.dumps(reactions_dict), msg_id))
                conn.commit()
                conn.close()

                out = {
                    "type": "message_reaction",
                    "msg_id": msg_id,
                    "room_id": room_id,
                    "reactions": reactions_dict
                }
                await manager.broadcast_to_room(room_id, out)

            elif action == "call_user":
                target_user = payload.get("target_user")
                is_video = payload.get("is_video", False)
                delivered = await manager.send_to_user(target_user, {
                    "type": "incoming_call",
                    "caller": handle,
                    "is_video": is_video,
                    "room_id": payload.get("room_id")
                }, exclude_ws=websocket)
                if not delivered:
                    await websocket.send_text(json.dumps({
                        "type": "call_error",
                        "message": f"'{target_user}' şu anda çevrimdışı veya yanıt veremiyor."
                    }))

            elif action == "call_response":
                target_user = payload.get("target_user")
                accepted = payload.get("accepted", False)
                await manager.send_to_user(target_user, {
                    "type": "call_response",
                    "responder": handle,
                    "accepted": accepted
                }, exclude_ws=websocket)

            elif action == "webrtc_signal":
                target_user = payload.get("target_user")
                signal = payload.get("signal")
                await manager.send_to_user(target_user, {
                    "type": "webrtc_signal",
                    "sender": handle,
                    "signal": signal
                }, exclude_ws=websocket)

            elif action == "end_call":
                target_user = payload.get("target_user")
                if target_user:
                    await manager.send_to_user(target_user, {
                        "type": "call_ended",
                        "sender": handle
                    }, exclude_ws=websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast_user_list()
    except Exception:
        manager.disconnect(websocket)
        await manager.broadcast_user_list()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print("=" * 50)
    print("Chat Uygulamasi Baslatiliyor...")
    print(f"Port: {port}")
    print("=" * 50)
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
