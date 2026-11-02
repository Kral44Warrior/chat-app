import asyncio
import json
import os
import sqlite3
import uuid
import sys
from datetime import datetime
from typing import Dict, List, Set

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
        # websocket -> username
        self.user_sockets: Dict[WebSocket, str] = {}
        # username -> list of active websockets
        self.online_users: Dict[str, Set[WebSocket]] = {}
        # websocket -> active room_id
        self.socket_rooms: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        self.user_sockets[websocket] = username
        if username not in self.online_users:
            self.online_users[username] = set()
        self.online_users[username].add(websocket)
        await self.broadcast_user_list()

        # Karşı taraf internete bağlandığı için gönderilen 'sent' mesajları 'delivered' (2 beyaz tik) yap
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE messages 
                SET status = 'delivered' 
                WHERE status = 'sent' AND sender != ?
            """, (username,))
            if cursor.rowcount > 0:
                conn.commit()
                conn.close()
                deliv_msg = json.dumps({"type": "messages_delivered", "user": username})
                for ws in list(self.user_sockets.keys()):
                    try:
                        await ws.send_text(deliv_msg)
                    except Exception:
                        pass
            else:
                conn.close()
        except Exception:
            pass

    def disconnect(self, websocket: WebSocket):
        username = self.user_sockets.pop(websocket, None)
        if username and username in self.online_users:
            self.online_users[username].discard(websocket)
            if not self.online_users[username]:
                del self.online_users[username]

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

    async def broadcast_user_list(self):
        users = list(self.online_users.keys())
        msg = {
            "type": "online_users",
            "users": users
        }
        for ws in list(self.user_sockets.keys()):
            try:
                await ws.send_text(json.dumps(msg))
            except Exception:
                pass

    async def broadcast_to_room(self, room_id: str, message: dict):
        text = json.dumps(message)
        # If it's a DM, also deliver to the other party's sockets even if they aren't looking at this exact room
        if room_id.startswith("dm_"):
            parts = room_id.split("__")
            if len(parts) == 2:
                user1 = parts[0].replace("dm_", "")
                user2 = parts[1]
                target_users = [user1, user2]
                sent_sockets = set()
                for u in target_users:
                    for s in self.online_users.get(u, set()):
                        if s not in sent_sockets:
                            sent_sockets.add(s)
                            try:
                                await s.send_text(text)
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

@app.get("/api/messages/{room_id}")
def get_messages(room_id: str, limit: int = 100):
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
async def upload_file(file: UploadFile = File(...)):
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

    return {
        "url": f"/uploads/{unique_name}",
        "name": file.filename,
        "size": size_str,
        "type": file.content_type
    }

# ----------------- WebSocket -----------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    username = websocket.query_params.get("username", "Anonim")
    await manager.connect(websocket, username)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            action = payload.get("action")

            if action == "join_room":
                room_id = payload.get("room_id")
                await manager.join_room(websocket, room_id)

                # Kullanıcı odaya girdiğinde, odadaki okunmamış mesajları okundu yap
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE messages 
                    SET status = 'read' 
                    WHERE room_id = ? AND sender != ? AND status != 'read'
                """, (room_id, username))
                updated_count = cursor.rowcount
                conn.commit()
                conn.close()

                if updated_count > 0:
                    await manager.broadcast_to_room(room_id, {
                        "type": "messages_read",
                        "room_id": room_id,
                        "reader": username
                    })

            elif action == "mark_read":
                room_id = payload.get("room_id")
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE messages 
                    SET status = 'read' 
                    WHERE room_id = ? AND sender != ? AND status != 'read'
                """, (room_id, username))
                updated_count = cursor.rowcount
                conn.commit()
                conn.close()

                if updated_count > 0:
                    await manager.broadcast_to_room(room_id, {
                        "type": "messages_read",
                        "room_id": room_id,
                        "reader": username
                    })

            elif action == "chat_message":
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

                # WhatsApp Tik Mantığı:
                # 1. 'sent' (1 beyaz tik) -> Karşı tarafın interneti kapalı/çevrimdışı
                # 2. 'delivered' (2 beyaz tik) -> Karşı taraf internete bağlı ama odayı açmamış
                # 3. 'read' (2 mavi tik) -> Karşı taraf şu an bu odada ve görüyor!
                msg_status = "sent"

                if room_id.startswith("dm_"):
                    parts = room_id.split("__")
                    if len(parts) == 2:
                        u1 = parts[0].replace("dm_", "")
                        u2 = parts[1]
                        other_user = u2 if u1 == username else u1

                        if other_user in manager.online_users:
                            other_sockets = manager.online_users[other_user]
                            in_room = any(manager.socket_rooms.get(s) == room_id for s in other_sockets)
                            if in_room:
                                msg_status = "read"
                            else:
                                msg_status = "delivered"
                        else:
                            msg_status = "sent"
                else:
                    active_sockets_in_room = manager.room_connections.get(room_id, set())
                    other_sockets_in_room = [s for s in active_sockets_in_room if manager.user_sockets.get(s) != username]
                    other_online_users = [u for u in manager.online_users.keys() if u != username]

                    if other_sockets_in_room:
                        msg_status = "read"
                    elif other_online_users:
                        msg_status = "delivered"
                    else:
                        msg_status = "sent"

                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO messages 
                    (id, room_id, sender, content, msg_type, file_url, file_name, file_size, reply_to_id, reply_to_text, reply_to_sender, timestamp, reactions, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (msg_id, room_id, username, content, msg_type, file_url, file_name, file_size, reply_to_id, reply_to_text, reply_to_sender, now_iso, "{}", msg_status))
                conn.commit()
                conn.close()

                out_msg = {
                    "type": "new_message",
                    "id": msg_id,
                    "room_id": room_id,
                    "sender": username,
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
                out = {
                    "type": "user_typing",
                    "room_id": room_id,
                    "user": username,
                    "is_typing": is_typing
                }
                await manager.broadcast_to_room(room_id, out)

            elif action == "react":
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
                        pass
                
                # emoji -> list of users who reacted
                if emoji not in reactions_dict:
                    reactions_dict[emoji] = []
                
                if username in reactions_dict[emoji]:
                    reactions_dict[emoji].remove(username)
                    if len(reactions_dict[emoji]) == 0:
                        del reactions_dict[emoji]
                else:
                    reactions_dict[emoji].append(username)

                new_json = json.dumps(reactions_dict)
                cursor.execute("UPDATE messages SET reactions = ? WHERE id = ?", (new_json, msg_id))
                conn.commit()
                conn.close()

                out = {
                    "type": "message_reaction",
                    "msg_id": msg_id,
                    "room_id": room_id,
                    "reactions": reactions_dict
                }
                await manager.broadcast_to_room(room_id, out)

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
