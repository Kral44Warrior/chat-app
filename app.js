// ===================================================================
// CHAT APPLICATION - CLIENT SCRIPT (app.js)
// Real-time Chat, WebRTC Calling, Screen Share, WhatsApp-Style Ticks
// ===================================================================

// ==================== DEFAULT ROOMS & EMOJIS ====================
const DEFAULT_ROOMS = [
  { id: 'genel', name: 'Genel Sohbet', description: 'Herkes için genel sohbet ve muhabbet odası', icon: '💬' },
  { id: 'teknoloji', name: 'Teknoloji & Yazılım', description: 'Yazılım, yapay zeka ve teknoloji dünyası', icon: '💻' },
  { id: 'oyun', name: 'Oyun Odası', description: 'Masa oyunları, video oyunları ve etkinlikler', icon: '🎮' },
  { id: 'muzik', name: 'Müzik & Sanat', description: 'Favori şarkılar, çalma listeleri ve sanat', icon: '🎵' }
];

const EMOJI_CATEGORIES = [
  {
    id: 'faces',
    icon: '😀',
    title: 'Yüzler ve Duygular',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
      '😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨',
      '😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕',
      '🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁',
      '😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞'
    ]
  },
  {
    id: 'gestures',
    icon: '👋',
    title: 'Jestler ve İnsanlar',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉',
      '👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏',
      '✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴',
      '👀','👁️','👅','👄','🫡','🙋‍♂️','🙋‍♀️','🤦‍♂️','🤦‍♀️','🤷‍♂️','🤷‍♀️','🙇‍♂️','🙇‍♀️'
    ]
  },
  {
    id: 'hearts',
    icon: '❤️',
    title: 'Kalpler ve Duygular',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓',
      '💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐'
    ]
  },
  {
    id: 'nature',
    icon: '🐶',
    title: 'Hayvanlar ve Doğa',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵',
      '🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗',
      '🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🦂',
      '🐢','🐍','🦎','🐙','🦑','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐆',
      '🌸','🌺','🌹','🌷','🌼','🌻','💐','🌾','🌿','☘️','🍀','🍁','🍂','🍃','🌲','🌳'
    ]
  },
  {
    id: 'food',
    icon: '🍕',
    title: 'Yemek ve İçecek',
    emojis: [
      '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝',
      '🍅','🥑','🥦','🌽','🥕','🥔','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🥞','🧇',
      '🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🥪','🥙','🌮','🌯','🥗','🍜','🍝','🍣',
      '🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭','🍿','☕','🍵','🧃','🥤'
    ]
  },
  {
    id: 'activities',
    icon: '⚽',
    title: 'Spor ve Eğlence',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🎱','🥏','🏓','🏸','🏒','🏑','🥍','🏏',
      '🥊','🥋','🥅','⛳','⛸️','🎣','🤿','🎽','🎿','🛷','🥌','🎯','🪀','🪁','🎮','🕹️',
      '🎲','♠️','♥️','♦️','♣️','♟️','🃏','🎭','🎨','🧵','🧶','🎪','🎤','🎧','🎼','🎹'
    ]
  },
  {
    id: 'symbols',
    icon: '🔥',
    title: 'Nesneler ve Semboller',
    emojis: [
      '🔥','✨','⭐','🌟','💥','💯','💢','💨','💫','💬','🗨️','🗯️','💭','💤','🔔','🔕',
      '🎵','🎶','💡','🔦','💎','🎉','🎊','🏆','🥇','🥈','🥉','👑','💍','🚀','🛸','⚡'
    ]
  }
];

// ==================== STATE MANAGEMENT ====================
function getStoredTag() {
  let tag = localStorage.getItem('chat_tag');
  if (!tag || tag.length !== 4 || isNaN(tag)) {
    tag = String(Math.floor(1000 + Math.random() * 9000));
    localStorage.setItem('chat_tag', tag);
  }
  return tag;
}

let currentUser = {
  username: localStorage.getItem('chat_username') || '',
  tag: getStoredTag(),
  get handle() {
    return `${this.username}#${this.tag}`;
  },
  color: localStorage.getItem('chat_color') || '#10b981'
};

let activeChat = {
  id: 'genel',
  name: 'Genel Sohbet',
  isDirect: false,
  recipient: ''
};

let socket = null;
let rooms = [...DEFAULT_ROOMS];
let onlineUsers = [];
let replyTarget = null;
let mediaRecorder = null;
let audioChunks = [];
let recTimerInterval = null;
let typingTimeout = null;
let unreadCounts = {};
let currentFacingMode = 'user';
let titleFlashInterval = null;
let originalDocTitle = document.title || 'Chat - Anlık Sohbet';
let globalAudioCtx = null;
let callVibrateInterval = null;

// Screen Sharing & Call State
let isScreenSharing = false;
let screenStream = null;
let peerConnection = null;
let localStream = null;
let currentCall = {
  peerUser: null,
  isVideo: false,
  isCaller: false,
  timerInterval: null,
  seconds: 0
};
let iceCandidateQueue = [];

let RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:openrelay.metered.ca:80' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turns:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

// ==================== AUDIO SYNTHESIZER & SOUNDS ====================
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
  const rate = 11025;
  const len = Math.floor(rate * 1.8);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / rate;
    if (t < 1.0) {
      const tone1 = Math.sin(2 * Math.PI * 440 * t);
      const tone2 = Math.sin(2 * Math.PI * 480 * t);
      samples[i] = (tone1 + tone2) * 0.35;
    } else {
      samples[i] = 0;
    }
  }
  return createWavDataUri(rate, samples);
}

function unlockAudio() {
  try {
    if (!globalAudioCtx) {
      globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }
    const notifEl = document.getElementById('audio-notif');
    if (notifEl && !notifEl.src) notifEl.src = generateNotifWav();
    const ringEl = document.getElementById('audio-ringtone');
    if (ringEl && !ringEl.src) ringEl.src = generateRingtoneWav();
  } catch (e) {}
}

document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('touchstart', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });

function playNotificationSound() {
  unlockAudio();
  try {
    const notifEl = document.getElementById('audio-notif');
    if (notifEl) {
      notifEl.currentTime = 0;
      notifEl.volume = 1.0;
      notifEl.play().catch(() => {});
    }
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  } catch (e) {}
}

function playRingtone() {
  unlockAudio();
  try {
    const ringEl = document.getElementById('audio-ringtone');
    if (ringEl) {
      ringEl.currentTime = 0;
      ringEl.volume = 1.0;
      ringEl.play().catch(() => {});
    }
    if (navigator.vibrate) {
      navigator.vibrate([400, 200, 400, 200, 400]);
      if (!callVibrateInterval) {
        callVibrateInterval = setInterval(() => {
          if (navigator.vibrate) navigator.vibrate([400, 200, 400]);
        }, 1500);
      }
    }
  } catch (e) {}
}

function stopRingtone() {
  try {
    const ringEl = document.getElementById('audio-ringtone');
    if (ringEl) {
      ringEl.pause();
      ringEl.currentTime = 0;
    }
    if (callVibrateInterval) {
      clearInterval(callVibrateInterval);
      callVibrateInterval = null;
    }
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  } catch (e) {}
}

// ==================== TOAST & NOTIFICATIONS ====================
function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 400);
  }, 3200);
}

function startTitleFlash(text) {
  if (titleFlashInterval) clearInterval(titleFlashInterval);
  let isOrig = false;
  titleFlashInterval = setInterval(() => {
    document.title = isOrig ? originalDocTitle : text;
    isOrig = !isOrig;
  }, 1000);
}

function stopTitleFlash() {
  if (titleFlashInterval) {
    clearInterval(titleFlashInterval);
    titleFlashInterval = null;
    document.title = originalDocTitle;
  }
}

window.addEventListener('focus', stopTitleFlash);

