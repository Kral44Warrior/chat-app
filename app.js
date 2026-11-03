// ==================== STATE & USER ID ====================
function getStoredTag() {
  let tag = localStorage.getItem("chat_tag");
  if (!tag || tag.length !== 4 || isNaN(tag)) {
    tag = String(Math.floor(1000 + Math.random() * 9000));
    localStorage.setItem("chat_tag", tag);
  }
  return tag;
}

let currentUser = {
  username: localStorage.getItem("chat_username") || "",
  tag: getStoredTag(),
  get handle() {
    return `${this.username}#${this.tag}`;
  },
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
let onlineUsers = []; // [{ username, tag, handle }]
let replyTarget = null;
let mediaRecorder = null;
let audioChunks = [];
let recTimerInterval = null;
let typingTimeout = null;
let unreadCounts = {};
let currentFacingMode = "user"; // 'user' (selfie) or 'environment' (back)
let titleFlashInterval = null;
let originalDocTitle = document.title || "Chat - Anlık Sohbet";
let globalAudioCtx = null;
let callVibrateInterval = null;

// Screen Sharing
let isScreenSharing = false;
let screenStream = null;

// ==================== AUDIO SYNTHESIZER & UNLOCK ====================
function createWavDataUri(sampleRate, samples) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeStr(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(binary);
}

function generateNotifWav() {
  const rate = 22050;
  const len = Math.floor(rate * 0.35);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / rate;
    const freq = t < 0.12 ? 587.33 : 880;
    const decay = Math.exp(-t * 8);
    samples[i] = Math.sin(2 * Math.PI * freq * t) * decay * 0.6;
  }
  return createWavDataUri(rate, samples);
}

function generateRingtoneWav() {
  const rate = 22050;
  const len = Math.floor(rate * 2.5);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / rate;
    if (t < 1.2) {
      const warble = Math.sin(2 * Math.PI * 20 * t);
      const tone1 = Math.sin(2 * Math.PI * 440 * t);
      const tone2 = Math.sin(2 * Math.PI * 480 * t);
      samples[i] = (tone1 + tone2) * 0.35 * (0.8 + 0.2 * warble);
    } else {
      samples[i] = 0;
    }
  }
  return createWavDataUri(rate, samples);
}

function initAudioElements() {
  try {
    const notifEl = document.getElementById("audio-notif");
    const ringEl = document.getElementById("audio-ringtone");
    if (notifEl && !notifEl.src) notifEl.src = generateNotifWav();
    if (ringEl && !ringEl.src) ringEl.src = generateRingtoneWav();
  } catch (e) {}
}

