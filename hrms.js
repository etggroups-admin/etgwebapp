/* =============================================
   ETG TRAVELS — Internal Chat Module
   ============================================= */

function initChat() {
  // Inject chat widget HTML into the page
  const chatHTML = `
    <!-- Chat FAB Button -->
    <button class="chat-fab" id="chatFab" onclick="toggleChatBox()">
      <i class="fa-solid fa-comments"></i>
      <span class="chat-fab-badge" id="chatFabBadge" style="display:none;">0</span>
    </button>

    <!-- Chat Box -->
    <div class="chat-box" id="chatBox">
      <div class="chat-box-header">
        <div class="chat-header-left" id="chatHeaderLeft">
          <div class="chat-header-avatar"><i class="fa-solid fa-comments"></i></div>
          <div>
            <h4 id="chatHeaderTitle">ETG Chat</h4>
            <span class="chat-header-sub" id="chatHeaderSub">Internal Messaging</span>
          </div>
        </div>
        <div class="chat-header-actions">
          <button class="chat-header-btn" id="chatBackBtn" style="display:none;" onclick="showContactList()"><i class="fa-solid fa-arrow-left"></i></button>
          <button class="chat-header-btn" onclick="toggleChatBox()"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>

      <!-- Contact List View -->
      <div class="chat-contacts" id="chatContacts">
        <div class="chat-search">
          <i class="fa-solid fa-search"></i>
          <input type="text" id="chatSearchInput" placeholder="Search by name or ID..." oninput="filterContacts()">
        </div>
        <div class="chat-contact-list" id="chatContactList"></div>
      </div>

      <!-- Conversation View -->
      <div class="chat-conversation" id="chatConversation" style="display:none;">
        <div class="chat-messages" id="chatMessages"></div>
        <div class="chat-input-area">
          <input type="text" id="chatInput" placeholder="Type a message..." onkeydown="if(event.key==='Enter')sendChatMessage()">
          <button class="chat-send-btn" onclick="sendChatMessage()"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
      </div>
    </div>`;

  const container = document.createElement('div');
  container.id = 'chatWidget';
  container.innerHTML = chatHTML;
  document.body.appendChild(container);
}

let chatOpen = false;
let activeChatUser = null; // The user we're chatting with

function toggleChatBox() {
  const box = document.getElementById('chatBox');
  chatOpen = !chatOpen;
  if (chatOpen) {
    box.classList.add('open');
    showContactList();
  } else {
    box.classList.remove('open');
  }
}

function getMyId() {
  return currentUser ? (currentUser.empId || currentUser.username || 'admin') : 'admin';
}

function getChatKey(id1, id2) {
  return [id1, id2].sort().join('__');
}

function getAllChatUsers() {
  const users = getData('etg_users') || [];
  const myId = getMyId();
  return users.filter(u => (u.empId || u.username) !== myId).map(u => ({
    id: u.empId || u.username,
    name: u.fullName,
    role: u.role,
    avatar: u.fullName ? u.fullName.charAt(0).toUpperCase() : '?'
  }));
}

function getUnreadCount(contactId) {
  const key = getChatKey(getMyId(), contactId);
  const chats = getData('etg_chats') || {};
  const msgs = chats[key] || [];
  return msgs.filter(m => m.to === getMyId() && !m.read).length;
}

function getTotalUnread() {
  const contacts = getAllChatUsers();
  return contacts.reduce((sum, c) => sum + getUnreadCount(c.id), 0);
}

function refreshFabBadge() {
  const total = getTotalUnread();
  const badge = document.getElementById('chatFabBadge');
  if (badge) {
    if (total > 0) {
      badge.style.display = 'flex';
      badge.textContent = total > 9 ? '9+' : total;
    } else {
      badge.style.display = 'none';
    }
  }
}

function showContactList() {
  activeChatUser = null;
  document.getElementById('chatContacts').style.display = 'flex';
  document.getElementById('chatConversation').style.display = 'none';
  document.getElementById('chatBackBtn').style.display = 'none';
  document.getElementById('chatHeaderTitle').textContent = 'ETG Chat';
  document.getElementById('chatHeaderSub').textContent = 'Internal Messaging';
  const avatarEl = document.querySelector('.chat-header-avatar');
  if (avatarEl) avatarEl.innerHTML = '<i class="fa-solid fa-comments"></i>';
  renderContactList();
}