function initNotifications() {
  const banner = document.getElementById('notif-permission-banner');
  const btn = document.getElementById('enable-notif-btn');

  if (!('Notification' in window)) {
    if (banner) banner.style.display = 'none';
    return;
  }

  if (Notification.permission === 'default') {
    if (banner) banner.style.display = 'flex';
  } else {
    if (banner) banner.style.display = 'none';
  }

  if (btn) {
    btn.addEventListener('click', async () => {
      unlockAudio();
      try {
        const res = await Notification.requestPermission();
        if (res === 'granted') {
          showToast('Bildirimler açıldı! 🔔');
          if (banner) banner.style.display = 'none';
        } else {
          showToast('Bildirim izni verilmedi.');
        }
      } catch (e) {}
    });
  }
}

function sendSystemNotification(title, body, tag = 'chat-notif') {
  if (('Notification' in window) && Notification.permission === 'granted') {
    if (document.hidden || !document.hasFocus()) {
      try {
        const notif = new Notification(title, {
          body: body,
          icon: '/favicon.ico',
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

// ==================== DOM ELEMENTS ====================
let loginModal, loginForm, usernameInput, userTagInput, randomTagBtn, avatarColors;
let appLayout, myAvatar, myNameDisplay, myTagDisplay, themeToggle, logoutBtn;
let chatSearch, navTabs, tabContents, roomsList, usersList, onlineCount;
let activeChatAvatar, activeChatTitle, activeChatStatus, mobileBackBtn, scrollBottomBtn;
let messagesContainer, typingBar, typingText, replyBanner, replySender, replyPreview, cancelReplyBtn;
let messageInput, sendBtn, emojiBtn, emojiPicker, attachBtn, fileInput, voiceBtn;
let recordingBar, recTimer, cancelRecBtn, sendRecBtn, imageModal, modalImg, closeImageModal;
let voiceCallBtn, videoCallBtn, searchChatBtn, inChatSearchBar, inChatSearchInput, searchResultCount, closeInChatSearch;
let callPickerModal, callPickerList, closeCallPickerBtn, incomingCallModal, activeCallModal;

function cacheDomElements() {
  loginModal = document.getElementById('login-modal');
  loginForm = document.getElementById('login-form');
  usernameInput = document.getElementById('username-input');
  userTagInput = document.getElementById('user-tag-input');
  randomTagBtn = document.getElementById('random-tag-btn');
  avatarColors = document.getElementById('avatar-colors');
  appLayout = document.getElementById('app-layout');
  myAvatar = document.getElementById('my-avatar');
  myNameDisplay = document.getElementById('my-name-display');
  myTagDisplay = document.getElementById('my-tag-display');
  themeToggle = document.getElementById('theme-toggle');
  logoutBtn = document.getElementById('logout-btn');
  chatSearch = document.getElementById('chat-search');
  navTabs = document.querySelectorAll('.nav-tab');
  tabContents = document.querySelectorAll('.tab-content');
  roomsList = document.getElementById('rooms-list');
  usersList = document.getElementById('users-list');
  onlineCount = document.getElementById('online-count');
  activeChatAvatar = document.getElementById('active-chat-avatar');
  activeChatTitle = document.getElementById('active-chat-title');
  activeChatStatus = document.getElementById('active-chat-status');
  mobileBackBtn = document.getElementById('mobile-back-btn');
  scrollBottomBtn = document.getElementById('scroll-bottom-btn');
  messagesContainer = document.getElementById('messages-container');
  typingBar = document.getElementById('typing-bar');
  typingText = document.getElementById('typing-text');
  replyBanner = document.getElementById('reply-banner');
  replySender = document.getElementById('reply-sender');
  replyPreview = document.getElementById('reply-preview');
  cancelReplyBtn = document.getElementById('cancel-reply-btn');
  messageInput = document.getElementById('message-input');
  sendBtn = document.getElementById('send-btn');
  emojiBtn = document.getElementById('emoji-btn');
  emojiPicker = document.getElementById('emoji-picker');
  attachBtn = document.getElementById('attach-btn');
  fileInput = document.getElementById('file-input');
  voiceBtn = document.getElementById('voice-btn');
  recordingBar = document.getElementById('recording-bar');
  recTimer = document.getElementById('rec-timer');
  cancelRecBtn = document.getElementById('cancel-rec-btn');
  sendRecBtn = document.getElementById('send-rec-btn');
  imageModal = document.getElementById('image-modal');
  modalImg = document.getElementById('modal-img');
  closeImageModal = document.getElementById('close-image-modal');
  voiceCallBtn = document.getElementById('voice-call-btn');
  videoCallBtn = document.getElementById('video-call-btn');
  searchChatBtn = document.getElementById('search-chat-btn');
  inChatSearchBar = document.getElementById('in-chat-search-bar');
  inChatSearchInput = document.getElementById('in-chat-search-input');
  searchResultCount = document.getElementById('search-result-count');
  closeInChatSearch = document.getElementById('close-in-chat-search');
  callPickerModal = document.getElementById('call-picker-modal');
  callPickerList = document.getElementById('call-picker-list');
  closeCallPickerBtn = document.getElementById('close-call-picker-btn');
  incomingCallModal = document.getElementById('incoming-call-modal');
  activeCallModal = document.getElementById('active-call-modal');
}

// ==================== THEME MANAGEMENT ====================
function initTheme() {
  const savedTheme = localStorage.getItem('chat_theme') || 'dark';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    if (themeToggle) themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
  } else {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
    if (themeToggle) themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }
  localStorage.setItem('chat_theme', theme);
}

// ==================== INITIALIZATION & LOGIN ====================
function initApp() {
  cacheDomElements();
  initTheme();

  if (userTagInput) {
    userTagInput.value = currentUser.tag;
    userTagInput.addEventListener('input', () => {
      userTagInput.value = userTagInput.value.replace(/\D/g, '').slice(0, 4);
    });
  }
  if (randomTagBtn) {
    randomTagBtn.addEventListener('click', () => {
      const rand = String(Math.floor(1000 + Math.random() * 9000));
      if (userTagInput) userTagInput.value = rand;
      currentUser.tag = rand;
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.body.classList.contains('light-theme') ? 'light' : 'dark';
      applyTheme(current === 'light' ? 'dark' : 'light');
    });
  }

  if (avatarColors) {
    avatarColors.addEventListener('click', (e) => {
      if (e.target.classList.contains('color-dot')) {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        e.target.classList.add('active');
        currentUser.color = e.target.dataset.color;
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = usernameInput.value.trim();
      if (!val) return;
      let tagVal = userTagInput ? userTagInput.value.trim() : '';
      if (!tagVal || tagVal.length !== 4) {
        tagVal = String(Math.floor(1000 + Math.random() * 9000));
      }

      currentUser.username = val;
      currentUser.tag = tagVal;
      localStorage.setItem('chat_username', currentUser.username);
      localStorage.setItem('chat_tag', currentUser.tag);
      localStorage.setItem('chat_color', currentUser.color);
      unlockAudio();
      enterApp();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
        localStorage.removeItem('chat_username');
        if (socket) socket.close();
        location.reload();
      }
    });
  }

  setupEventListeners();

  if (currentUser.username) {
    enterApp();
  } else {
    if (loginModal) loginModal.style.display = 'flex';
  }
}

function enterApp() {
  if (loginModal) loginModal.style.display = 'none';
  if (appLayout) appLayout.style.display = 'flex';

  if (myAvatar) {
    myAvatar.textContent = getInitials(currentUser.username);
    myAvatar.style.background = currentUser.color;
  }
  if (myNameDisplay) {
    myNameDisplay.textContent = currentUser.username;
  }
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

  initNotifications();
  initEmojiPicker();
  loadIceServers();

  renderRoomsList();
  loadRooms().finally(() => {
    connectWebSocket();
    switchChat('genel', 'Genel Sohbet', false);
  });
}

// ==================== WEBSOCKET ====================
function connectWebSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${location.host}/ws?username=${encodeURIComponent(currentUser.username)}&tag=${encodeURIComponent(currentUser.tag)}`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('WebSocket bağlandı:', currentUser.handle);
    if (activeChat.id) {
      socket.send(JSON.stringify({ action: 'join_room', room_id: activeChat.id }));
    }
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleSocketMessage(data);
    } catch (e) {
      console.error('Mesaj parse hatası:', e);
    }
  };

  socket.onclose = () => {
    console.warn('WebSocket koptu, yeniden bağlanılıyor...');
    setTimeout(connectWebSocket, 3000);
  };
}

function handleSocketMessage(data) {
  if (data.type === 'online_users') {
    const rawUsers = data.users || [];
    onlineUsers = rawUsers
      .map(u => typeof u === 'string' ? { username: u.split('#')[0], tag: u.split('#')[1] || '0000', handle: u } : u)
      .filter(u => u.handle.toLowerCase() !== currentUser.handle.toLowerCase());

    if (onlineCount) onlineCount.textContent = onlineUsers.length;
    renderUsersList();
    updateActiveChatStatus();
  } else if (data.type === 'new_message') {
    if (data.room_id === activeChat.id) {
      appendMessage(data);
      scrollToBottom();
      if (data.sender !== currentUser.handle && data.sender !== currentUser.username) {
        playNotificationSound();
        const displaySender = data.sender.split('#')[0];
        sendSystemNotification(`💬 ${displaySender}`, data.content || 'Dosya gönderdi');
        startTitleFlash(`💬 ${displaySender}: ${data.content || 'Yeni Mesaj'}`);
        markActiveRoomAsRead();
      }
    } else {
      unreadCounts[data.room_id] = (unreadCounts[data.room_id] || 0) + 1;
      updateBadge(data.room_id);
      playNotificationSound();
      const displaySender = data.sender.split('#')[0];
      sendSystemNotification(`💬 ${displaySender}`, data.content || 'Yeni mesaj');
      startTitleFlash(`🔔 (1) Yeni Mesaj - ${displaySender}`);
    }
  } else if (data.type === 'user_typing') {
    if (data.room_id === activeChat.id && data.user !== currentUser.handle && data.user !== currentUser.username) {
      const displayUser = data.user.split('#')[0];
      if (data.is_typing) {
        if (typingText) typingText.textContent = `${displayUser} yazıyor...`;
        if (typingBar) typingBar.style.display = 'flex';
      } else {
        if (typingBar) typingBar.style.display = 'none';
      }
    }
  } else if (data.type === 'messages_read') {
    if (data.room_id === activeChat.id) {
      document.querySelectorAll('.message-row.me .msg-tick').forEach(tickEl => {
        tickEl.className = 'fa-solid fa-check-double msg-tick read';
        tickEl.title = 'Okundu (2 Mavi Tik)';
      });
    }
  } else if (data.type === 'messages_delivered') {
    document.querySelectorAll('.message-row.me .msg-tick').forEach(tickEl => {
      if (!tickEl.classList.contains('read')) {
        tickEl.className = 'fa-solid fa-check-double msg-tick delivered';
        tickEl.title = 'İletildi (2 Beyaz Tik)';
      }
    });
  } else if (data.type === 'incoming_call') {
    handleIncomingCall(data);
  } else if (data.type === 'call_response') {
    handleCallResponse(data);
  } else if (data.type === 'webrtc_signal') {
    handleWebRTCSignal(data);
  } else if (data.type === 'call_ended') {
    showToast(`${data.sender.split('#')[0]} aramayı sonlandırdı.`);
    endCall(false);
  } else if (data.type === 'call_error') {
    showToast(data.message || 'Arama başlatılamadı.');
    endCall(false);
  } else if (data.type === 'message_reaction') {
    if (data.room_id === activeChat.id) {
      updateReactionsInDOM(data.msg_id, data.reactions);
    }
  }
}

// ==================== ROOMS & NAVIGATION ====================
async function loadRooms() {
  try {
    const res = await fetch('/api/rooms');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        rooms = data;
        renderRoomsList();
      }
    }
  } catch (e) {
    console.warn('Odalar sunucudan yüklenirken hata, varsayılanlar devrede:', e);
  }
}

function renderRoomsList() {
  if (!roomsList) return;
  roomsList.innerHTML = '';
  rooms.forEach(r => {
    const item = document.createElement('div');
    item.className = `chat-item ${r.id === activeChat.id ? 'active' : ''}`;
    item.dataset.roomId = r.id;

    const unread = unreadCounts[r.id] || 0;

    item.innerHTML = `
      <div class="avatar" style="background: #3b82f6;">${r.icon || '💬'}</div>
      <div class="chat-item-info">
        <div class="top-row">
          <span class="name">${escapeHtml(r.name)}</span>
          <span class="time"></span>
        </div>
        <div class="bottom-row">
          <span class="preview">${escapeHtml(r.description || '')}</span>
          ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
        </div>
      </div>
    `;

    item.addEventListener('click', () => switchChat(r.id, r.name, false));
    roomsList.appendChild(item);
  });
}

function renderUsersList() {
  if (!usersList) return;
  usersList.innerHTML = '';
  if (onlineUsers.length === 0) {
    usersList.innerHTML = `
      <div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 13px;">
        Şu anda çevrimiçi başka arkadaşınız yok.<br>
        Farklı sekmeden veya telefondan ID ile test edebilirsiniz!
      </div>
    `;
    return;
  }

  onlineUsers.forEach(u => {
    const dmRoomId = getDmRoomId(currentUser.handle, u.handle);
    const item = document.createElement('div');
    item.className = `chat-item ${dmRoomId === activeChat.id ? 'active' : ''}`;
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
          ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
        </div>
      </div>
      <div class="user-row-actions">
        <button class="user-action-btn voice" title="Sesli Ara"><i class="fa-solid fa-phone"></i></button>
        <button class="user-action-btn video" title="Görüntülü Ara"><i class="fa-solid fa-video"></i></button>
      </div>
    `;

    item.addEventListener('click', () => switchChat(dmRoomId, u.username, true, u.handle));

    const vBtn = item.querySelector('.user-action-btn.voice');
    if (vBtn) {
      vBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startCallTo(u.handle, false);
      });
    }

    const vidBtn = item.querySelector('.user-action-btn.video');
    if (vidBtn) {
      vidBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startCallTo(u.handle, true);
      });
    }

    usersList.appendChild(item);
  });
}