function unlockAudio() {
  try {
    if (!globalAudioCtx) {
      globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (globalAudioCtx.state === "suspended") {
      globalAudioCtx.resume();
    }
    const notifEl = document.getElementById("audio-notif");
    if (notifEl) {
      notifEl.play().then(() => { notifEl.pause(); notifEl.currentTime = 0; }).catch(() => {});
    }
    const remAudio = document.getElementById("remote-audio");
    if (remAudio) {
      remAudio.play().catch(() => {});
    }
  } catch (e) {}
}

document.addEventListener("click", unlockAudio, { once: true });
document.addEventListener("touchstart", unlockAudio, { once: true });
document.addEventListener("keydown", unlockAudio, { once: true });

function playNotificationSound() {
  unlockAudio();
  try {
    const notifEl = document.getElementById("audio-notif");
    if (notifEl) {
      notifEl.currentTime = 0;
      notifEl.volume = 1.0;
      notifEl.play().catch(() => {});
    }
  } catch (e) {}

  try {
    if (globalAudioCtx && globalAudioCtx.state === "running") {
      const osc = globalAudioCtx.createOscillator();
      const gain = globalAudioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, globalAudioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, globalAudioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.45, globalAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, globalAudioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(globalAudioCtx.destination);
      osc.start();
      osc.stop(globalAudioCtx.currentTime + 0.3);
    }
  } catch (e) {}

  if (navigator.vibrate) {
    try { navigator.vibrate([150, 60, 150]); } catch (e) {}
  }
}

function playRingtone() {
  unlockAudio();
  stopRingtone();

  try {
    const ringEl = document.getElementById("audio-ringtone");
    if (ringEl) {
      ringEl.currentTime = 0;
      ringEl.volume = 1.0;
      ringEl.loop = true;
      ringEl.play().catch(() => {});
    }
  } catch (e) {}

  if (navigator.vibrate) {
    try { navigator.vibrate([600, 300, 600, 300]); } catch (e) {}
    callVibrateInterval = setInterval(() => {
      try { navigator.vibrate([600, 300, 600, 300]); } catch (e) {}
    }, 1800);
  }
}

function stopRingtone() {
  try {
    const ringEl = document.getElementById("audio-ringtone");
    if (ringEl) {
      ringEl.pause();
      ringEl.currentTime = 0;
    }
  } catch (e) {}

  if (callVibrateInterval) {
    clearInterval(callVibrateInterval);
    callVibrateInterval = null;
  }
  if (navigator.vibrate) {
    try { navigator.vibrate(0); } catch (e) {}
  }
  stopTitleFlash();
}

// ==================== SYSTEM NOTIFICATIONS & FLASHING ====================
function initNotifications() {
  const banner = document.getElementById("notif-permission-banner");
  const btn = document.getElementById("enable-notif-btn");

  if (!("Notification" in window)) {
    if (banner) banner.style.display = "none";
    return;
  }

  if (Notification.permission === "default") {
    if (banner) banner.style.display = "flex";
  } else {
    if (banner) banner.style.display = "none";
  }

  if (btn) {
    btn.addEventListener("click", async () => {
      unlockAudio();
      try {
        const res = await Notification.requestPermission();
        if (res === "granted") {
          showToast("Bildirimler başarıyla açıldı! 🔔");
          if (banner) banner.style.display = "none";
        } else {
          showToast("Bildirim izni verilmedi.");
        }
      } catch (e) {}
    });
  }
}

function sendSystemNotification(title, body, tag = "chat-notif") {
  if (("Notification" in window) && Notification.permission === "granted") {
    if (document.hidden || !document.hasFocus()) {
      try {
        const notif = new Notification(title, {
          body: body,
          icon: "/favicon.ico",
          tag: tag,
          renotify: true
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {}
    }
  }
}

function startTitleFlash(text) {
  stopTitleFlash();
  let toggle = false;
  titleFlashInterval = setInterval(() => {
    document.title = toggle ? text : originalDocTitle;
    toggle = !toggle;
  }, 900);
}

function stopTitleFlash() {
  if (titleFlashInterval) {
    clearInterval(titleFlashInterval);
    titleFlashInterval = null;
  }
  document.title = originalDocTitle;
}

window.addEventListener("focus", stopTitleFlash);

// ==================== TOAST NOTIFICATION ====================
function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast-msg";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3600);
}

// ==================== DOM ELEMENTS ====================
const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username-input");
const userTagInput = document.getElementById("user-tag-input");
const randomTagBtn = document.getElementById("random-tag-btn");
const avatarColors = document.getElementById("avatar-colors");
const appLayout = document.getElementById("app-layout");
const myAvatar = document.getElementById("my-avatar");
const myNameDisplay = document.getElementById("my-name-display");
const myTagDisplay = document.getElementById("my-tag-display");
const themeToggle = document.getElementById("theme-toggle");
const logoutBtn = document.getElementById("logout-btn");
const chatSearch = document.getElementById("chat-search");
const navTabs = document.querySelectorAll(".nav-tab");
const tabContents = document.querySelectorAll(".tab-content");
const roomsList = document.getElementById("rooms-list");
const usersList = document.getElementById("users-list");
const onlineCount = document.getElementById("online-count");
const activeChatAvatar = document.getElementById("active-chat-avatar");
const activeChatTitle = document.getElementById("active-chat-title");
const activeChatStatus = document.getElementById("active-chat-status");
const mobileBackBtn = document.getElementById("mobile-back-btn");
const scrollBottomBtn = document.getElementById("scroll-bottom-btn");
const messagesContainer = document.getElementById("messages-container");
const typingBar = document.getElementById("typing-bar");
const typingText = document.getElementById("typing-text");
const replyBanner = document.getElementById("reply-banner");
const replySender = document.getElementById("reply-sender");
const replyPreview = document.getElementById("reply-preview");
const cancelReplyBtn = document.getElementById("cancel-reply-btn");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const emojiBtn = document.getElementById("emoji-btn");
const emojiPicker = document.getElementById("emoji-picker");
const attachBtn = document.getElementById("attach-btn");
const fileInput = document.getElementById("file-input");
const voiceBtn = document.getElementById("voice-btn");
const recordingBar = document.getElementById("recording-bar");
const recTimer = document.getElementById("rec-timer");
const cancelRecBtn = document.getElementById("cancel-rec-btn");
const sendRecBtn = document.getElementById("send-rec-btn");
const imageModal = document.getElementById("image-modal");
const modalImg = document.getElementById("modal-img");
const closeImageModal = document.getElementById("close-image-modal");

// Header actions
const voiceCallBtn = document.getElementById("voice-call-btn");
const videoCallBtn = document.getElementById("video-call-btn");
const searchChatBtn = document.getElementById("search-chat-btn");
const inChatSearchBar = document.getElementById("in-chat-search-bar");
const inChatSearchInput = document.getElementById("in-chat-search-input");
const searchResultCount = document.getElementById("search-result-count");
const closeInChatSearch = document.getElementById("close-in-chat-search");

// Modals
const callPickerModal = document.getElementById("call-picker-modal");
const callPickerList = document.getElementById("call-picker-list");
const closeCallPickerBtn = document.getElementById("close-call-picker-btn");
const incomingCallModal = document.getElementById("incoming-call-modal");
const activeCallModal = document.getElementById("active-call-modal");

// ==================== THEME MANAGEMENT ====================
function initTheme() {
  const savedTheme = localStorage.getItem("chat_theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.remove("dark-theme");
    document.body.classList.add("light-theme");
    themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
  } else {
    document.body.classList.remove("light-theme");
    document.body.classList.add("dark-theme");
    themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }
}

themeToggle.addEventListener("click", () => {
  if (document.body.classList.contains("dark-theme")) {
    document.body.classList.remove("dark-theme");
    document.body.classList.add("light-theme");
    themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    localStorage.setItem("chat_theme", "light");
  } else {
    document.body.classList.remove("light-theme");
    document.body.classList.add("dark-theme");
    themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    localStorage.setItem("chat_theme", "dark");
  }
});

// ==================== LOGIN & START ====================
if (userTagInput) {
  userTagInput.value = currentUser.tag;
}

if (randomTagBtn) {
  randomTagBtn.addEventListener("click", () => {
    const newTag = String(Math.floor(1000 + Math.random() * 9000));
    currentUser.tag = newTag;
    localStorage.setItem("chat_tag", newTag);
    if (userTagInput) userTagInput.value = newTag;
    showToast(`Yeni ID: #${newTag}`);
  });
}

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

  let tagVal = userTagInput ? userTagInput.value.trim() : "";
  if (!tagVal || tagVal.length !== 4 || isNaN(tagVal)) {
    tagVal = currentUser.tag;
  }

  currentUser.username = val;
  currentUser.tag = tagVal;
  localStorage.setItem("chat_username", currentUser.username);
  localStorage.setItem("chat_tag", currentUser.tag);
  localStorage.setItem("chat_color", currentUser.color);
  unlockAudio();
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
  if (myTagDisplay) {
    myTagDisplay.innerHTML = `#${currentUser.tag} <i class="fa-regular fa-copy"></i>`;
    myTagDisplay.onclick = () => {
      navigator.clipboard.writeText(currentUser.handle).then(() => {
        showToast(`ID Kopyalandı: ${currentUser.handle}`);
      }).catch(() => {
        showToast(currentUser.handle);
      });
    };
  }

  initAudioElements();
  initNotifications();
  initEmojiPicker();

  loadRooms().then(() => {
    connectWebSocket();
    switchChat("genel", "Genel Sohbet", false);
  });
}

// Auto-login
if (currentUser.username) {
  enterApp();
} else {
  loginModal.style.display = "flex";
}

// ==================== WEBSOCKET ====================
function connectWebSocket() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${location.host}/ws?username=${encodeURIComponent(currentUser.username)}&tag=${encodeURIComponent(currentUser.tag)}`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("WebSocket bağlandı:", currentUser.handle);
    if (activeChat.id) {
      socket.send(JSON.stringify({ action: "join_room", room_id: activeChat.id }));
    }
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleSocketMessage(data);
    } catch (e) {
      console.error("Mesaj parse hatası:", e);
    }
  };

  socket.onclose = () => {
    console.warn("WebSocket koptu, yeniden bağlanılıyor...");
    setTimeout(connectWebSocket, 2500);
  };
}

function handleSocketMessage(data) {
  if (data.type === "online_users") {
    const rawUsers = data.users || [];
    onlineUsers = rawUsers
      .map(u => typeof u === "string" ? { username: u.split("#")[0], tag: u.split("#")[1] || "0000", handle: u } : u)
      .filter(u => u.handle.toLowerCase() !== currentUser.handle.toLowerCase());

    onlineCount.textContent = onlineUsers.length;
    renderUsersList();
    updateActiveChatStatus();
  } else if (data.type === "new_message") {
    if (data.room_id === activeChat.id) {
      appendMessage(data);
      scrollToBottom();
      if (data.sender !== currentUser.handle && data.sender !== currentUser.username) {
        playNotificationSound();
        const displaySender = data.sender.split("#")[0];
        sendSystemNotification(`💬 ${displaySender}`, data.content || "Dosya gönderdi");
        startTitleFlash(`💬 ${displaySender}: ${data.content || 'Yeni Mesaj'}`);
        markActiveRoomAsRead();
      }
    } else {
      unreadCounts[data.room_id] = (unreadCounts[data.room_id] || 0) + 1;
      updateBadge(data.room_id);
      playNotificationSound();
      const displaySender = data.sender.split("#")[0];
      sendSystemNotification(`💬 ${displaySender}`, data.content || "Yeni mesaj");
      startTitleFlash(`🔔 (1) Yeni Mesaj - ${displaySender}`);
    }
  } else if (data.type === "user_typing") {
    if (data.room_id === activeChat.id && data.user !== currentUser.handle && data.user !== currentUser.username) {
      const displayUser = data.user.split("#")[0];
      if (data.is_typing) {
        typingText.textContent = `${displayUser} yazıyor...`;
        typingBar.style.display = "flex";
      } else {
        typingBar.style.display = "none";
      }
    }
  } else if (data.type === "messages_read") {
    if (data.room_id === activeChat.id) {
      document.querySelectorAll(".message-row.me .msg-tick").forEach(tickEl => {
        tickEl.className = "fa-solid fa-check-double msg-tick read";
        tickEl.title = "Okundu (2 Mavi Tik)";
      });
    }
  } else if (data.type === "messages_delivered") {
    document.querySelectorAll(".message-row.me .msg-tick").forEach(tickEl => {
      if (!tickEl.classList.contains("read")) {
        tickEl.className = "fa-solid fa-check-double msg-tick";
        tickEl.title = "İletildi (2 Beyaz Tik)";
      }
    });
  } else if (data.type === "incoming_call") {
    handleIncomingCall(data);
  } else if (data.type === "call_response") {
    handleCallResponse(data);
  } else if (data.type === "webrtc_signal") {
    handleWebRTCSignal(data);
  } else if (data.type === "call_ended") {
    showToast(`${data.sender.split("#")[0]} aramayı sonlandırdı.`);
    endCall(false);
  } else if (data.type === "call_error") {
    showToast(data.message || "Arama başlatılamadı.");
    endCall(false);
  } else if (data.type === "message_reaction") {
    if (data.room_id === activeChat.id) {
      updateReactionsInDOM(data.msg_id, data.reactions);
    }
  }
}

// ==================== ROOMS & CHATS (MOBILE FIXED) ====================
async function loadRooms() {
  try {
    const res = await fetch("/api/rooms");
    rooms = await res.json();
    renderRoomsList();
  } catch (e) {
    console.error("Odalar yüklenemedi:", e);
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

    item.addEventListener("click", () => switchChat(r.id, r.name, false));
    roomsList.appendChild(item);
  });
}

function renderUsersList() {
  usersList.innerHTML = "";
  if (onlineUsers.length === 0) {
    usersList.innerHTML = `
      <div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 13px;">
        Şu anda çevrimiçi başka arkadaşınız yok.<br>
        Farklı bir sekmeden veya telefondan girip ID'niz ile test edebilirsiniz!
      </div>
    `;
    return;
  }

  onlineUsers.forEach(u => {
    const dmRoomId = getDmRoomId(currentUser.handle, u.handle);
    const item = document.createElement("div");
    item.className = `chat-item ${dmRoomId === activeChat.id ? "active" : ""}`;
    item.dataset.roomId = dmRoomId;

    const unread = unreadCounts[dmRoomId] || 0;
    const color = stringToColor(u.username);

    item.innerHTML = `
      <div class="avatar" style="background: ${color};">${getInitials(u.username)}</div>
      <div class="chat-item-info">
        <div class="top-row">
          <span class="name">${escapeHtml(u.username)} <span class="user-tag">#${u.tag}</span></span>
          <span class="time"><span class="status-indicator online"></span></span>
        </div>
        <div class="bottom-row">
          <span class="preview">Özel sohbet için tıkla</span>
          ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ""}
        </div>
      </div>
      <div class="user-row-actions">
        <button class="user-action-btn voice" title="Sesli Ara">
          <i class="fa-solid fa-phone"></i>
        </button>
        <button class="user-action-btn video" title="Görüntülü Ara">
          <i class="fa-solid fa-video"></i>
        </button>
      </div>
    `;

    // Row click opens DM
    item.addEventListener("click", () => switchChat(dmRoomId, u.username, true, u.handle));

    // Direct Voice Call button
    const vBtn = item.querySelector(".user-action-btn.voice");
    if (vBtn) {
      vBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        startCallTo(u.handle, false);
      });
    }

    // Direct Video Call button
    const vidBtn = item.querySelector(".user-action-btn.video");
    if (vidBtn) {
      vidBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        startCallTo(u.handle, true);
      });
    }

    usersList.appendChild(item);
  });
}

function updateActiveChatStatus() {
  if (activeChat.isDirect && activeChat.recipient) {
    const isOnline = onlineUsers.some(u => 
      u.handle.toLowerCase() === activeChat.recipient.toLowerCase() ||
      u.username.toLowerCase() === activeChat.recipient.toLowerCase()
    );
    activeChatStatus.innerHTML = isOnline 
      ? '<span class="status-indicator online"></span> Çevrimiçi' 
      : '<span class="status-indicator"></span> Çevrimdışı';
  }
}

function getDmRoomId(user1Handle, user2Handle) {
  const sorted = [user1Handle.toLowerCase(), user2Handle.toLowerCase()].sort();
  return `dm_${sorted[0]}__${sorted[1]}`;
}

async function switchChat(roomId, name, isDirect = false, recipient = "") {
  activeChat.id = roomId;
  activeChat.name = name;
  activeChat.isDirect = isDirect;
  activeChat.recipient = recipient;

  unreadCounts[roomId] = 0;
  updateBadge(roomId);

  activeChatTitle.textContent = name;
  if (isDirect) {
    activeChatAvatar.textContent = getInitials(name);
    activeChatAvatar.style.background = stringToColor(name);
    updateActiveChatStatus();
  } else {
    activeChatAvatar.textContent = "💬";
    activeChatAvatar.style.background = "#3b82f6";
    activeChatStatus.textContent = "Herkes için sohbet odası";
  }

  document.querySelectorAll(".chat-item").forEach(el => {
    el.classList.toggle("active", el.dataset.roomId === roomId);
  });

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: "join_room", room_id: roomId }));
  }

  closeInChatSearchBarFunc();
  await loadMessages(roomId);

  // Mobile navigation: open chat screen seamlessly!
  appLayout.classList.add("chat-open");
  appLayout.classList.add("mobile-chat-open");
}

mobileBackBtn.addEventListener("click", () => {
  appLayout.classList.remove("chat-open");
  appLayout.classList.remove("mobile-chat-open");
});

function updateBadge(roomId) {
  const items = document.querySelectorAll(`.chat-item[data-room-id="${roomId}"]`);
  items.forEach(item => {
    const count = unreadCounts[roomId] || 0;
    let badge = item.querySelector(".unread-badge");
    if (count > 0) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "unread-badge";
        item.querySelector(".bottom-row").appendChild(badge);
      }
      badge.textContent = count;
    } else if (badge) {
      badge.remove();
    }
  });
}

// ==================== TABS ====================
navTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    navTabs.forEach(t => t.classList.remove("active"));
    tabContents.forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    document.getElementById(`${target}-list`).classList.add("active");
  });
});

chatSearch.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase().trim();
  document.querySelectorAll(".chat-item").forEach(item => {
    const nameEl = item.querySelector(".name");
    const name = nameEl ? nameEl.textContent.toLowerCase() : "";
    item.style.display = name.includes(query) ? "flex" : "none";
  });
});

// ==================== MESSAGES & TICKS ====================
async function loadMessages(roomId) {
  messagesContainer.innerHTML = "<div style='text-align:center; padding:20px; color:var(--text-muted);'>Yükleniyor...</div>";
  try {
    const res = await fetch(`/api/messages?room_id=${encodeURIComponent(roomId)}`);
    const data = await res.json();
    messagesContainer.innerHTML = "";

    if (data.length === 0) {
      messagesContainer.innerHTML = `
        <div class="welcome-box">
          <div class="welcome-icon">💬</div>
          <h3>${escapeHtml(activeChat.name)}</h3>
          <p>Henüz mesaj yok. İlk mesajı siz gönderin!</p>
        </div>
      `;
    } else {
      data.forEach(m => appendMessage(m));
      scrollToBottom();
      markActiveRoomAsRead();
    }
  } catch (e) {
    messagesContainer.innerHTML = "<div style='text-align:center; padding:20px; color:#ef4444;'>Mesajlar yüklenemedi.</div>";
  }
}

function getTickIconHTML(status) {
  if (status === "read") {
    return '<i class="fa-solid fa-check-double msg-tick read" title="Okundu (2 Mavi Tik)"></i>';
  } else if (status === "delivered") {
    return '<i class="fa-solid fa-check-double msg-tick" title="İletildi (2 Beyaz Tik)"></i>';
  } else {
    return '<i class="fa-solid fa-check msg-tick" title="Gönderildi (1 Beyaz Tik)"></i>';
  }
}

function markActiveRoomAsRead() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      action: "read_messages",
      room_id: activeChat.id
    }));
  }
}

function appendMessage(m) {
  const isMe = m.sender === currentUser.handle || m.sender === currentUser.username;
  const row = document.createElement("div");
  row.className = `message-row ${isMe ? "me" : "other"}`;
  row.dataset.msgId = m.id;

  const timeStr = m.timestamp ? m.timestamp.split(" ")[1].slice(0, 5) : "";
  const displaySender = m.sender ? m.sender.split("#")[0] : "";

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
      <div class="file-attachment">
        <div class="file-icon"><i class="fa-solid fa-file-lines"></i></div>
        <div class="file-info">
          <span class="file-name">${escapeHtml(m.file_name || "Dosya")}</span>
          <span class="file-size">${formatBytes(m.file_size || 0)}</span>
        </div>
        <a href="${m.file_url}" download class="file-download-btn"><i class="fa-solid fa-download"></i></a>
      </div>
      ${m.content ? `<div style="margin-top: 6px;">${linkify(escapeHtml(m.content))}</div>` : ""}
    `;
  } else {
    bodyContent += `<div class="msg-text">${linkify(escapeHtml(m.content))}</div>`;
  }

  let replyHTML = "";
  if (m.reply_to_id && m.reply_to_text) {
    replyHTML = `
      <div class="msg-reply-quote" onclick="scrollToMessage('${m.reply_to_id}')">
        <strong class="quote-sender">${escapeHtml(m.reply_to_sender || "")}</strong>
        <p class="quote-text">${escapeHtml(m.reply_to_text)}</p>
      </div>
    `;
  }

  let reactionsHTML = "<div class='reactions-container'></div>";

  row.innerHTML = `
    <div class="bubble">
      ${!isMe && !activeChat.isDirect ? `<span class="sender-name" style="color: ${stringToColor(displaySender)}">${escapeHtml(displaySender)}</span>` : ""}
      ${replyHTML}
      <div class="bubble-body">${bodyContent}</div>
      <div class="bubble-meta">
        <span class="msg-time">${timeStr}</span>
        ${isMe ? getTickIconHTML(m.status) : ""}
      </div>
      ${reactionsHTML}
    </div>
    <div class="msg-actions">
      <button class="action-btn reply-btn" title="Yanıtla" onclick="setReplyTarget('${m.id}', '${escapeHtml(displaySender)}', '${escapeHtml(m.content || (m.msg_type === 'image' ? '📷 Fotoğraf' : '🎤 Ses'))}')">
        <i class="fa-solid fa-reply"></i>
      </button>
      <button class="action-btn react-btn" title="Tepki Ver" onclick="showQuickReactions(this, '${m.id}')">
        <i class="fa-regular fa-face-smile"></i>
      </button>
    </div>
  `;

  messagesContainer.appendChild(row);
  renderReactions(row.querySelector(".reactions-container"), m.reactions || {}, m.id);
}

