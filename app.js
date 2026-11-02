// ==================== STATE ====================
let currentUser = {
  username: localStorage.getItem("chat_username") || "",
  color: localStorage.getItem("chat_color") || "#10b981"
};

let activeChat = {
  id: "genel",
  name: "Genel Sohbet",
  isDirect: false,
  recipient: ""
};

let socket = null;
let rooms = [];
let onlineUsers = [];
let replyTarget = null;
let mediaRecorder = null;
let audioChunks = [];
let recTimerInterval = null;
let typingTimeout = null;
let unreadCounts = {};

// ==================== DOM ELEMENTS ====================
const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username-input");
const avatarColors = document.getElementById("avatar-colors");
const appLayout = document.getElementById("app-layout");
const myAvatar = document.getElementById("my-avatar");
const myNameDisplay = document.getElementById("my-name-display");
const themeToggle = document.getElementById("theme-toggle");
const logoutBtn = document.getElementById("logout-btn");
const chatSearch = document.getElementById("chat-search");
const navTabs = document.querySelectorAll(".nav-tab");
const roomsList = document.getElementById("rooms-list");
const usersList = document.getElementById("users-list");
const onlineCount = document.getElementById("online-count");
const activeChatAvatar = document.getElementById("active-chat-avatar");
const activeChatTitle = document.getElementById("active-chat-title");
const activeChatStatus = document.getElementById("active-chat-status");
const messagesContainer = document.getElementById("messages-container");
const typingBar = document.getElementById("typing-bar");
const typingText = document.getElementById("typing-text");
const replyBanner = document.getElementById("reply-banner");
const replySender = document.getElementById("reply-sender");
const replyPreview = document.getElementById("reply-preview");
const cancelReplyBtn = document.getElementById("cancel-reply-btn");
const emojiBtn = document.getElementById("emoji-btn");
const emojiPicker = document.getElementById("emoji-picker");
const attachBtn = document.getElementById("attach-btn");
const fileInput = document.getElementById("file-input");
const messageInput = document.getElementById("message-input");
const voiceBtn = document.getElementById("voice-btn");
const sendBtn = document.getElementById("send-btn");
const recordingBar = document.getElementById("recording-bar");
const recTimer = document.getElementById("rec-timer");
const cancelRecBtn = document.getElementById("cancel-rec-btn");
const sendRecBtn = document.getElementById("send-rec-btn");
const mobileBackBtn = document.getElementById("mobile-back-btn");
const scrollBottomBtn = document.getElementById("scroll-bottom-btn");
const imageModal = document.getElementById("image-modal");
const modalImg = document.getElementById("modal-img");
const closeImageModal = document.getElementById("close-image-modal");

// ==================== SOUND SYNTHESIZER ====================
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    // Audio context may require prior user interaction
  }
}

// ==================== THEME MANAGEMENT ====================
function initTheme() {
  const savedTheme = localStorage.getItem("chat_theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
    document.body.classList.remove("dark-theme");
    themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
  } else {
    document.body.classList.add("dark-theme");
    document.body.classList.remove("light-theme");
    themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }
}

themeToggle.addEventListener("click", () => {
  if (document.body.classList.contains("light-theme")) {
    document.body.classList.remove("light-theme");
    document.body.classList.add("dark-theme");
    localStorage.setItem("chat_theme", "dark");
    themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
  } else {
    document.body.classList.remove("dark-theme");
    document.body.classList.add("light-theme");
    localStorage.setItem("chat_theme", "light");
    themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
  }
});

// ==================== AVATAR HELPERS ====================
function getInitials(name) {
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ["#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4", "#ef4444", "#14b8a6"];
  return colors[Math.abs(hash) % colors.length];
}

// ==================== AUTH / LOGIN ====================
avatarColors.addEventListener("click", (e) => {
  if (e.target.classList.contains("color-dot")) {
    document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("active"));
    e.target.classList.add("active");
    currentUser.color = e.target.getAttribute("data-color");
  }
});

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = usernameInput.value.trim();
  if (!val) return;

  currentUser.username = val;
  localStorage.setItem("chat_username", currentUser.username);
  localStorage.setItem("chat_color", currentUser.color);
  enterApp();
});