function updateActiveChatStatus() {
  if (!activeChatStatus) return;
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

async function switchChat(roomId, name, isDirect = false, recipient = '') {
  activeChat.id = roomId;
  activeChat.name = name;
  activeChat.isDirect = isDirect;
  activeChat.recipient = recipient;

  unreadCounts[roomId] = 0;
  updateBadge(roomId);

  if (activeChatTitle) activeChatTitle.textContent = name;
  if (isDirect) {
    if (activeChatAvatar) {
      activeChatAvatar.textContent = getInitials(name);
      activeChatAvatar.style.background = stringToColor(name);
    }
    updateActiveChatStatus();
  } else {
    if (activeChatAvatar) {
      activeChatAvatar.textContent = '💬';
      activeChatAvatar.style.background = '#3b82f6';
    }
    if (activeChatStatus) activeChatStatus.textContent = 'Herkes için sohbet odası';
  }

  document.querySelectorAll('.chat-item').forEach(el => {
    el.classList.toggle('active', el.dataset.roomId === roomId);
  });

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: 'join_room', room_id: roomId }));
  }

  closeInChatSearchBarFunc();
  await loadMessages(roomId);

  if (appLayout) {
    appLayout.classList.add('chat-open');
    appLayout.classList.add('mobile-chat-open');
  }
}