function scrollToBottom() {
  setTimeout(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 50);
}

messagesContainer.addEventListener("scroll", () => {
  const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 150;
  scrollBottomBtn.style.display = isNearBottom ? "none" : "flex";
});
scrollBottomBtn.addEventListener("click", scrollToBottom);

// ==================== SENDING MESSAGES ====================
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      action: "send_message",
      room_id: activeChat.id,
      content: text,
      msg_type: "text",
      reply_to_id: replyTarget ? replyTarget.id : null,
      reply_to_text: replyTarget ? replyTarget.text : null,
      reply_to_sender: replyTarget ? replyTarget.sender : null
    }));
  }

  messageInput.value = "";
  messageInput.style.height = "auto";
  cancelReply();
  sendTypingStatus(false);
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

messageInput.addEventListener("input", () => {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px";

  sendTypingStatus(true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => sendTypingStatus(false), 2000);
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

// ==================== REPLY ====================
function setReplyTarget(id, sender, text) {
  replyTarget = { id, sender, text };
  replySender.textContent = sender;
  replyPreview.textContent = text;
  replyBanner.style.display = "flex";
  messageInput.focus();
}

function cancelReply() {
  replyTarget = null;
  replyBanner.style.display = "none";
}
cancelReplyBtn.addEventListener("click", cancelReply);

// ==================== REACTIONS ====================
function showQuickReactions(btnEl, msgId) {
  document.querySelectorAll(".quick-reactions-pop").forEach(p => p.remove());

  const pop = document.createElement("div");
  pop.className = "quick-reactions-pop";
  const emojis = ["👍", "❤️", "😂", "🔥", "😮", "😢", "👏"];
  emojis.forEach(em => {
    const s = document.createElement("span");
    s.textContent = em;
    s.onclick = () => {
      sendReaction(msgId, em);
      pop.remove();
    };
    pop.appendChild(s);
  });

  btnEl.parentNode.appendChild(pop);
  setTimeout(() => {
    document.addEventListener("click", function handler(e) {
      if (!pop.contains(e.target) && e.target !== btnEl) {
        pop.remove();
        document.removeEventListener("click", handler);
      }
    });
  }, 50);
}

function sendReaction(msgId, emoji) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      action: "reaction",
      room_id: activeChat.id,
      msg_id: msgId,
      emoji: emoji
    }));
  }
}