function renderContactList() {
  const contacts = getAllChatUsers();
  const search = (document.getElementById('chatSearchInput')?.value || '').toLowerCase();
  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search) || c.id.toLowerCase().includes(search)
  );

  const listEl = document.getElementById('chatContactList');
  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="chat-empty"><i class="fa-solid fa-user-slash"></i><p>${contacts.length === 0 ? 'No other users found. Create users in Admin Panel.' : 'No matches found.'}</p></div>`;
    return;
  }

  listEl.innerHTML = filtered.map(c => {
    const unread = getUnreadCount(c.id);
    const key = getChatKey(getMyId(), c.id);
    const chats = getData('etg_chats') || {};
    const msgs = chats[key] || [];
    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
    const lastText = lastMsg ? (lastMsg.text.length > 30 ? lastMsg.text.substring(0, 30) + '…' : lastMsg.text) : 'No messages yet';
    const lastTime = lastMsg ? formatChatTime(lastMsg.time) : '';
    const roleColors = { admin: '#e94560', staff: '#1e7fd9', accounts: '#1fb864', hr: '#e6930a' };
    const roleColor = roleColors[c.role] || '#888';

    return `<div class="chat-contact-item ${unread > 0 ? 'unread' : ''}" onclick="openConversation('${c.id}')">
      <div class="chat-contact-avatar" style="background:${roleColor}20;color:${roleColor};">${c.avatar}</div>
      <div class="chat-contact-info">
        <div class="chat-contact-top">
          <span class="chat-contact-name">${c.name}</span>
          <span class="chat-contact-time">${lastTime}</span>
        </div>
        <div class="chat-contact-bottom">
          <span class="chat-contact-preview">${lastText}</span>
          ${unread > 0 ? `<span class="chat-contact-badge">${unread}</span>` : ''}
        </div>
        <span class="chat-contact-id">${c.id} · ${c.role}</span>
      </div>
    </div>`;
  }).join('');
}

function filterContacts() {
  renderContactList();
}

function openConversation(contactId) {
  const contacts = getAllChatUsers();
  const contact = contacts.find(c => c.id === contactId);
  if (!contact) return;

  activeChatUser = contact;

  // Mark messages as read
  markAsRead(contactId);

  // Update header
  document.getElementById('chatHeaderTitle').textContent = contact.name;
  document.getElementById('chatHeaderSub').textContent = contact.id + ' · ' + contact.role;
  const avatarEl = document.querySelector('.chat-header-avatar');
  if (avatarEl) avatarEl.textContent = contact.avatar;

  // Show conversation view
  document.getElementById('chatContacts').style.display = 'none';
  document.getElementById('chatConversation').style.display = 'flex';
  document.getElementById('chatBackBtn').style.display = 'block';

  renderMessages();
  refreshFabBadge();

  // Focus input
  setTimeout(() => document.getElementById('chatInput')?.focus(), 200);
}

function markAsRead(contactId) {
  const key = getChatKey(getMyId(), contactId);
  const chats = getData('etg_chats') || {};
  const msgs = chats[key] || [];
  msgs.forEach(m => { if (m.to === getMyId()) m.read = true; });
  chats[key] = msgs;
  setData('etg_chats', chats);
}

function renderMessages() {
  if (!activeChatUser) return;
  const key = getChatKey(getMyId(), activeChatUser.id);
  const chats = getData('etg_chats') || {};
  const msgs = chats[key] || [];
  const container = document.getElementById('chatMessages');

  if (msgs.length === 0) {
    container.innerHTML = `<div class="chat-empty"><i class="fa-solid fa-hand-peace"></i><p>Say hello to ${activeChatUser.name}!</p></div>`;
    return;
  }

  let lastDate = '';
  container.innerHTML = msgs.map(m => {
    const isMine = m.from === getMyId();
    const msgDate = new Date(m.time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    let dateSep = '';
    if (msgDate !== lastDate) {
      lastDate = msgDate;
      dateSep = `<div class="chat-date-sep"><span>${msgDate}</span></div>`;
    }
    const timeStr = new Date(m.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return `${dateSep}<div class="chat-msg ${isMine ? 'mine' : 'theirs'}">
      <div class="chat-bubble">${escapeHTML(m.text)}<span class="chat-msg-time">${timeStr}</span></div>
    </div>`;
  }).join('');

  // Scroll to bottom
  setTimeout(() => container.scrollTop = container.scrollHeight, 50);
}

function sendChatMessage() {
  if (!activeChatUser) return;
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  const key = getChatKey(getMyId(), activeChatUser.id);
  const chats = getData('etg_chats') || {};
  if (!chats[key]) chats[key] = [];

  chats[key].push({
    from: getMyId(),
    to: activeChatUser.id,
    text: text,
    time: new Date().toISOString(),
    read: false
  });

  setData('etg_chats', chats);
  input.value = '';
  renderMessages();
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatChatTime(isoStr) {
  const d = new Date(isoStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
  if (diff < 86400000) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// Initialize chat when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initChat();
  setInterval(refreshFabBadge, 3000);
});