function updateBadge(roomId) {
  const items = document.querySelectorAll(`.chat-item[data-room-id="${roomId}"]`);
  items.forEach(item => {
    const count = unreadCounts[roomId] || 0;
    let badge = item.querySelector('.unread-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'unread-badge';
        const bottomRow = item.querySelector('.bottom-row');
        if (bottomRow) bottomRow.appendChild(badge);
      }
      badge.textContent = count;
    } else if (badge) {
      badge.remove();
    }
  });
}

// ==================== MESSAGES & WHATSAPP TICKS ====================
async function loadMessages(roomId) {
  if (!messagesContainer) return;
  messagesContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">Yükleniyor...</div>';
  try {
    const res = await fetch(`/api/messages?room_id=${encodeURIComponent(roomId)}`);
    const data = await res.json();
    messagesContainer.innerHTML = '';

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
    messagesContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">Henüz mesaj yok.</div>';
  }
}

function getTickIconHTML(status) {
  if (status === 'read') {
    return '<i class="fa-solid fa-check-double msg-tick read" title="Okundu (2 Mavi Tik)"></i>';
  } else if (status === 'delivered') {
    return '<i class="fa-solid fa-check-double msg-tick delivered" title="İletildi (2 Beyaz Tik)"></i>';
  } else {
    return '<i class="fa-solid fa-check msg-tick sent" title="Gönderildi (1 Beyaz Tik)"></i>';
  }
}

function markActiveRoomAsRead() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      action: 'read_messages',
      room_id: activeChat.id
    }));
  }
}