function updateReactionsInDOM(msgId, reactions) {
  const row = document.querySelector(`.message-row[data-msg-id="${msgId}"]`);
  if (row) {
    const cont = row.querySelector(".reactions-container");
    renderReactions(cont, reactions, msgId);
  }
}

function renderReactions(cont, reactions, msgId) {
  if (!cont) return;
  cont.innerHTML = "";
  Object.keys(reactions).forEach(emoji => {
    const users = reactions[emoji];
    if (users && users.length > 0) {
      const tag = document.createElement("span");
      const hasMyReaction = users.includes(currentUser.handle) || users.includes(currentUser.username);
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
  formData.append("room_id", activeChat.id);
  formData.append("sender", currentUser.handle);

  showToast("Dosya yükleniyor...");
  try {
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Yükleme hatası");
    fileInput.value = "";
    showToast("Dosya başarıyla gönderildi!");
  } catch (err) {
    alert("Dosya yüklenemedi: " + err.message);
  }
});

// ==================== VOICE RECORDER ====================
voiceBtn.addEventListener("click", async () => {
  unlockAudio();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Tarayıcınız ses kaydını desteklemiyor.");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    startRecording(stream);
  } catch (e) {
    alert("Mikrofon erişim izni verilmedi.");
  }
});

function startRecording(stream) {
  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    stream.getTracks().forEach(t => t.stop());
  };

  mediaRecorder.start();
  recordingBar.style.display = "flex";
  let sec = 0;
  recTimer.textContent = "00:00";
  recTimerInterval = setInterval(() => {
    sec++;
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    recTimer.textContent = `${m}:${s}`;
  }, 1000);
}