logoutBtn.addEventListener("click", () => {
  if (confirm("Çıkış yapmak istediğinize emin misiniz?")) {
    localStorage.removeItem("chat_username");
    if (socket) socket.close();
    location.reload();
  }
});

function enterApp() {
  loginModal.style.display = "none";
  appLayout.style.display = "flex";

  myAvatar.textContent = getInitials(currentUser.username);
  myAvatar.style.background = currentUser.color;
  myNameDisplay.textContent = currentUser.username;

  loadRooms().then(() => {
    connectWebSocket();
    switchChat("genel", "Genel Sohbet", false);
  });
}

// Auto-login if previously saved
if (currentUser.username) {
  enterApp();
} else {
  loginModal.style.display = "flex";
}

// ==================== WEBSOCKET ====================
function connectWebSocket() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${location.host}/ws?username=${encodeURIComponent(currentUser.username)}`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("WebSocket bağlantısı başarılı");
    joinActiveRoom();
    markActiveRoomAsRead();
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleSocketMessage(data);
    } catch (e) {
      console.error("Mesaj ayrıştırma hatası:", e);
    }
  };

  socket.onclose = () => {
    console.warn("WebSocket bağlantısı koptu, yeniden bağlanılıyor...");
    setTimeout(connectWebSocket, 2000);
  };
}

function joinActiveRoom() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      action: "join_room",
      room_id: activeChat.id
    }));
  }
}

function handleSocketMessage(data) {
  if (data.type === "online_users") {
    onlineUsers = data.users.filter(u => u !== currentUser.username);
    onlineCount.textContent = onlineUsers.length;
    renderUsersList();
  } else if (data.type === "new_message") {
    if (data.room_id === activeChat.id) {
      appendMessage(data);
      scrollToBottom();
      if (data.sender !== currentUser.username) {
        playNotificationSound();
      }
    } else {
      // Artırılacak unread
      unreadCounts[data.room_id] = (unreadCounts[data.room_id] || 0) + 1;
      updateBadge(data.room_id);
      playNotificationSound();
    }
  } else if (data.type === "user_typing") {
    if (data.room_id === activeChat.id && data.user !== currentUser.username) {
      if (data.is_typing) {
        typingText.textContent = `${data.user} yazıyor...`;
        typingBar.style.display = "flex";
      } else {
        typingBar.style.display = "none";
      }
    }
  } else if (data.type === "messages_read") {
    if (data.room_id === activeChat.id) {
      document.querySelectorAll(".message-row.me .msg-tick").forEach(tickEl => {
        tickEl.className = "fa-solid fa-check-double msg-tick read";
        tickEl.title = "Okundu";
      });
    }
  } else if (data.type === "messages_delivered") {
    document.querySelectorAll(".message-row.me .msg-tick").forEach(tickEl => {
      if (!tickEl.classList.contains("read")) {
        tickEl.className = "fa-solid fa-check-double msg-tick";
        tickEl.title = "İletildi";
      }
    });
  } else if (data.type === "message_reaction") {
    if (data.room_id === activeChat.id) {
      updateReactionsInDOM(data.msg_id, data.reactions);
    }
  }
}

// ==================== ROOMS & CHATS ====================
async function loadRooms() {
  try {
    const res = await fetch("/api/rooms");
    rooms = await res.json();
    renderRoomsList();
  } catch (e) {
    console.error("Odalar yüklenemedi", e);
  }
}

function renderRoomsList() {
  roomsList.innerHTML = "";
  rooms.forEach(r => {
    const item = document.createElement("div");
    item.className = `chat-item ${r.id === activeChat.id ? "active" : ""}`;
    item.dataset.roomId = r.id;

    const unread = unreadCounts[r.id] || 0;

    item.innerHTML = `
      <div class="avatar" style="background: #3b82f6;">${r.icon || "💬"}</div>
      <div class="chat-item-info">
        <div class="top-row">
          <span class="name">${escapeHtml(r.name)}</span>
          <span class="time"></span>
        </div>
        <div class="bottom-row">
          <span class="preview">${escapeHtml(r.description || "")}</span>
          ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ""}
        </div>
      </div>
    `;

    item.addEventListener("click", () => {
      switchChat(r.id, r.name, false, r.icon);
    });

    roomsList.appendChild(item);
  });
}

function renderUsersList() {
  usersList.innerHTML = "";
  if (onlineUsers.length === 0) {
    usersList.innerHTML = `
      <div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 13px;">
        Şu anda çevrimiçi başka kullanıcı yok.<br>Farklı bir tarayıcı sekmesi veya başka cihazdan bağlanabilirsiniz!
      </div>
    `;
    return;
  }

  onlineUsers.forEach(u => {
    const dmRoomId = getDmRoomId(currentUser.username, u);
    const item = document.createElement("div");
    item.className = `chat-item ${dmRoomId === activeChat.id ? "active" : ""}`;
    item.dataset.roomId = dmRoomId;

    const unread = unreadCounts[dmRoomId] || 0;
    const color = stringToColor(u);

    item.innerHTML = `
      <div class="avatar" style="background: ${color};">${getInitials(u)}</div>
      <div class="chat-item-info">
        <div class="top-row">
          <span class="name">${escapeHtml(u)}</span>
          <span class="time"><span class="status-indicator online"></span></span>
        </div>
        <div class="bottom-row">
          <span class="preview">Özel mesaj başlatmak için tıkla</span>
          ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ""}
        </div>
      </div>
    `;

    item.addEventListener("click", () => {
      switchChat(dmRoomId, u, true, null, u);
    });

    usersList.appendChild(item);
  });
}

function getDmRoomId(user1, user2) {
  const sorted = [user1, user2].sort();
  return `dm_${sorted[0]}__${sorted[1]}`;
}

function switchChat(roomId, name, isDirect, icon, recipient) {
  activeChat = {
    id: roomId,
    name: name,
    isDirect: isDirect,
    recipient: recipient || ""
  };

  unreadCounts[roomId] = 0;
  updateBadge(roomId);

  // Update header
  activeChatTitle.textContent = name;
  if (isDirect) {
    activeChatAvatar.textContent = getInitials(name);
    activeChatAvatar.style.background = stringToColor(name);
    activeChatStatus.innerHTML = '<span class="status-indicator online"></span> Çevrimiçi (Özel Sohbet)';
  } else {
    activeChatAvatar.textContent = icon || "💬";
    activeChatAvatar.style.background = "#3b82f6";
    activeChatStatus.textContent = "Oda Sohbeti";
  }

  // Active class in lists
  document.querySelectorAll(".chat-item").forEach(el => {
    if (el.dataset.roomId === roomId) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });

  joinActiveRoom();
  loadMessages(roomId);
  markActiveRoomAsRead();

  // Mobile navigation
  appLayout.classList.add("chat-open");
}

function updateBadge(roomId) {
  const badgeEl = document.querySelector(`.chat-item[data-room-id="${roomId}"] .unread-badge`);
  const count = unreadCounts[roomId] || 0;
  if (badgeEl) {
    if (count > 0) {
      badgeEl.textContent = count;
      badgeEl.style.display = "flex";
    } else {
      badgeEl.remove();
    }
  }
}

// Mobile back
mobileBackBtn.addEventListener("click", () => {
  appLayout.classList.remove("chat-open");
});

// Search filter
chatSearch.addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll(".chat-item").forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(q) ? "flex" : "none";
  });
});

// Nav Tabs switch
navTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    navTabs.forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    if (target === "rooms") roomsList.classList.add("active");
    if (target === "users") usersList.classList.add("active");
  });
});

// ==================== MESSAGES ====================
async function loadMessages(roomId) {
  messagesContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-muted);">Mesajlar yükleniyor...</div>';
  try {
    const res = await fetch(`/api/messages/${roomId}`);
    const msgs = await res.json();
    messagesContainer.innerHTML = "";

    if (msgs.length === 0) {
      messagesContainer.innerHTML = `
        <div class="welcome-box">
          <div class="welcome-icon">${activeChat.isDirect ? "👤" : "💬"}</div>
          <h3>${escapeHtml(activeChat.name)}</h3>
          <p>Bu sohbette henüz mesaj yok. İlk mesajı siz yazın!</p>
        </div>
      `;
      return;
    }

    msgs.forEach(m => appendMessage(m));
    scrollToBottom(false);
  } catch (e) {
    console.error("Mesajlar alınamadı", e);
  }
}

function getTickIconHTML(status) {
  if (status === "read") {
    return '<i class="fa-solid fa-check-double msg-tick read" title="Okundu"></i>';
  } else if (status === "delivered") {
    return '<i class="fa-solid fa-check-double msg-tick" title="İletildi"></i>';
  } else {
    return '<i class="fa-solid fa-check msg-tick" title="Gönderildi"></i>';
  }
}

function markActiveRoomAsRead() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      action: "mark_read",
      room_id: activeChat.id
    }));
  }
}

window.addEventListener("focus", markActiveRoomAsRead);

function appendMessage(m) {
  const isMe = m.sender === currentUser.username;
  const row = document.createElement("div");
  row.className = `message-row ${isMe ? "me" : "other"}`;
  row.dataset.msgId = m.id;

  const timeStr = m.timestamp ? m.timestamp.split(" ")[1].slice(0, 5) : "";

  let bodyContent = "";
  if (m.msg_type === "image" && m.file_url) {
    bodyContent += `
      <img src="${m.file_url}" class="msg-image" onclick="openImageModal('${m.file_url}')" alt="Resim" />
      ${m.content ? `<div style="margin-top: 6px;">${linkify(escapeHtml(m.content))}</div>` : ""}
    `;
  } else if (m.msg_type === "audio" && m.file_url) {
    bodyContent += createAudioPlayerHTML(m.file_url);
  } else if (m.msg_type === "file" && m.file_url) {
    bodyContent += `
      <a href="${m.file_url}" download="${m.file_name || 'dosya'}" class="msg-file-card">
        <i class="fa-solid fa-file-lines"></i>
        <div class="msg-file-info">
          <span class="msg-file-name">${escapeHtml(m.file_name || "Dosya")}</span>
          <span class="msg-file-size">${m.file_size || ""}</span>
        </div>
      </a>
      ${m.content ? `<div style="margin-top: 6px;">${linkify(escapeHtml(m.content))}</div>` : ""}
    `;
  } else {
    bodyContent += linkify(escapeHtml(m.content));
  }

  // Reply block if any
  let replyHtml = "";
  if (m.reply_to_sender && m.reply_to_text) {
    replyHtml = `
      <div class="bubble-reply">
        <strong>${escapeHtml(m.reply_to_sender)}</strong>
        <span>${escapeHtml(m.reply_to_text)}</span>
      </div>
    `;
  }

  // Sender color for group rooms
  const senderColor = stringToColor(m.sender);

  row.innerHTML = `
    <div class="message-bubble">
      ${!isMe && !activeChat.isDirect ? `<span class="sender-name" style="color: ${senderColor}">${escapeHtml(m.sender)}</span>` : ""}
      ${replyHtml}
      ${bodyContent}
      <div class="bubble-meta">
        <span>${timeStr}</span>
        ${isMe ? getTickIconHTML(m.status || 'sent') : ''}
      </div>
    </div>
    
    <!-- Action toolbar on hover -->
    <div class="msg-actions">
      <button class="action-btn" title="Yanıtla" onclick="setReply('${m.id}', '${escapeJs(m.sender)}', '${escapeJs(m.content || m.file_name || '')}')">
        <i class="fa-solid fa-reply"></i>
      </button>
      <button class="action-btn" title="Beğen" onclick="sendReaction('${m.id}', '❤️')">❤️</button>
      <button class="action-btn" title="Güldüm" onclick="sendReaction('${m.id}', '😂')">😂</button>
      <button class="action-btn" title="Harika" onclick="sendReaction('${m.id}', '🔥')">🔥</button>
      <button class="action-btn" title="Onayla" onclick="sendReaction('${m.id}', '👍')">👍</button>
    </div>

    <div class="reactions-list" id="reactions-${m.id}"></div>
  `;

  messagesContainer.appendChild(row);
  if (m.reactions && Object.keys(m.reactions).length > 0) {
    updateReactionsInDOM(m.id, m.reactions);
  }
}

function scrollToBottom(smooth = true) {
  messagesContainer.scrollTo({
    top: messagesContainer.scrollHeight,
    behavior: smooth ? "smooth" : "auto"
  });
}

scrollBottomBtn.addEventListener("click", () => scrollToBottom(true));

// ==================== SEND MESSAGE ====================
function sendMessage() {
  const content = messageInput.value.trim();
  if (!content) return;

  const payload = {
    action: "chat_message",
    room_id: activeChat.id,
    content: content,
    msg_type: "text",
    reply_to_id: replyTarget ? replyTarget.id : null,
    reply_to_sender: replyTarget ? replyTarget.sender : null,
    reply_to_text: replyTarget ? replyTarget.text : null
  };

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }

  messageInput.value = "";
  messageInput.style.height = "auto";
  clearReply();
  sendTypingStatus(false);
}

sendBtn.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-expand textarea & typing event
messageInput.addEventListener("input", () => {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px";

  sendTypingStatus(true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    sendTypingStatus(false);
  }, 1500);
});

function sendTypingStatus(isTyping) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      action: "typing",
      room_id: activeChat.id,
      is_typing: isTyping
    }));
  }
}

// ==================== REPLIES & REACTIONS ====================
window.setReply = function(id, sender, text) {
  replyTarget = { id, sender, text };
  replySender.textContent = sender;
  replyPreview.textContent = text.slice(0, 60);
  replyBanner.style.display = "flex";
  messageInput.focus();
};

function clearReply() {
  replyTarget = null;
  replyBanner.style.display = "none";
}

cancelReplyBtn.addEventListener("click", clearReply);

window.sendReaction = function(msgId, emoji) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      action: "react",
      msg_id: msgId,
      room_id: activeChat.id,
      emoji: emoji
    }));
  }
};

function updateReactionsInDOM(msgId, reactions) {
  const cont = document.getElementById(`reactions-${msgId}`);
  if (!cont) return;
  cont.innerHTML = "";

  Object.entries(reactions).forEach(([emoji, users]) => {
    if (users.length > 0) {
      const tag = document.createElement("span");
      const hasMyReaction = users.includes(currentUser.username);
      tag.className = `reaction-tag ${hasMyReaction ? "reacted" : ""}`;
      tag.title = users.join(", ");
      tag.innerHTML = `${emoji} <span>${users.length}</span>`;
      tag.addEventListener("click", () => sendReaction(msgId, emoji));
      cont.appendChild(tag);
    }
  });
}

// ==================== ATTACHMENTS & UPLOAD ====================
attachBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });
    const data = await res.json();

    const isImg = file.type.startsWith("image/");
    const payload = {
      action: "chat_message",
      room_id: activeChat.id,
      content: "",
      msg_type: isImg ? "image" : "file",
      file_url: data.url,
      file_name: data.name,
      file_size: data.size
    };

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  } catch (e) {
    alert("Dosya yüklenirken hata oluştu.");
  } finally {
    fileInput.value = "";
  }
});

// ==================== VOICE NOTES RECORDING ====================
voiceBtn.addEventListener("click", async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Tarayıcınız ses kaydını desteklemiyor.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.start();
    startRecTimer();
    recordingBar.style.display = "flex";
  } catch (err) {
    alert("Mikrofona erişim izni verilmedi.");
  }
});

function startRecTimer() {
  let sec = 0;
  recTimer.textContent = "00:00";
  recTimerInterval = setInterval(() => {
    sec++;
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    recTimer.textContent = `${m}:${s}`;
  }, 1000);
}

function stopRecTimer() {
  clearInterval(recTimerInterval);
  recordingBar.style.display = "none";
}

cancelRecBtn.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
  }
  audioChunks = [];
  stopRecTimer();
});

sendRecBtn.addEventListener("click", () => {
  if (!mediaRecorder || mediaRecorder.state === "inactive") return;

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
    const file = new File([audioBlob], `ses_${Date.now()}.webm`, { type: "audio/webm" });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();

      const payload = {
        action: "chat_message",
        room_id: activeChat.id,
        content: "",
        msg_type: "audio",
        file_url: data.url,
        file_name: data.name,
        file_size: data.size
      };

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
      }
    } catch (e) {
      alert("Ses kaydı yüklenemedi.");
    }
  };

  mediaRecorder.stop();
  mediaRecorder.stream.getTracks().forEach(t => t.stop());
  stopRecTimer();
});

// Audio player UI helper
function createAudioPlayerHTML(url) {
  const id = "audio_" + Math.random().toString(36).substr(2, 9);
  return `
    <div class="audio-player" id="${id}">
      <audio src="${url}" preload="metadata"></audio>
      <button class="audio-play-btn" onclick="toggleAudio('${id}')">
        <i class="fa-solid fa-play"></i>
      </button>
      <div class="audio-track-wrap">
        <input type="range" class="audio-slider" value="0" min="0" max="100" oninput="seekAudio('${id}', this.value)">
        <span class="audio-duration">00:00</span>
      </div>
    </div>
  `;
}

window.toggleAudio = function(containerId) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  const audio = cont.querySelector("audio");
  const btn = cont.querySelector(".audio-play-btn i");
  const slider = cont.querySelector(".audio-slider");
  const dur = cont.querySelector(".audio-duration");

  if (audio.paused) {
    audio.play();
    btn.className = "fa-solid fa-pause";
  } else {
    audio.pause();
    btn.className = "fa-solid fa-play";
  }

  audio.ontimeupdate = () => {
    if (audio.duration) {
      const pct = (audio.currentTime / audio.duration) * 100;
      slider.value = pct;
      const curM = String(Math.floor(audio.currentTime / 60)).padStart(2, "0");
      const curS = String(Math.floor(audio.currentTime % 60)).padStart(2, "0");
      dur.textContent = `${curM}:${curS}`;
    }
  };

  audio.onended = () => {
    btn.className = "fa-solid fa-play";
    slider.value = 0;
  };
};

window.seekAudio = function(containerId, value) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  const audio = cont.querySelector("audio");
  if (audio.duration) {
    audio.currentTime = (value / 100) * audio.duration;
  }
};

// ==================== EMOJI PICKER ====================
emojiBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  emojiPicker.style.display = emojiPicker.style.display === "none" ? "flex" : "none";
});

emojiPicker.addEventListener("click", (e) => {
  if (e.target.tagName === "SPAN") {
    messageInput.value += e.target.textContent;
    messageInput.focus();
  }
});

// Emoji Category Tabs
const emojiTabBtns = document.querySelectorAll(".emoji-tab-btn");
emojiTabBtns.forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    emojiTabBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const targetId = btn.getAttribute("data-target");
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });
});

document.addEventListener("click", (e) => {
  if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
    emojiPicker.style.display = "none";
  }
});

// ==================== LIGHTBOX MODAL ====================
window.openImageModal = function(url) {
  modalImg.src = url;
  imageModal.style.display = "flex";
};

closeImageModal.addEventListener("click", () => {
  imageModal.style.display = "none";
});

imageModal.addEventListener("click", (e) => {
  if (e.target === imageModal) imageModal.style.display = "none";
});

// ==================== ESCAPING & UTILS ====================
function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJs(text) {
  if (!text) return "";
  return text.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, ' ');
}

function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: underline;">${url}</a>`;
  });
}

// Initial theme setup
initTheme();