function appendMessage(m) {
  if (!messagesContainer) return;
  const isMe = m.sender === currentUser.handle || m.sender === currentUser.username;
  const row = document.createElement('div');
  row.className = `message-row ${isMe ? 'me' : 'other'}`;
  row.dataset.msgId = m.id;

  const timeStr = m.timestamp ? m.timestamp.split(' ')[1].slice(0, 5) : '';
  const displaySender = m.sender ? m.sender.split('#')[0] : '';

  let bodyContent = '';
  if (m.msg_type === 'image' && m.file_url) {
    bodyContent += `
      <img src="${m.file_url}" class="msg-image" onclick="openImageModal('${m.file_url}')" alt="Resim" />
      ${m.content ? `<div style="margin-top: 6px;">${linkify(escapeHtml(m.content))}</div>` : ''}
    `;
  } else if (m.msg_type === 'audio' && m.file_url) {
    bodyContent += createAudioPlayerHTML(m.file_url);
  } else if (m.msg_type === 'file' && m.file_url) {
    bodyContent += `
      <div class="file-attachment">
        <div class="file-icon"><i class="fa-solid fa-file-lines"></i></div>
        <div class="file-info">
          <span class="file-name">${escapeHtml(m.file_name || 'Dosya')}</span>
          <span class="file-size">${formatBytes(m.file_size || 0)}</span>
        </div>
        <a href="${m.file_url}" download class="file-download-btn"><i class="fa-solid fa-download"></i></a>
      </div>
      ${m.content ? `<div style="margin-top: 6px;">${linkify(escapeHtml(m.content))}</div>` : ''}
    `;
  } else {
    bodyContent += `<div class="msg-text">${linkify(escapeHtml(m.content))}</div>`;
  }

  let replyHTML = '';
  if (m.reply_to_id && m.reply_to_text) {
    replyHTML = `
      <div class="msg-reply-quote" onclick="scrollToMessage('${m.reply_to_id}')">
        <strong class="quote-sender">${escapeHtml(m.reply_to_sender || '')}</strong>
        <p class="quote-text">${escapeHtml(m.reply_to_text)}</p>
      </div>
    `;
  }

  row.innerHTML = `
    <div class="message-bubble bubble">
      ${!isMe && !activeChat.isDirect ? `<span class="sender-name" style="color: ${stringToColor(displaySender)}">${escapeHtml(displaySender)}</span>` : ''}
      ${replyHTML}
      <div class="bubble-body">${bodyContent}</div>
      <div class="bubble-meta">
        <span class="msg-time">${timeStr}</span>
        ${isMe ? getTickIconHTML(m.status) : ''}
      </div>
      <div class="reactions-container"></div>
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
  renderReactions(row.querySelector('.reactions-container'), m.reactions || {}, m.id);
}

function scrollToBottom() {
  if (!messagesContainer) return;
  setTimeout(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 50);
}

// ==================== SENDING MESSAGES ====================
function sendMessage() {
  if (!messageInput) return;
  const text = messageInput.value.trim();
  if (!text) return;

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      action: 'send_message',
      room_id: activeChat.id,
      content: text,
      msg_type: 'text',
      reply_to_id: replyTarget ? replyTarget.id : null,
      reply_to_text: replyTarget ? replyTarget.text : null,
      reply_to_sender: replyTarget ? replyTarget.sender : null
    }));
  }

  messageInput.value = '';
  messageInput.style.height = 'auto';
  cancelReply();
  sendTypingStatus(false);
}

function sendTypingStatus(isTyping) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      action: 'typing',
      room_id: activeChat.id,
      is_typing: isTyping
    }));
  }
}

// ==================== REPLY & REACTIONS ====================
function setReplyTarget(id, sender, text) {
  replyTarget = { id, sender, text };
  if (replySender) replySender.textContent = sender;
  if (replyPreview) replyPreview.textContent = text;
  if (replyBanner) replyBanner.style.display = 'flex';
  if (messageInput) messageInput.focus();
}

function cancelReply() {
  replyTarget = null;
  if (replyBanner) replyBanner.style.display = 'none';
}

function showQuickReactions(btn, msgId) {
  document.querySelectorAll('.quick-reactions-popover').forEach(p => p.remove());

  const pop = document.createElement('div');
  pop.className = 'quick-reactions-popover';
  const quick = ['❤️', '👍', '😂', '🔥', '😮', '😢', '🙏'];
  quick.forEach(emoji => {
    const s = document.createElement('span');
    s.className = 'pop-emoji';
    s.textContent = emoji;
    s.addEventListener('click', () => {
      sendReaction(msgId, emoji);
      pop.remove();
    });
    pop.appendChild(s);
  });

  document.body.appendChild(pop);
  const rect = btn.getBoundingClientRect();
  pop.style.top = `${rect.top - 45}px`;
  pop.style.left = `${rect.left - 60}px`;

  setTimeout(() => {
    document.addEventListener('click', function closePop(e) {
      if (!pop.contains(e.target) && e.target !== btn) {
        pop.remove();
        document.removeEventListener('click', closePop);
      }
    });
  }, 10);
}

function sendReaction(msgId, emoji) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      action: 'reaction',
      msg_id: msgId,
      room_id: activeChat.id,
      emoji: emoji
    }));
  }
}

function renderReactions(container, reactions, msgId) {
  if (!container) return;
  container.innerHTML = '';
  for (const [emoji, users] of Object.entries(reactions)) {
    if (!users || users.length === 0) continue;
    const hasMine = users.includes(currentUser.handle) || users.includes(currentUser.username);
    const pill = document.createElement('span');
    pill.className = `reaction-pill ${hasMine ? 'my-reaction' : ''}`;
    pill.innerHTML = `${emoji} <small>${users.length}</small>`;
    pill.title = users.map(u => u.split('#')[0]).join(', ');
    pill.addEventListener('click', () => sendReaction(msgId, emoji));
    container.appendChild(pill);
  }
}

function updateReactionsInDOM(msgId, reactions) {
  const row = document.querySelector(`.message-row[data-msg-id="${msgId}"]`);
  if (row) {
    const cont = row.querySelector('.reactions-container');
    renderReactions(cont, reactions, msgId);
  }
}

// ==================== FILE & VOICE UPLOAD ====================
async function handleFileUpload(file) {
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('room_id', activeChat.id);
  formData.append('sender', currentUser.handle);

  showToast('Dosya yükleniyor...');
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      showToast('Dosya başarıyla gönderildi! ✅');
    } else {
      showToast('Dosya yüklenemedi.');
    }
  } catch (e) {
    showToast('Dosya yükleme hatası.');
  }
}

// ==================== EMOJI PICKER ====================
function initEmojiPicker() {
  const tabsContainer = document.getElementById('emoji-nav-tabs');
  const contentContainer = document.getElementById('emoji-scroll-content');
  if (!tabsContainer || !contentContainer) return;

  tabsContainer.innerHTML = '';
  contentContainer.innerHTML = '';

  EMOJI_CATEGORIES.forEach((cat, idx) => {
    const tabBtn = document.createElement('button');
    tabBtn.className = `emoji-nav-btn ${idx === 0 ? 'active' : ''}`;
    tabBtn.textContent = cat.icon;
    tabBtn.title = cat.title;

    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.emoji-nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.emoji-grid-section').forEach(s => s.classList.remove('active'));
      tabBtn.classList.add('active');
      const targetSec = document.getElementById(`cat-grid-${cat.id}`);
      if (targetSec) targetSec.classList.add('active');
    });
    tabsContainer.appendChild(tabBtn);

    const gridSec = document.createElement('div');
    gridSec.className = `emoji-grid-section ${idx === 0 ? 'active' : ''}`;
    gridSec.id = `cat-grid-${cat.id}`;

    cat.emojis.forEach(emojiChar => {
      const span = document.createElement('span');
      span.className = 'emoji-item';
      span.textContent = emojiChar;
      span.addEventListener('click', () => {
        insertEmoji(emojiChar);
      });
      gridSec.appendChild(span);
    });

    contentContainer.appendChild(gridSec);
  });
}

function insertEmoji(char) {
  if (!messageInput) return;
  const start = messageInput.selectionStart;
  const end = messageInput.selectionEnd;
  const val = messageInput.value;
  messageInput.value = val.substring(0, start) + char + val.substring(end);
  messageInput.selectionStart = messageInput.selectionEnd = start + char.length;
  messageInput.focus();
  messageInput.dispatchEvent(new Event('input'));
}

// ==================== IN-CHAT SEARCH ====================
function closeInChatSearchBarFunc() {
  if (inChatSearchBar) inChatSearchBar.style.display = 'none';
  if (inChatSearchInput) inChatSearchInput.value = '';
  if (searchResultCount) searchResultCount.textContent = '';
  document.querySelectorAll('.message-row').forEach(row => row.classList.remove('search-hidden'));
}

// ==================== WEBRTC CALLING & SCREEN SHARE ====================
function showUserPickerForCall(isVideo) {
  if (onlineUsers.length === 0) {
    showToast('Arama yapabileceğiniz çevrimiçi arkadaşınız bulunmuyor.');
    return;
  }
  if (!callPickerModal || !callPickerList) return;

  const titleEl = document.getElementById('call-picker-title');
  if (titleEl) {
    titleEl.textContent = isVideo ? 'Görüntülü Arama Başlat' : 'Sesli Arama Başlat';
  }

  callPickerList.innerHTML = '';
  onlineUsers.forEach(u => {
    const item = document.createElement('div');
    item.className = 'call-picker-item';
    item.innerHTML = `
      <div class="avatar sm" style="background: ${stringToColor(u.username)}">${getInitials(u.username)}</div>
      <div class="user-info">
        <span class="user-name">${escapeHtml(u.username)} <span class="user-tag">#${u.tag}</span></span>
      </div>
      <button class="call-btn-chip ${isVideo ? 'video' : 'voice'}">
        <i class="fa-solid ${isVideo ? 'fa-video' : 'fa-phone'}"></i> Ara
      </button>
    `;
    item.querySelector('button').onclick = () => {
      callPickerModal.style.display = 'none';
      startCallTo(u.handle, isVideo);
    };
    callPickerList.appendChild(item);
  });

  callPickerModal.style.display = 'flex';
}

async function startCallTo(targetUser, isVideo = false) {
  unlockAudio();
  const remoteVideo = document.getElementById('remote-video');
  const remoteAudio = document.getElementById('remote-audio');
  if (remoteVideo) remoteVideo.play().catch(() => {});
  if (remoteAudio) remoteAudio.play().catch(() => {});

  if (!socket || socket.readyState !== WebSocket.OPEN) {
    showToast('Sunucu bağlantısı yok, aranamadı.');
    return;
  }

  currentCall.peerUser = targetUser;
  currentCall.isVideo = isVideo;
  currentCall.isCaller = true;
  iceCandidateQueue = [];

  const displayName = targetUser.split('#')[0];
  showToast(`${displayName} aranıyor... Lütfen bekleyin.`);

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: isVideo ? { facingMode: { ideal: currentFacingMode }, width: { ideal: 640 }, height: { ideal: 480 } } : false
    });
    localStream.getAudioTracks().forEach(t => { t.enabled = true; });
  } catch (err) {
    console.error('Kamera/Mikrofon izni alınamadı:', err);
    showToast('Mikrofon/Kamera erişim izni verilmedi.');
    return;
  }

  setupActiveCallScreen(displayName, isVideo);

  socket.send(JSON.stringify({
    action: 'call_user',
    target_user: targetUser,
    is_video: isVideo,
    room_id: activeChat.id
  }));
}

function handleIncomingCall(data) {
  unlockAudio();
  playRingtone();

  currentCall.peerUser = data.caller;
  currentCall.isVideo = data.is_video;
  currentCall.isCaller = false;
  iceCandidateQueue = [];

  const callerName = data.caller.split('#')[0];
  const callerNameEl = document.getElementById('incoming-caller-name');
  const callBadge = document.getElementById('incoming-call-badge');
  const callTypeEl = document.getElementById('incoming-call-type');
  const avatarEl = document.getElementById('incoming-call-avatar');

  if (callerNameEl) callerNameEl.textContent = callerName;
  if (avatarEl) {
    avatarEl.textContent = getInitials(callerName);
    avatarEl.style.background = stringToColor(callerName);
  }
  if (callBadge) {
    callBadge.textContent = data.is_video ? '📹 GÖRÜNTÜLÜ ARAMA' : '📞 SESLİ ARAMA';
  }
  if (callTypeEl) {
    callTypeEl.textContent = data.is_video ? 'Görüntülü WhatsApp Görüşmesi Geliyor...' : 'Sesli WhatsApp Araması Geliyor...';
  }

  if (incomingCallModal) incomingCallModal.style.display = 'flex';

  sendSystemNotification(`📞 Arama Geliyor!`, `${callerName} sizi ${data.is_video ? 'görüntülü' : 'sesli'} arıyor!`);
  startTitleFlash(`📞 ARAMA: ${callerName}`);
}

async function answerCall(accepted) {
  stopRingtone();
  stopTitleFlash();
  if (incomingCallModal) incomingCallModal.style.display = 'none';

  // Prime media elements for autoplay permissions
  const remoteVideo = document.getElementById('remote-video');
  const remoteAudio = document.getElementById('remote-audio');
  if (remoteVideo) remoteVideo.play().catch(() => {});
  if (remoteAudio) remoteAudio.play().catch(() => {});

  if (!accepted) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        action: 'call_response',
        target_user: currentCall.peerUser,
        accepted: false
      }));
    }
    endCall(false);
    return;
  }

  const callerName = currentCall.peerUser.split('#')[0];
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: currentCall.isVideo ? { facingMode: { ideal: currentFacingMode }, width: { ideal: 640 }, height: { ideal: 480 } } : false
    });
    localStream.getAudioTracks().forEach(t => { t.enabled = true; });
  } catch (err) {
    showToast('Kamera veya mikrofon açılamadı.');
    answerCall(false);
    return;
  }

  setupActiveCallScreen(callerName, currentCall.isVideo);

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      action: 'call_response',
      target_user: currentCall.peerUser,
      accepted: true
    }));
  }

  await initPeerConnection(true);
}

async function handleCallResponse(data) {
  if (!data.accepted) {
    showToast(`${data.responder.split('#')[0]} aramayı reddetti veya meşgul.`);
    endCall(false);
    return;
  }

  showToast(`${data.responder.split('#')[0]} aramayı kabul etti! Bağlanılıyor...`);
  currentCall.peerUser = data.responder; // Tam ve kesin kullanıcı adı
  await initPeerConnection(false);
}

let remoteStream = null;
let statsInterval = null;
let iceCandidatesReceivedCount = 0;

function waitForIceGathering(pc) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    const checkState = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', checkState);
    setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', checkState);
      resolve();
    }, 1000);
  });
}

async function safelyAddIceCandidate(pc, cand) {
  if (!cand || !cand.candidate) return;
  try {
    await pc.addIceCandidate(cand);
    iceCandidatesReceivedCount++;
  } catch (e1) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(cand));
      iceCandidatesReceivedCount++;
    } catch (e2) {
      console.warn('safelyAddIceCandidate hatasi:', e2);
    }
  }
}

async function loadIceServers() {
  try {
    const res = await fetch('/api/ice');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.iceServers) && data.iceServers.length) {
        RTC_CONFIG = { iceServers: data.iceServers, iceCandidatePoolSize: 4 };
      }
    }
  } catch (e) {
    console.warn('ICE sunucuları alınamadı, varsayılanlar kullanılacak:', e);
  }
}

function setCallDebug(text) {
  let el = document.getElementById('call-debug');
  if (!el) {
    const box = document.getElementById('active-call-screen-box');
    if (!box) return;
    el = document.createElement('div');
    el.id = 'call-debug';
    el.style.cssText = 'position:absolute;top:44px;left:20px;z-index:20;font-size:12px;color:#fbbf24;background:rgba(0,0,0,0.65);padding:6px 10px;border-radius:8px;max-width:90%;line-height:1.4;';
    box.appendChild(el);
  }
  el.textContent = text;
}

function startStatsMonitor() {
  if (statsInterval) clearInterval(statsInterval);
  statsInterval = setInterval(async () => {
    if (!peerConnection) return;
    try {
      const stats = await peerConnection.getStats();
      let inAudio = 0, outAudio = 0, relay = false;
      stats.forEach(r => {
        if (r.type === 'inbound-rtp' && r.kind === 'audio') inAudio = r.bytesReceived || 0;
        if (r.type === 'outbound-rtp' && r.kind === 'audio') outAudio = r.bytesSent || 0;
        if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') {
          const lc = stats.get(r.localCandidateId);
          if (lc && lc.candidateType === 'relay') relay = true;
        }
      });
      setCallDebug(`Bağlantı: ${peerConnection.iceConnectionState}${relay ? ' (TURN)' : ''} | Sinyal: ${peerConnection.signalingState} | Adaylar: ${iceCandidatesReceivedCount} | Giden ses: ${Math.round(outAudio / 1024)} KB | Gelen ses: ${Math.round(inAudio / 1024)} KB`);
    } catch (e) {}
  }, 1000);
}

async function initPeerConnection(isAnswerer) {
  if (peerConnection) {
    try { peerConnection.close(); } catch (e) {}
    peerConnection = null;
  }

  remoteStream = new MediaStream();
  iceCandidatesReceivedCount = 0;
  peerConnection = new RTCPeerConnection(RTC_CONFIG);
  setCallDebug(isAnswerer ? 'Cevaplayıcı: Bağlantı kuruluyor...' : 'Arayan: Teklif hazırlanıyor...');
  startStatsMonitor();

  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
  }

  peerConnection.ontrack = (event) => {
    console.log('WebRTC ontrack received:', event.track.kind);
    const remoteVideo = document.getElementById('remote-video');
    const remoteAudio = document.getElementById('remote-audio');

    if (event.track.kind === 'video') {
      if (remoteVideo) {
        let vStream = remoteVideo.srcObject;
        if (!vStream || !(vStream instanceof MediaStream)) {
          vStream = new MediaStream();
          remoteVideo.srcObject = vStream;
        }
        vStream.addTrack(event.track);
        remoteVideo.muted = true;
        remoteVideo.play().catch(e => console.warn('remoteVideo play:', e));
      }
    } else if (event.track.kind === 'audio') {
      event.track.enabled = true;
      const aStream = new MediaStream([event.track]);

      if (remoteAudio) {
        remoteAudio.srcObject = aStream;
        remoteAudio.volume = 1.0;
        remoteAudio.muted = false;
        remoteAudio.play().catch(e => console.warn('remoteAudio play:', e));
      }

      try {
        if (!globalAudioCtx) {
          globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (globalAudioCtx.state === 'suspended') {
          globalAudioCtx.resume();
        }
        const src = globalAudioCtx.createMediaStreamSource(aStream);
        src.connect(globalAudioCtx.destination);
      } catch (err) {
        console.warn('Web Audio route err:', err);
      }
    }
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate && event.candidate.candidate && socket && socket.readyState === WebSocket.OPEN) {
      const candObj = event.candidate.toJSON ? event.candidate.toJSON() : {
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex
      };
      socket.send(JSON.stringify({
        action: 'webrtc_signal',
        target_user: currentCall.peerUser,
        signal: { type: 'candidate', candidate: candObj }
      }));
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log('ICE Connection State:', peerConnection.iceConnectionState);
    if (peerConnection.iceConnectionState === 'connected' || peerConnection.iceConnectionState === 'completed') {
      showToast('Ses ve görüntü bağlandı! 🟢');
    } else if (peerConnection.iceConnectionState === 'failed') {
      console.warn('ICE failed, restarting...');
      showToast('Bağlantı koptu, yeniden deneniyor... 🟡');
      if (typeof peerConnection.restartIce === 'function') {
        peerConnection.restartIce();
      }
    }
  };

  if (!isAnswerer) {
    try {
      setCallDebug('Teklif hazırlanıyor...');
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await peerConnection.setLocalDescription(offer);

      await waitForIceGathering(peerConnection);

      const finalOffer = peerConnection.localDescription || offer;
      socket.send(JSON.stringify({
        action: 'webrtc_signal',
        target_user: currentCall.peerUser,
        signal: { type: 'offer', sdp: finalOffer.sdp }
      }));
      setCallDebug('Teklif gönderildi, karşı tarafın cevabı bekleniyor...');
    } catch (err) {
      console.error('Teklif oluşturma hatası:', err);
      setCallDebug('Teklif hatası: ' + err.message);
    }
  }
}

async function handleWebRTCSignal(data) {
  const signal = data.signal;
  if (!signal) return;

  if (data.sender) {
    currentCall.peerUser = data.sender;
  }

  try {
    if (signal.type === 'offer') {
      console.log('Offer alındı, yanıtlanıyor...');
      setCallDebug('Teklif alındı, yanıt hazırlanıyor...');
      if (!peerConnection) await initPeerConnection(true);

      await peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));

      while (iceCandidateQueue.length > 0) {
        const cand = iceCandidateQueue.shift();
        await safelyAddIceCandidate(peerConnection, cand);
      }

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      await waitForIceGathering(peerConnection);

      const finalAnswer = peerConnection.localDescription || answer;
      socket.send(JSON.stringify({
        action: 'webrtc_signal',
        target_user: data.sender,
        signal: { type: 'answer', sdp: finalAnswer.sdp }
      }));
      setCallDebug('Cevap gönderildi, bağlantı kuruluyor...');
    } else if (signal.type === 'answer') {
      console.log('Answer alındı, bağlantı kilitleniyor...');
      setCallDebug('Cevap alındı, ses/görüntü açılıyor...');
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
        while (iceCandidateQueue.length > 0) {
          const cand = iceCandidateQueue.shift();
          await safelyAddIceCandidate(peerConnection, cand);
        }
      }
    } else if (signal.type === 'candidate') {
      const cand = signal.candidate;
      if (cand && cand.candidate) {
        if (peerConnection && peerConnection.remoteDescription) {
          await safelyAddIceCandidate(peerConnection, cand);
        } else {
          iceCandidateQueue.push(cand);
        }
      }
    }
  } catch (err) {
    console.error('WebRTC sinyal hatası:', err);
    setCallDebug('Sinyal hatası: ' + err.message);
  }
}

function setupActiveCallScreen(displayName, isVideo) {
  const peerNameEl = document.getElementById('active-call-peer-name');
  const audioDisplay = document.getElementById('audio-call-display');
  const audioAvatar = document.getElementById('audio-call-avatar');
  const audioName = document.getElementById('audio-call-name');
  const localVideo = document.getElementById('local-video');
  const remoteVideo = document.getElementById('remote-video');

  if (peerNameEl) peerNameEl.textContent = displayName;

  if (isVideo) {
    if (audioDisplay) audioDisplay.style.display = 'none';
    if (localVideo) {
      localVideo.style.display = 'block';
      localVideo.srcObject = localStream;
    }
    if (remoteVideo) {
      remoteVideo.style.display = 'block';
      remoteVideo.style.opacity = '1';
    }
  } else {
    if (audioDisplay) audioDisplay.style.display = 'flex';
    if (audioAvatar) {
      audioAvatar.textContent = getInitials(displayName);
      audioAvatar.style.background = stringToColor(displayName);
    }
    if (audioName) audioName.textContent = displayName;
    if (localVideo) localVideo.style.display = 'none';
    if (remoteVideo) {
      remoteVideo.style.display = 'block';
      remoteVideo.style.opacity = '0.001';
    }
  }

  if (activeCallModal) activeCallModal.style.display = 'flex';
  startCallTimer();
}

function startCallTimer() {
  currentCall.seconds = 0;
  const timerEl = document.getElementById('active-call-timer');
  if (timerEl) timerEl.textContent = '00:00';
  if (currentCall.timerInterval) clearInterval(currentCall.timerInterval);

  currentCall.timerInterval = setInterval(() => {
    currentCall.seconds++;
    const m = String(Math.floor(currentCall.seconds / 60)).padStart(2, '0');
    const s = String(currentCall.seconds % 60).padStart(2, '0');
    if (timerEl) timerEl.textContent = `${m}:${s}`;
  }, 1000);
}

function endCall(sendSignal = true) {
  stopRingtone();
  stopTitleFlash();

  if (sendSignal && currentCall.peerUser && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      action: 'end_call',
      target_user: currentCall.peerUser
    }));
  }

  if (currentCall.timerInterval) {
    clearInterval(currentCall.timerInterval);
    currentCall.timerInterval = null;
  }

  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
  }
  const dbg = document.getElementById('call-debug');
  if (dbg) dbg.remove();

  if (isScreenSharing) {
    stopScreenShare();
  }

  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }

  if (remoteStream) {
    remoteStream.getTracks().forEach(t => t.stop());
    remoteStream = null;
  }

  if (peerConnection) {
    try { peerConnection.close(); } catch (e) {}
    peerConnection = null;
  }

  const localVideo = document.getElementById('local-video');
  const remoteVideo = document.getElementById('remote-video');
  const remoteAudio = document.getElementById('remote-audio');
  if (localVideo) localVideo.srcObject = null;
  if (remoteVideo) remoteVideo.srcObject = null;
  if (remoteAudio) remoteAudio.srcObject = null;

  iceCandidateQueue = [];

  if (activeCallModal) activeCallModal.style.display = 'none';
  if (incomingCallModal) incomingCallModal.style.display = 'none';
  currentCall.peerUser = null;
  currentCall.isVideo = false;
  currentCall.isCaller = false;
  currentCall.seconds = 0;
}

// Flip Camera (Ön / Arka Kamera Çevirme)
async function flipCamera() {
  if (!currentCall.isVideo || !localStream) {
    showToast('Kamera çevirme yalnızca görüntülü aramalarda geçerlidir.');
    return;
  }

  currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

  try {
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { exact: currentFacingMode } },
      audio: false
    });

    const newVideoTrack = newStream.getVideoTracks()[0];
    const oldVideoTrack = localStream.getVideoTracks()[0];

    if (oldVideoTrack) {
      oldVideoTrack.stop();
      localStream.removeTrack(oldVideoTrack);
    }
    localStream.addTrack(newVideoTrack);

    const localVideo = document.getElementById('local-video');
    if (localVideo) localVideo.srcObject = localStream;

    if (peerConnection) {
      const senders = peerConnection.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(newVideoTrack);
      }
    }
    showToast(`Kamera çevrildi (${currentFacingMode === 'user' ? 'Ön' : 'Arka'}) 🔄`);
  } catch (err) {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    showToast('Kamera çevrilemedi (ikinci kamera bulunamadı).');
  }
}

// Ekran Paylaşımı
async function toggleScreenShare() {
  if (!peerConnection) {
    showToast('Ekran paylaşmak için aktif bir görüşmede olmalısınız.');
    return;
  }

  const shareBtn = document.getElementById('share-screen-btn');

  if (!isScreenSharing) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert('Cihazınız veya tarayıcınız ekran paylaşımını desteklemiyor.');
      return;
    }

    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      const screenTrack = screenStream.getVideoTracks()[0];

      screenTrack.onended = () => {
        stopScreenShare();
      };

      const senders = peerConnection.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');

      if (videoSender) {
        await videoSender.replaceTrack(screenTrack);
      } else {
        peerConnection.addTrack(screenTrack, localStream || screenStream);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.send(JSON.stringify({
          action: 'webrtc_signal',
          target_user: currentCall.peerUser,
          signal: { type: 'offer', sdp: offer.sdp }
        }));
      }

      const localVideo = document.getElementById('local-video');
      if (localVideo) {
        localVideo.srcObject = screenStream;
        localVideo.style.display = 'block';
      }

      const audioDisplay = document.getElementById('audio-call-display');
      if (audioDisplay) audioDisplay.style.display = 'none';

      isScreenSharing = true;
      if (shareBtn) shareBtn.classList.add('active-screen');
      showToast('Ekran paylaşımı başlatıldı 🖥️');
    } catch (err) {
      console.warn('Ekran paylaşımı iptal:', err);
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

  const shareBtn = document.getElementById('share-screen-btn');
  if (shareBtn) shareBtn.classList.remove('active-screen');

  if (currentCall.isVideo && localStream) {
    const origVideoTrack = localStream.getVideoTracks()[0];
    if (origVideoTrack && peerConnection) {
      const videoSender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
      if (videoSender) await videoSender.replaceTrack(origVideoTrack);
    }
    const localVideo = document.getElementById('local-video');
    if (localVideo) localVideo.srcObject = localStream;
  } else {
    const localVideo = document.getElementById('local-video');
    if (localVideo) localVideo.style.display = 'none';
    const audioDisplay = document.getElementById('audio-call-display');
    if (audioDisplay) audioDisplay.style.display = 'flex';
  }

  showToast('Ekran paylaşımı durduruldu.');
}

// ==================== EVENT LISTENERS SETUP ====================
function setupEventListeners() {
  if (mobileBackBtn) {
    mobileBackBtn.addEventListener('click', () => {
      if (appLayout) {
        appLayout.classList.remove('chat-open');
        appLayout.classList.remove('mobile-chat-open');
      }
    });
  }

  if (navTabs) {
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        navTabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        const targetEl = document.getElementById(`${target}-list`);
        if (targetEl) targetEl.classList.add('active');
      });
    });
  }

  if (chatSearch) {
    chatSearch.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.chat-item').forEach(item => {
        const nameEl = item.querySelector('.name');
        const name = nameEl ? nameEl.textContent.toLowerCase() : '';
        item.style.display = name.includes(query) ? 'flex' : 'none';
      });
    });
  }

  if (messagesContainer && scrollBottomBtn) {
    messagesContainer.addEventListener('scroll', () => {
      const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 150;
      scrollBottomBtn.style.display = isNearBottom ? 'none' : 'flex';
    });
    scrollBottomBtn.addEventListener('click', scrollToBottom);
  }

  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (messageInput) {
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    messageInput.addEventListener('input', () => {
      messageInput.style.height = 'auto';
      messageInput.style.height = `${Math.min(messageInput.scrollHeight, 120)}px`;

      sendTypingStatus(true);
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => sendTypingStatus(false), 2000);
    });
  }

  if (cancelReplyBtn) cancelReplyBtn.addEventListener('click', cancelReply);

  if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleFileUpload(file);
      fileInput.value = '';
    });
  }

  if (voiceBtn) {
    voiceBtn.addEventListener('click', async () => {
      if (recordingBar && recordingBar.style.display === 'flex') return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.start();
        if (recordingBar) recordingBar.style.display = 'flex';
        let sec = 0;
        if (recTimer) recTimer.textContent = '00:00';
        recTimerInterval = setInterval(() => {
          sec++;
          const m = String(Math.floor(sec / 60)).padStart(2, '0');
          const s = String(sec % 60).padStart(2, '0');
          if (recTimer) recTimer.textContent = `${m}:${s}`;
        }, 1000);
      } catch (err) {
        showToast('Mikrofon erişimi reddedildi.');
      }
    });
  }

  if (cancelRecBtn) {
    cancelRecBtn.addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
      }
      clearInterval(recTimerInterval);
      if (recordingBar) recordingBar.style.display = 'none';
      audioChunks = [];
    });
  }

  if (sendRecBtn) {
    sendRecBtn.addEventListener('click', () => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
      clearInterval(recTimerInterval);
      mediaRecorder.onstop = async () => {
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        await handleFileUpload(audioFile);
      };
      mediaRecorder.stop();
      if (recordingBar) recordingBar.style.display = 'none';
    });
  }

  if (emojiBtn && emojiPicker) {
    emojiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'flex' : 'none';
    });
    document.addEventListener('click', (e) => {
      if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
        emojiPicker.style.display = 'none';
      }
    });
  }

  if (voiceCallBtn) {
    voiceCallBtn.addEventListener('click', () => {
      if (activeChat.isDirect && activeChat.recipient) {
        startCallTo(activeChat.recipient, false);
      } else {
        showUserPickerForCall(false);
      }
    });
  }

  if (videoCallBtn) {
    videoCallBtn.addEventListener('click', () => {
      if (activeChat.isDirect && activeChat.recipient) {
        startCallTo(activeChat.recipient, true);
      } else {
        showUserPickerForCall(true);
      }
    });
  }

  if (searchChatBtn && inChatSearchBar) {
    searchChatBtn.addEventListener('click', () => {
      if (inChatSearchBar.style.display === 'none') {
        inChatSearchBar.style.display = 'flex';
        if (inChatSearchInput) inChatSearchInput.focus();
      } else {
        closeInChatSearchBarFunc();
      }
    });
  }
  if (closeInChatSearch) closeInChatSearch.addEventListener('click', closeInChatSearchBarFunc);
  if (inChatSearchInput) {
    inChatSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      let matchCount = 0;
      document.querySelectorAll('.message-row').forEach(row => {
        const textEl = row.querySelector('.msg-text');
        const text = textEl ? textEl.textContent.toLowerCase() : '';
        if (q && text.includes(q)) {
          row.classList.remove('search-hidden');
          matchCount++;
        } else if (q) {
          row.classList.add('search-hidden');
        } else {
          row.classList.remove('search-hidden');
        }
      });
      if (searchResultCount) {
        searchResultCount.textContent = q ? `${matchCount} sonuç` : '';
      }
    });
  }

  const declineBtn = document.getElementById('decline-call-btn');
  const acceptBtn = document.getElementById('accept-call-btn');
  const hangupBtn = document.getElementById('hangup-call-btn');
  const flipBtn = document.getElementById('flip-cam-btn');
  const shareBtn = document.getElementById('share-screen-btn');
  const toggleMic = document.getElementById('toggle-mic-btn');
  const toggleCam = document.getElementById('toggle-cam-btn');

  if (declineBtn) declineBtn.addEventListener('click', () => answerCall(false));
  if (acceptBtn) acceptBtn.addEventListener('click', () => answerCall(true));
  if (hangupBtn) hangupBtn.addEventListener('click', () => endCall(true));
  if (flipBtn) flipBtn.addEventListener('click', flipCamera);
  if (shareBtn) shareBtn.addEventListener('click', toggleScreenShare);

  if (toggleMic) {
    toggleMic.addEventListener('click', () => {
      if (!localStream) return;
      const t = localStream.getAudioTracks()[0];
      if (t) {
        t.enabled = !t.enabled;
        toggleMic.classList.toggle('muted', !t.enabled);
        toggleMic.innerHTML = t.enabled ? '<i class="fa-solid fa-microphone"></i>' : '<i class="fa-solid fa-microphone-slash"></i>';
        showToast(t.enabled ? 'Mikrofon açıldı' : 'Mikrofon kapatıldı');
      }
    });
  }

  if (toggleCam) {
    toggleCam.addEventListener('click', () => {
      if (!localStream) return;
      const t = localStream.getVideoTracks()[0];
      if (t) {
        t.enabled = !t.enabled;
        toggleCam.classList.toggle('muted', !t.enabled);
        toggleCam.innerHTML = t.enabled ? '<i class="fa-solid fa-video"></i>' : '<i class="fa-solid fa-video-slash"></i>';
        showToast(t.enabled ? 'Kamera açıldı' : 'Kamera kapatıldı');
      }
    });
  }

  if (closeCallPickerBtn && callPickerModal) {
    closeCallPickerBtn.addEventListener('click', () => {
      callPickerModal.style.display = 'none';
    });
  }

  if (closeImageModal && imageModal) {
    closeImageModal.addEventListener('click', () => {
      imageModal.style.display = 'none';
      if (modalImg) modalImg.src = '';
    });
    imageModal.addEventListener('click', (e) => {
      if (e.target === imageModal) {
        imageModal.style.display = 'none';
        if (modalImg) modalImg.src = '';
      }
    });
  }

  if (activeCallModal) {
    activeCallModal.addEventListener('click', () => {
      const remAudio = document.getElementById('remote-audio');
      if (remAudio) {
        remAudio.muted = false;
        remAudio.volume = 1.0;
        remAudio.play().catch(() => {});
      }
      if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
      }
    });
  }
}

// ==================== GENERAL HELPERS ====================
function openImageModal(url) {
  if (modalImg) modalImg.src = url;
  if (imageModal) imageModal.style.display = 'flex';
}

function getInitials(name) {
  if (!name) return '?';
  const clean = name.split('#')[0].trim();
  const parts = clean.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function stringToColor(str) {
  if (!str) return '#10b981';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#ef4444', '#14b8a6'];
  return colors[Math.abs(hash) % colors.length];
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="msg-link">${url}</a>`;
  });
}

function formatBytes(bytes, decimals = 1) {
  if (!bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function scrollToMessage(msgId) {
  const row = document.querySelector(`.message-row[data-msg-id="${msgId}"]`);
  if (row) {
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('highlighted');
    setTimeout(() => row.classList.remove('highlighted'), 2000);
  }
}

function createAudioPlayerHTML(url) {
  return `
    <div class="voice-player">
      <audio src="${url}" controls preload="metadata"></audio>
    </div>
  `;
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