cancelRecBtn.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  clearInterval(recTimerInterval);
  recordingBar.style.display = "none";
  audioChunks = [];
});

sendRecBtn.addEventListener("click", () => {
  if (!mediaRecorder || mediaRecorder.state === "inactive") return;
  clearInterval(recTimerInterval);
  recordingBar.style.display = "none";

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("file", audioBlob, `voice_${Date.now()}.webm`);
    formData.append("room_id", activeChat.id);
    formData.append("sender", currentUser.handle);

    showToast("Ses kaydı gönderiliyor...");
    try {
      await fetch("/api/upload", { method: "POST", body: formData });
    } catch (e) {
      alert("Ses kaydı yüklenemedi.");
    }
  };

  mediaRecorder.stop();
});

// ==================== CATEGORIZED EMOJI PICKER (JS GENERATED) ====================
const EMOJI_CATEGORIES = [
  {
    id: "faces",
    icon: "😊",
    title: "Yüzler & İfadeler",
    emojis: [
      "😀","😃","😄","😁","😆","😅","😂","🤣","🥲","🥹","☺️","😊","😇","🙂","🙃","😉",
      "😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎",
      "🥸","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺",
      "😢","😭","😮‍💨","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓",
      "🤗","🤔","🫣","🤭","🫢","🫡","🤫","🫠","🤥","😶","🫥","😐","😑","😬","🙄","😯",
      "😦","😧","😮","😲","🥱","😴","🤤","😪","😵","😵‍💫","🤐","🥴","🤢","🤮","🤧","😷",
      "🤒","🤕","🤑","🤠","😈","👿","👹","👺","🤡","💩","👻","💀","☠️","👽","👾","🤖"
    ]
  },
  {
    id: "gestures",
    icon: "👍",
    title: "El & Beden Hareketleri",
    emojis: [
      "👍","👎","👊","✊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✌️","🤞","🤟","🤘",
      "👌","🤌","🤏","👈","👉","👆","👇","☝️","✋","🤚","🖐️","🖖","👋","🤙","🫲","🫱",
      "💪","🦾","🖕","✍️","🤳","💅","👀","👁️"
    ]
  },
  {
    id: "hearts",
    icon: "❤️",
    title: "Kalpler & Aşk",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓",
      "💗","💖","💘","💝","💟","♥️","💋","💌"
    ]
  },
  {
    id: "fire",
    icon: "🔥",
    title: "Ateş & Havalı",
    emojis: [
      "🔥","✨","⭐","🌟","💫","💥","💢","💯","🎉","🎊","🎈","🍾","🏆","👑","💎","⚡",
      "🚀","🎯","🥇","🥈","🥉","🎖️","🏵️","🔮"
    ]
  },
  {
    id: "objects",
    icon: "🎮",
    title: "Aktivite & Eşyalar",
    emojis: [
      "🎮","🕹️","🎲","🎯","🎳","⚽","🏀","🏈","⚾","🎾","🏐","🥊","🎱","🏓","🏸",
      "🚗","🏎️","🏍️","✈️","📱","💻","🎧","📷","🎵","🎶","🎙️","🔔","💡","☕","🍕"
    ]
  },
  {
    id: "animals",
    icon: "🐶",
    title: "Hayvanlar & Doğa",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔",
      "🐧","🐦","🦅","🦆","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜",
      "☀️","🌙","⭐","☁️","🌧️","⛈️","❄️","🌈"
    ]
  }
];

function initEmojiPicker() {
  const tabsContainer = document.getElementById("emoji-nav-tabs");
  const contentContainer = document.getElementById("emoji-scroll-content");
  if (!tabsContainer || !contentContainer) return;

  tabsContainer.innerHTML = "";
  contentContainer.innerHTML = "";

  EMOJI_CATEGORIES.forEach((cat, idx) => {
    // Tab Button
    const tabBtn = document.createElement("button");
    tabBtn.className = `emoji-nav-btn ${idx === 0 ? "active" : ""}`;
    tabBtn.textContent = cat.icon;
    tabBtn.title = cat.title;
    tabBtn.dataset.catId = cat.id;

    tabBtn.addEventListener("click", () => {
      document.querySelectorAll(".emoji-nav-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".emoji-grid-section").forEach(s => s.classList.remove("active"));
      tabBtn.classList.add("active");
      const targetSec = document.getElementById(`cat-grid-${cat.id}`);
      if (targetSec) targetSec.classList.add("active");
    });
    tabsContainer.appendChild(tabBtn);

    // Grid Section
    const gridSec = document.createElement("div");
    gridSec.className = `emoji-grid-section ${idx === 0 ? "active" : ""}`;
    gridSec.id = `cat-grid-${cat.id}`;

    cat.emojis.forEach(emojiChar => {
      const span = document.createElement("span");
      span.className = "emoji-item";
      span.textContent = emojiChar;
      span.addEventListener("click", () => {
        insertEmoji(emojiChar);
      });
      gridSec.appendChild(span);
    });

    contentContainer.appendChild(gridSec);
  });
}

function insertEmoji(char) {
  const start = messageInput.selectionStart;
  const end = messageInput.selectionEnd;
  const val = messageInput.value;
  messageInput.value = val.substring(0, start) + char + val.substring(end);
  messageInput.selectionStart = messageInput.selectionEnd = start + char.length;
  messageInput.focus();
  messageInput.dispatchEvent(new Event("input"));
}

emojiBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  emojiPicker.style.display = emojiPicker.style.display === "none" ? "flex" : "none";
});

document.addEventListener("click", (e) => {
  if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
    emojiPicker.style.display = "none";
  }
});

// ==================== IN-CHAT SEARCH ====================
searchChatBtn.addEventListener("click", () => {
  if (inChatSearchBar.style.display === "none") {
    inChatSearchBar.style.display = "flex";
    inChatSearchInput.focus();
  } else {
    closeInChatSearchBarFunc();
  }
});

closeInChatSearch.addEventListener("click", closeInChatSearchBarFunc);

function closeInChatSearchBarFunc() {
  inChatSearchBar.style.display = "none";
  inChatSearchInput.value = "";
  searchResultCount.textContent = "";
  clearSearchHighlights();
}

inChatSearchInput.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase().trim();
  const rows = document.querySelectorAll(".message-row");

  if (!query) {
    searchResultCount.textContent = "";
    clearSearchHighlights();
    return;
  }

  let matches = 0;
  rows.forEach(r => {
    const textEl = r.querySelector(".msg-text");
    if (textEl) {
      const txt = textEl.textContent.toLowerCase();
      if (txt.includes(query)) {
        r.classList.add("highlighted");
        r.style.opacity = "1";
        matches++;
      } else {
        r.classList.remove("highlighted");
        r.style.opacity = "0.3";
      }
    }
  });

  searchResultCount.textContent = matches > 0 ? `${matches} sonuç` : "Bulunamadı";
});

function clearSearchHighlights() {
  document.querySelectorAll(".message-row").forEach(r => {
    r.classList.remove("highlighted");
    r.style.opacity = "1";
  });
}

// ==================== WEBRTC CALLS (VOICE & VIDEO) ====================
let localStream = null;
let peerConnection = null;
let remoteStream = null;
let iceCandidateQueue = [];

let currentCall = {
  peerUser: null,
  isVideo: false,
  isCaller: false,
  timerInterval: null,
  seconds: 0
};

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.services.mozilla.com" }
  ],
  iceCandidatePoolSize: 10
};

// Header Call Buttons
if (voiceCallBtn) {
  voiceCallBtn.addEventListener("click", () => triggerCallFlow(false));
}
if (videoCallBtn) {
  videoCallBtn.addEventListener("click", () => triggerCallFlow(true));
}

function triggerCallFlow(isVideo) {
  unlockAudio();
  if (activeChat.isDirect && activeChat.recipient) {
    startCallTo(activeChat.recipient, isVideo);
    return;
  }

  if (onlineUsers.length === 0) {
    showToast("Şu anda çevrimiçi başka arkadaşınız yok. Arkadaşınız chat'e girdiğinde arayabilirsiniz!");
    return;
  }

  if (onlineUsers.length === 1) {
    startCallTo(onlineUsers[0].handle, isVideo);
    return;
  }

  openCallPicker(isVideo);
}

function openCallPicker(defaultIsVideo) {
  callPickerList.innerHTML = "";
  onlineUsers.forEach(u => {
    const item = document.createElement("div");
    item.className = "call-picker-item";
    item.innerHTML = `
      <div class="call-picker-user">
        <div class="avatar" style="background: ${stringToColor(u.username)}; width: 34px; height: 34px; font-size: 13px;">${getInitials(u.username)}</div>
        <span class="call-picker-name">${escapeHtml(u.username)} <span class="user-tag">#${u.tag}</span></span>
      </div>
      <div class="call-picker-actions">
        <button class="call-btn-chip voice">
          <i class="fa-solid fa-phone"></i> Sesli
        </button>
        <button class="call-btn-chip video">
          <i class="fa-solid fa-video"></i> Görüntülü
        </button>
      </div>
    `;

    item.querySelector(".call-btn-chip.voice").onclick = () => {
      closeCallPicker();
      startCallTo(u.handle, false);
    };
    item.querySelector(".call-btn-chip.video").onclick = () => {
      closeCallPicker();
      startCallTo(u.handle, true);
    };

    callPickerList.appendChild(item);
  });
  callPickerModal.style.display = "flex";
}

function closeCallPicker() {
  callPickerModal.style.display = "none";
}
if (closeCallPickerBtn) {
  closeCallPickerBtn.addEventListener("click", closeCallPicker);
}

// Start Call
async function startCallTo(targetUser, isVideo) {
  unlockAudio();
  if (!targetUser) return;

  currentCall.peerUser = targetUser;
  currentCall.isVideo = isVideo;
  currentCall.isCaller = true;
  iceCandidateQueue = [];

  try {
    const constraints = {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: isVideo ? { facingMode: { ideal: currentFacingMode }, width: { ideal: 640 }, height: { ideal: 480 } } : false
    };

    localStream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    console.warn("Medya erişim hatası:", err);
    if (isVideo) {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        currentCall.isVideo = false;
        isVideo = false;
        showToast("Kameraya ulaşılamadı, sesli arama olarak başlatıldı.");
      } catch (err2) {
        alert("Mikrofon izni verilmedi. Arama yapılamıyor.");
        return;
      }
    } else {
      alert("Mikrofon izni verilmedi. Arama yapılamıyor.");
      return;
    }
  }

  showActiveCallScreen(targetUser.split("#")[0], isVideo, localStream, true);
  playRingtone();
  startTitleFlash(`📞 ${targetUser.split("#")[0]} Aranıyor...`);

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      action: "call_user",
      target_user: targetUser,
      is_video: isVideo,
      room_id: activeChat.id
    }));
  }
}

// Incoming Call
function handleIncomingCall(data) {
  unlockAudio();
  currentCall.peerUser = data.caller;
  currentCall.isVideo = data.is_video;
  currentCall.isCaller = false;
  iceCandidateQueue = [];

  const callerDisplayName = data.caller.split("#")[0];
  document.getElementById("incoming-caller-name").textContent = data.caller;
  const avatarEl = document.getElementById("incoming-call-avatar");
  avatarEl.textContent = getInitials(callerDisplayName);
  avatarEl.style.background = stringToColor(callerDisplayName);

  const badgeEl = document.getElementById("incoming-call-badge");
  if (data.is_video) {
    badgeEl.textContent = "📹 GÖRÜNTÜLÜ ARAMA";
    badgeEl.className = "call-badge-pill video-badge";
    document.getElementById("incoming-call-type").textContent = "Görüntülü WhatsApp Araması...";
  } else {
    badgeEl.textContent = "📞 SESLİ ARAMA";
    badgeEl.className = "call-badge-pill";
    document.getElementById("incoming-call-type").textContent = "Sesli WhatsApp Araması...";
  }

  incomingCallModal.style.display = "flex";
  playRingtone();
  startTitleFlash(`📞 ${callerDisplayName} Arıyor...`);
  sendSystemNotification(`📞 ${callerDisplayName} Arıyor!`, data.is_video ? "Görüntülü arama başlatıldı..." : "Sesli arama başlatıldı...");
}

// Accept / Decline Buttons
const declineCallBtn = document.getElementById("decline-call-btn");
const acceptCallBtn = document.getElementById("accept-call-btn");

if (declineCallBtn) {
  declineCallBtn.addEventListener("click", () => {
    stopRingtone();
    incomingCallModal.style.display = "none";
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        action: "call_response",
        target_user: currentCall.peerUser,
        accepted: false
      }));
    }
    endCall(false);
  });
}

if (acceptCallBtn) {
  acceptCallBtn.addEventListener("click", async () => {
    unlockAudio();
    stopRingtone();
    incomingCallModal.style.display = "none";

    try {
      const constraints = {
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: currentCall.isVideo ? { facingMode: { ideal: currentFacingMode }, width: { ideal: 640 }, height: { ideal: 480 } } : false
      };
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      console.warn("Cevaplama medya hatası:", e);
      if (currentCall.isVideo) {
        try {
          localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          currentCall.isVideo = false;
        } catch (e2) {
          alert("Mikrofon izni verilmedi.");
          socket.send(JSON.stringify({
            action: "call_response",
            target_user: currentCall.peerUser,
            accepted: false
          }));
          return;
        }
      } else {
        alert("Mikrofon izni verilmedi.");
        socket.send(JSON.stringify({
          action: "call_response",
          target_user: currentCall.peerUser,
          accepted: false
        }));
        return;
      }
    }

    showActiveCallScreen(currentCall.peerUser.split("#")[0], currentCall.isVideo, localStream, false);
    setupPeerConnection();

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        action: "call_response",
        target_user: currentCall.peerUser,
        accepted: true
      }));
    }
  });
}

// Call Response Handler
async function handleCallResponse(data) {
  stopRingtone();
  const responderName = data.responder.split("#")[0];
  if (!data.accepted) {
    showToast(`${responderName} aramayı reddetti veya yanıt veremiyor.`);
    endCall(false);
  } else {
    showToast(`${responderName} aramayı kabul etti! Bağlanıyor...`);
    currentCall.peerUser = data.responder;
    const statusSub = document.getElementById("audio-call-status");
    if (statusSub) statusSub.textContent = "Bağlanıyor...";

    setupPeerConnection();
    ensureLocalTracksAdded();

    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: currentCall.isVideo
    });
    await peerConnection.setLocalDescription(offer);

    socket.send(JSON.stringify({
      action: "webrtc_signal",
      target_user: currentCall.peerUser,
      signal: { type: "offer", sdp: offer.sdp }
    }));
  }
}

// Peer Connection Setup
function setupPeerConnection() {
  if (peerConnection) {
    try { peerConnection.close(); } catch (e) {}
  }
  peerConnection = new RTCPeerConnection(rtcConfig);
  remoteStream = new MediaStream();

  ensureLocalTracksAdded();

  peerConnection.ontrack = (event) => {
    console.log("WebRTC ontrack event:", event.track.kind, event.streams);
    const stream = (event.streams && event.streams[0]) ? event.streams[0] : null;

    if (stream) {
      remoteStream = stream;
    } else {
      remoteStream.addTrack(event.track);
    }

    // Connect to video element
    const remoteVideo = document.getElementById("remote-video");
    if (remoteVideo) {
      remoteVideo.srcObject = remoteStream;
      remoteVideo.play().catch(e => console.warn("Remote video play error:", e));
    }

    // Connect to dedicated audio element for guaranteed sound
    const remoteAudio = document.getElementById("remote-audio");
    if (remoteAudio) {
      remoteAudio.srcObject = remoteStream;
      remoteAudio.play().catch(e => console.warn("Remote audio play error:", e));
    }
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate && currentCall.peerUser) {
      socket.send(JSON.stringify({
        action: "webrtc_signal",
        target_user: currentCall.peerUser,
        signal: { type: "candidate", candidate: event.candidate }
      }));
    }
  };

  peerConnection.onconnectionstatechange = () => {
    console.log("WebRTC Connection State:", peerConnection.connectionState);
    if (peerConnection.connectionState === "connected") {
      showToast("Görüşme bağlandı! 🟢");
      const statusSub = document.getElementById("audio-call-status");
      if (statusSub) statusSub.textContent = "Bağlandı (Görüşülüyor)";
    } else if (peerConnection.connectionState === "failed" || peerConnection.connectionState === "disconnected") {
      showToast("Görüşme bağlantısı koptu.");
    }
  };

  startCallTimer();
}

function ensureLocalTracksAdded() {
  if (!peerConnection || !localStream) return;
  const senders = peerConnection.getSenders();
  localStream.getTracks().forEach(track => {
    const existing = senders.find(s => s.track && s.track.kind === track.kind);
    if (!existing) {
      peerConnection.addTrack(track, localStream);
    }
  });
}

async function handleWebRTCSignal(data) {
  const signal = data.signal;
  if (!signal) return;

  if (!peerConnection) {
    setupPeerConnection();
  }
  ensureLocalTracksAdded();

  if (signal.type === "offer") {
    currentCall.peerUser = data.sender;
    const sdpStr = typeof signal.sdp === "string" ? signal.sdp : (signal.sdp ? signal.sdp.sdp : "");
    await peerConnection.setRemoteDescription(new RTCSessionDescription({
      type: "offer",
      sdp: sdpStr
    }));

    // Process queued candidates
    while (iceCandidateQueue.length > 0) {
      const cand = iceCandidateQueue.shift();
      try { await peerConnection.addIceCandidate(cand); } catch(e) {}
    }

    const answer = await peerConnection.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: currentCall.isVideo
    });
    await peerConnection.setLocalDescription(answer);

    socket.send(JSON.stringify({
      action: "webrtc_signal",
      target_user: data.sender,
      signal: { type: "answer", sdp: answer.sdp }
    }));
  } else if (signal.type === "answer") {
    const sdpStr = typeof signal.sdp === "string" ? signal.sdp : (signal.sdp ? signal.sdp.sdp : "");
    await peerConnection.setRemoteDescription(new RTCSessionDescription({
      type: "answer",
      sdp: sdpStr
    }));

    // Process queued candidates
    while (iceCandidateQueue.length > 0) {
      const cand = iceCandidateQueue.shift();
      try { await peerConnection.addIceCandidate(cand); } catch(e) {}
    }
  } else if (signal.type === "candidate") {
    const candidate = new RTCIceCandidate(signal.candidate);
    if (peerConnection && peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (e) {
        console.warn("addIceCandidate error:", e);
      }
    } else {
      iceCandidateQueue.push(candidate);
    }
  }
}

// Active Call Screen Display
function showActiveCallScreen(peerDisplayName, isVideo, stream, isOutgoing = false) {
  activeCallModal.style.display = "flex";
  document.getElementById("active-call-peer-name").textContent = peerDisplayName;

  const localVideo = document.getElementById("local-video");
  const remoteVideo = document.getElementById("remote-video");
  const audioDisplay = document.getElementById("audio-call-display");
  const toggleCamBtn = document.getElementById("toggle-cam-btn");
  const flipCamBtn = document.getElementById("flip-cam-btn");
  const shareScreenBtn = document.getElementById("share-screen-btn");
  const audioName = document.getElementById("audio-call-name");
  const audioStatus = document.getElementById("audio-call-status");

  if (isVideo) {
    localVideo.srcObject = stream;
    localVideo.style.display = "block";
    remoteVideo.style.display = "block";
    remoteVideo.style.position = "static";
    remoteVideo.style.opacity = "1";
    remoteVideo.style.pointerEvents = "auto";
    remoteVideo.style.width = "100%";
    remoteVideo.style.height = "100%";
    audioDisplay.style.display = "none";
    toggleCamBtn.style.display = "flex";
    flipCamBtn.style.display = "flex";
    if (shareScreenBtn) shareScreenBtn.style.display = "flex";
  } else {
    localVideo.style.display = "none";
    remoteVideo.style.position = "absolute";
    remoteVideo.style.opacity = "0";
    remoteVideo.style.pointerEvents = "none";
    remoteVideo.style.width = "1px";
    remoteVideo.style.height = "1px";

    audioDisplay.style.display = "flex";
    toggleCamBtn.style.display = "none";
    flipCamBtn.style.display = "none";
    if (shareScreenBtn) shareScreenBtn.style.display = "flex";

    const audioAvatar = document.getElementById("audio-call-avatar");
    audioAvatar.textContent = getInitials(peerDisplayName);
    audioAvatar.style.background = stringToColor(peerDisplayName);

    if (audioName) audioName.textContent = peerDisplayName;
    if (audioStatus) audioStatus.textContent = isOutgoing ? "Aranıyor..." : "Sesli Görüşme Sürüyor";
  }
}

// Flip Camera Function
async function flipCamera() {
  if (!currentCall.isVideo || !localStream) {
    showToast("Kamera açık değil.");
    return;
  }

  currentFacingMode = currentFacingMode === "user" ? "environment" : "user";

  const oldTrack = localStream.getVideoTracks()[0];
  try {
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: currentFacingMode } }
    });
    const newTrack = newStream.getVideoTracks()[0];

    if (oldTrack) {
      oldTrack.stop();
      localStream.removeTrack(oldTrack);
    }
    localStream.addTrack(newTrack);

    const localVideo = document.getElementById("local-video");
    if (localVideo) localVideo.srcObject = localStream;

    if (peerConnection) {
      const senders = peerConnection.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === "video");
      if (videoSender) {
        await videoSender.replaceTrack(newTrack);
      }
    }
    showToast(currentFacingMode === "user" ? "Ön kameraya geçildi 🤳" : "Arka kameraya geçildi 📷");
  } catch (err) {
    console.error("Kamera çevrilemedi:", err);
    currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
    showToast("Kamera çevrilemedi (ikinci kamera bulunamadı).");
  }
}

const flipCamBtn = document.getElementById("flip-cam-btn");
if (flipCamBtn) {
  flipCamBtn.addEventListener("click", flipCamera);
}

// ==================== SCREEN SHARING ====================
async function toggleScreenShare() {
  if (!peerConnection) {
    showToast("Ekran paylaşmak için aktif bir görüşmede olmalısınız.");
    return;
  }

  const shareBtn = document.getElementById("share-screen-btn");

  if (!isScreenSharing) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert("Cihazınız veya tarayıcınız ekran paylaşımını desteklemiyor.");
      return;
    }

    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false
      });

      const screenTrack = screenStream.getVideoTracks()[0];

      screenTrack.onended = () => {
        stopScreenShare();
      };

      const senders = peerConnection.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === "video");

      if (videoSender) {
        await videoSender.replaceTrack(screenTrack);
      } else {
        peerConnection.addTrack(screenTrack, localStream || screenStream);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.send(JSON.stringify({
          action: "webrtc_signal",
          target_user: currentCall.peerUser,
          signal: { type: "offer", sdp: offer.sdp }
        }));
      }

      const localVideo = document.getElementById("local-video");
      if (localVideo) {
        localVideo.srcObject = screenStream;
        localVideo.style.display = "block";
      }

      const remoteVideo = document.getElementById("remote-video");
      if (remoteVideo) {
        remoteVideo.style.position = "static";
        remoteVideo.style.opacity = "1";
        remoteVideo.style.pointerEvents = "auto";
        remoteVideo.style.width = "100%";
        remoteVideo.style.height = "100%";
      }
      const audioDisplay = document.getElementById("audio-call-display");
      if (audioDisplay) audioDisplay.style.display = "none";

      isScreenSharing = true;
      if (shareBtn) shareBtn.classList.add("active-screen");
      showToast("Ekran paylaşımı başlatıldı 🖥️");
    } catch (err) {
      console.warn("Ekran paylaşımı iptal:", err);
    }
  } else {
    stopScreenShare();
  }
}

async function stopScreenShare() {
  if (!isScreenSharing) return;

  if (screenStream) {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
  }
  isScreenSharing = false;

  const shareBtn = document.getElementById("share-screen-btn");
  if (shareBtn) shareBtn.classList.remove("active-screen");

  if (currentCall.isVideo && localStream) {
    const origVideoTrack = localStream.getVideoTracks()[0];
    if (origVideoTrack && peerConnection) {
      const videoSender = peerConnection.getSenders().find(s => s.track && s.track.kind === "video");
      if (videoSender) await videoSender.replaceTrack(origVideoTrack);
    }
    const localVideo = document.getElementById("local-video");
    if (localVideo) localVideo.srcObject = localStream;
  } else {
    const localVideo = document.getElementById("local-video");
    if (localVideo) localVideo.style.display = "none";
    const audioDisplay = document.getElementById("audio-call-display");
    if (audioDisplay) audioDisplay.style.display = "flex";
  }

  showToast("Ekran paylaşımı durduruldu.");
}

const shareScreenBtn = document.getElementById("share-screen-btn");
if (shareScreenBtn) {
  shareScreenBtn.addEventListener("click", toggleScreenShare);
}

function startCallTimer() {
  currentCall.seconds = 0;
  const timerEl = document.getElementById("active-call-timer");
  timerEl.textContent = "00:00";
  if (currentCall.timerInterval) clearInterval(currentCall.timerInterval);
  currentCall.timerInterval = setInterval(() => {
    currentCall.seconds++;
    const m = String(Math.floor(currentCall.seconds / 60)).padStart(2, "0");
    const s = String(currentCall.seconds % 60).padStart(2, "0");
    timerEl.textContent = `${m}:${s}`;
  }, 1000);
}

function endCall(notifyPeer = true) {
  stopRingtone();
  stopScreenShare();

  if (currentCall.timerInterval) {
    clearInterval(currentCall.timerInterval);
    currentCall.timerInterval = null;
  }

  if (notifyPeer && currentCall.peerUser && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      action: "end_call",
      target_user: currentCall.peerUser
    }));
  }

  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  iceCandidateQueue = [];

  activeCallModal.style.display = "none";
  incomingCallModal.style.display = "none";
  currentCall.peerUser = null;
  currentCall.isVideo = false;
  currentCall.isCaller = false;
  currentCall.seconds = 0;
}

const hangupCallBtn = document.getElementById("hangup-call-btn");
if (hangupCallBtn) {
  hangupCallBtn.addEventListener("click", () => endCall(true));
}

// Toggle Mic
const toggleMicBtn = document.getElementById("toggle-mic-btn");
if (toggleMicBtn) {
  toggleMicBtn.addEventListener("click", () => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      toggleMicBtn.classList.toggle("muted", !audioTrack.enabled);
      toggleMicBtn.innerHTML = audioTrack.enabled 
        ? '<i class="fa-solid fa-microphone"></i>' 
        : '<i class="fa-solid fa-microphone-slash"></i>';
      showToast(audioTrack.enabled ? "Mikrofon açıldı" : "Mikrofon kapatıldı");
    }
  });
}

// Toggle Cam
const toggleCamBtn = document.getElementById("toggle-cam-btn");
if (toggleCamBtn) {
  toggleCamBtn.addEventListener("click", () => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      toggleCamBtn.classList.toggle("muted", !videoTrack.enabled);
      toggleCamBtn.innerHTML = videoTrack.enabled 
        ? '<i class="fa-solid fa-video"></i>' 
        : '<i class="fa-solid fa-video-slash"></i>';
      showToast(videoTrack.enabled ? "Kamera açıldı" : "Kamera kapatıldı");
    }
  });
}

// ==================== IMAGE LIGHTBOX ====================
function openImageModal(url) {
  modalImg.src = url;
  imageModal.style.display = "flex";
}
if (closeImageModal) {
  closeImageModal.addEventListener("click", () => {
    imageModal.style.display = "none";
    modalImg.src = "";
  });
}
if (imageModal) {
  imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) {
      imageModal.style.display = "none";
      modalImg.src = "";
    }
  });
}

// ==================== HELPERS ====================
function getInitials(name) {
  if (!name) return "?";
  const clean = name.split("#")[0].trim();
  const parts = clean.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function stringToColor(str) {
  if (!str) return "#10b981";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ["#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4", "#ef4444", "#14b8a6"];
  return colors[Math.abs(hash) % colors.length];
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="msg-link">${url}</a>`;
  });
}

function formatBytes(bytes, decimals = 1) {
  if (!bytes) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function scrollToMessage(msgId) {
  const row = document.querySelector(`.message-row[data-msg-id="${msgId}"]`);
  if (row) {
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.classList.add("highlighted");
    setTimeout(() => row.classList.remove("highlighted"), 2000);
  }
}

function createAudioPlayerHTML(url) {
  return `
    <div class="voice-player">
      <audio src="${url}" controls preload="metadata"></audio>
    </div>
  `;
}

// Initial theme
initTheme();
