/* =============================================
   ETG TRAVELS — Main App (Auth, Routing, Dashboard)
   ============================================= */

// ===== INDEXEDDB STORAGE ENGINE =====
// Uses in-memory cache for instant sync reads + IndexedDB for persistence (supports 10,000+ records)
const _cache = {};
let _dbReady = false;
let _db = null;
const DB_NAME = 'etg_erp_db';
const DB_VERSION = 1;
const STORE_NAME = 'appdata';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => { e.target.result.createObjectStore(STORE_NAME); };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = (e) => { console.error('IndexedDB error:', e); reject(e); };
  });
}

function getData(key) {
  if (_cache[key] !== undefined) return _cache[key];
  // Fallback to localStorage during initial load
  try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
}

function setData(key, val) {
  _cache[key] = val;
  // Persist to IndexedDB (async, fire-and-forget)
  if (_db) {
    try {
      const tx = _db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(val, key);
    } catch (e) { console.warn('DB write error:', e); }
  }
  // Also keep in localStorage as backup (ignore quota errors)
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) { /* quota exceeded — OK, IndexedDB has it */ }
}

// Load all data from IndexedDB into cache on startup
async function loadFromDB() {
  try {
    await openDB();
    const tx = _db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const keys = await new Promise(r => { const req = store.getAllKeys(); req.onsuccess = () => r(req.result); });
    for (const key of keys) {
      const val = await new Promise(r => { const req = store.get(key); req.onsuccess = () => r(req.result); });
      _cache[key] = val;
    }
    _dbReady = true;
    // Migrate any localStorage data not yet in IndexedDB
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('etg_') && _cache[k] === undefined) {
        try { _cache[k] = JSON.parse(localStorage.getItem(k)); setData(k, _cache[k]); } catch {}
      }
    }
    console.log('✅ IndexedDB loaded — supports 10,000+ records');
  } catch(e) {
    console.warn('IndexedDB unavailable, using localStorage fallback:', e);
  }
}
loadFromDB();

// ===== INIT DEFAULT DATA =====
function initDefaults() {
  if (!getData('etg_users')) {
    setData('etg_users', [
      { id: 1, username: 'admin', password: 'admin123', role: 'admin', fullName: 'Administrator', attempts: 0, locked: false }
    ]);
  }
  if (!getData('etg_employees')) setData('etg_employees', []);
  if (!getData('etg_attendance')) setData('etg_attendance', []);
  if (!getData('etg_leaves')) setData('etg_leaves', []);
  if (!getData('etg_bookings')) setData('etg_bookings', []);
  if (!getData('etg_customers')) setData('etg_customers', []);
  if (!getData('etg_invoices')) setData('etg_invoices', []);
  if (!getData('etg_purchases')) setData('etg_purchases', []);
  if (!getData('etg_chats')) setData('etg_chats', {});
  if (!getData('etg_counter')) setData('etg_counter', { customer: 1000, invoice: 1000, employee: 100 });
}
initDefaults();

// ===== AUTH =====
let currentUser = null;
const MAX_ATTEMPTS = 50;

document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value.trim();
  const users = getData('etg_users');
  const user = users.find(u => u.username === username);

  if (!user) { showLoginError('Invalid username or password'); return; }
  if (user.locked) { showLoginError('Account locked. Contact administrator.'); return; }
  if (user.password !== password) {
    user.attempts = (user.attempts || 0) + 1;
    if (user.attempts >= MAX_ATTEMPTS) { user.locked = true; }
    setData('etg_users', users);
    const remaining = MAX_ATTEMPTS - user.attempts;
    if (user.locked) { showLoginError('Account locked after 5 failed attempts.'); }
    else { showLoginError(`Invalid password. ${remaining} attempt(s) remaining.`); }
    return;
  }
  // Success
  user.attempts = 0;
  setData('etg_users', users);
  currentUser = user;
  setData('etg_session', { userId: user.id, username: user.username, role: user.role, fullName: user.fullName });
  enterApp();
});

function showLoginError(msg) {
  document.getElementById('loginError').textContent = msg;
  document.getElementById('loginError').style.animation = 'none';
  setTimeout(() => document.getElementById('loginError').style.animation = 'pulse 0.5s', 10);
}

function enterApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appContainer').classList.add('active');
  document.getElementById('userName').textContent = currentUser.fullName;
  const roleLabels = { admin: 'Administrator', staff: 'Staff', accounts: 'Accounts', hr: 'HR' };
  document.getElementById('userRole').textContent = roleLabels[currentUser.role] || currentUser.role;
  document.getElementById('userAvatar').textContent = currentUser.fullName.charAt(0).toUpperCase();
  const role = currentUser.role;
  // Admin: full access
  document.getElementById('adminNav').style.display = role === 'admin' ? '' : 'none';
  // HRMS sidebar: admin + hr
  document.getElementById('hrmsNav').style.display = (role === 'admin' || role === 'hr') ? '' : 'none';
  // Accounting sidebar: admin + accounts
  document.getElementById('accountingNav').style.display = (role === 'admin' || role === 'accounts') ? '' : 'none';
  // Employee Profile sidebar: hide for staff
  document.getElementById('empProfileNav').style.display = role === 'staff' ? 'none' : '';

  // Dashboard cards visibility
  // Employee Profile card: hide for staff + accounts
  document.getElementById('empProfileCard').style.display = (role === 'staff' || role === 'accounts') ? 'none' : '';
  // HRMS card: hide for staff + accounts
  document.getElementById('hrmsCard').style.display = (role === 'staff' || role === 'accounts') ? 'none' : '';
  // Accounting card: hide for staff + hr
  document.getElementById('accountingCard').style.display = (role === 'staff' || role === 'hr') ? 'none' : '';
  navigateTo('dashboard');
}

function logout() {
  currentUser = null;
  localStorage.removeItem('etg_session');
  document.getElementById('appContainer').classList.remove('active');
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').textContent = '';
  hideForgotPassword();
}

// ===== FORGOT PASSWORD (OTP) =====
const ADMIN_MOBILE = '+919444055882';
let generatedOTP = null;
let otpExpiry = null;

function showForgotPassword() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('forgotPasswordSection').style.display = 'block';
  document.getElementById('otpStep1').style.display = 'block';
  document.getElementById('otpStep2').style.display = 'none';
  document.getElementById('otpStep3').style.display = 'none';
  generatedOTP = null;
}

function hideForgotPassword() {
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('forgotPasswordSection').style.display = 'none';
  generatedOTP = null;
}

function sendOTP() {
  // Generate 6-digit OTP
  generatedOTP = String(Math.floor(100000 + Math.random() * 900000));
  otpExpiry = Date.now() + 5 * 60 * 1000; // 5 min expiry

  // Simulate sending OTP (in production, this would call an SMS API)
  showToast(`OTP sent to +91 94440 55882: ${generatedOTP}`, 'success');
  console.log('OTP for admin reset:', generatedOTP);

  // Show step 2
  document.getElementById('otpStep1').style.display = 'none';
  document.getElementById('otpStep2').style.display = 'block';
}

function verifyOTP() {
  const entered = document.getElementById('otpInput').value.trim();
  if (!entered) { showToast('Please enter the OTP', 'error'); return; }
  if (Date.now() > otpExpiry) {
    showToast('OTP expired. Please request a new one.', 'error');
    document.getElementById('otpStep2').style.display = 'none';
    document.getElementById('otpStep1').style.display = 'block';
    generatedOTP = null;
    return;
  }
  if (entered !== generatedOTP) {
    showToast('Invalid OTP. Please try again.', 'error');
    return;
  }
  // OTP verified — show reset password form
  showToast('OTP verified successfully!', 'success');
  document.getElementById('otpStep2').style.display = 'none';
  document.getElementById('otpStep3').style.display = 'block';
}

function resetAdminPassword() {
  const newPass = document.getElementById('newAdminPass').value.trim();
  const confirmPass = document.getElementById('confirmAdminPass').value.trim();
  if (!newPass || !confirmPass) { showToast('Please fill both password fields', 'error'); return; }
  if (newPass.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
  if (newPass !== confirmPass) { showToast('Passwords do not match', 'error'); return; }

  // Update admin password
  const users = getData('etg_users');
  const admin = users.find(u => u.role === 'admin');
  if (admin) {
    admin.password = newPass;
    admin.locked = false;
    admin.attempts = 0;
    setData('etg_users', users);
    showToast('Admin password reset successfully!', 'success');
    hideForgotPassword();
  } else {
    showToast('Admin account not found', 'error');
  }
}

// Auto-login from session
(function checkSession() {
  const session = getData('etg_session');
  if (session) {
    const users = getData('etg_users');
    const user = users.find(u => u.id === session.userId);
    if (user && !user.locked) { currentUser = user; enterApp(); }
  }
})();

// ===== NAVIGATION =====
function navigateTo(page) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const section = document.getElementById('page-' + page);
  if (section) section.classList.add('active');
  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');
  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  // Load page content
  switch(page) {
    case 'dashboard': renderDashboard(); break;
    case 'empprofile':
      if (currentUser && currentUser.role === 'staff') { navigateTo('dashboard'); showToast('Access denied', 'error'); return; }
      renderEmpProfile(); break;
    case 'hrms': renderHRMS(); break;
    case 'onboard': renderOnboard(); break;
    case 'customers': renderCustomers(); break;
    case 'invoice': renderInvoice(); break;
    case 'purchases': renderPurchases(); break;
    case 'accounting': renderAccounting(); break;
    case 'tickets': renderTickets(); break;
    case 'calls': renderCalls(); break;
    case 'mail': renderMail(); break;
    case 'admin': renderAdmin(); break;
  }
}

// ===== DASHBOARD =====
function renderDashboard() {
  const customers = getData('etg_customers') || [];
  const bookings = getData('etg_bookings') || [];
  const invoices = getData('etg_invoices') || [];
  const employees = getData('etg_employees') || [];
  const totalRevenue = bookings.reduce((s, b) => s + (parseFloat(b.costPaid)||0) + (parseFloat(b.visaFee)||0) + (parseFloat(b.otherFee)||0) + (parseFloat(b.serviceFee)||0), 0);
  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card"><div class="stat-icon gold"><i class="fa-solid fa-users"></i></div><div class="stat-info"><h4>${customers.length}</h4><p>Total Customers</p></div></div>
    <div class="stat-card"><div class="stat-icon red"><i class="fa-solid fa-plane"></i></div><div class="stat-info"><h4>${bookings.length}</h4><p>Total Bookings</p></div></div>
    <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-indian-rupee-sign"></i></div><div class="stat-info"><h4>₹${totalRevenue.toLocaleString('en-IN')}</h4><p>Total Revenue</p></div></div>
    <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-user-tie"></i></div><div class="stat-info"><h4>${employees.length}</h4><p>Employees</p></div></div>
  `;

  // Notification Alerts on Dashboard
  const notifs = getData('etg_notifications') || [];
  const myNotifs = notifs.filter(n => {
    if (n.forRole === 'all') return true;
    if (n.forRole === 'admin' && currentUser.role === 'admin') return true;
    if (n.forUser && n.forUser === currentUser.username) return true;
    if (n.forRole === 'staff' && currentUser.role === 'staff') return true;
    return false;
  });
  const unreadNotifs = myNotifs.filter(n => !n.read);

  let alertsHTML = '';
  if (unreadNotifs.length > 0) {
    const alertItems = unreadNotifs.slice(0, 10).map(n => `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:1px solid #f0f1f5;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='#fef5f5'" onmouseout="this.style.background=''" onclick="markNotifRead(${n.id})">
        <div style="width:36px;height:36px;border-radius:50%;background:rgba(233,69,96,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="fa-solid ${n.icon}" style="color:var(--danger);font-size:0.9rem;"></i>
        </div>
        <div style="flex:1;">
          <p style="font-size:0.85rem;color:#1a1a2e;line-height:1.5;">${n.message}</p>
          <p style="font-size:0.7rem;color:#999;margin-top:4px;"><i class="fa-regular fa-clock"></i> ${n.time}</p>
        </div>
        <span style="width:10px;height:10px;border-radius:50%;background:var(--danger);flex-shrink:0;margin-top:6px;animation:pulse 1.5s infinite;"></span>
      </div>
    `).join('');

    alertsHTML = `
    <div class="card mb-24" style="border-left:4px solid var(--danger);">
      <div class="card-header">
        <h3><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> Notifications <span style="background:var(--danger);color:#fff;padding:2px 10px;border-radius:12px;font-size:0.72rem;margin-left:8px;">${unreadNotifs.length} New</span></h3>
        <button class="btn btn-sm btn-secondary" onclick="clearNotifications();renderDashboard();">Mark All Read</button>
      </div>
      ${alertItems}
    </div>`;
  } else {
    alertsHTML = `
    <div class="card mb-24" style="border-left:4px solid var(--success);">
      <div style="display:flex;align-items:center;gap:12px;padding:8px 0;">
        <i class="fa-solid fa-circle-check" style="color:var(--success);font-size:1.3rem;"></i>
        <p style="font-size:0.9rem;color:var(--text-secondary);">No new notifications — you're all caught up! 🎉</p>
      </div>
    </div>`;
  }

  // Insert alerts before the dashboard cards
  const dashContent = document.getElementById('page-dashboard');
  let existingAlerts = document.getElementById('dashAlerts');
  if (existingAlerts) existingAlerts.remove();
  const alertDiv = document.createElement('div');
  alertDiv.id = 'dashAlerts';
  alertDiv.innerHTML = alertsHTML;
  const dashGrid = dashContent.querySelector('.dash-grid');
  dashGrid.parentNode.insertBefore(alertDiv, dashGrid);
}

// ===== ADMIN PANEL =====
function renderAdmin() {
  if (!currentUser || currentUser.role !== 'admin') { navigateTo('dashboard'); showToast('Access denied', 'error'); return; }
  const users = getData('etg_users') || [];
  let rows = users.map(u => {
    const roleBadge = {'admin':'badge-gold','staff':'badge-info','accounts':'badge-success','hr':'badge-warning'};
    const roleLabel = {'admin':'Admin','staff':'Staff','accounts':'Accounts','hr':'HR'};
    return `<tr>
    <td>${u.empId || '—'}</td><td>${u.username}</td><td>${u.fullName}</td><td>${u.email || '—'}</td><td>${u.contact || '—'}</td>
    <td><span class="badge ${roleBadge[u.role]||'badge-info'}">${roleLabel[u.role]||u.role}</span></td>
    <td><span class="badge ${u.locked?'badge-danger':'badge-success'}">${u.locked?'Locked':'Active'}</span></td>
    <td>
      <button class="btn btn-sm btn-secondary" onclick="openEditUserModal(${u.id})"><i class="fa-solid fa-pen"></i> Edit</button>
      ${u.locked ? `<button class="btn btn-sm btn-success" onclick="unlockUser(${u.id})"><i class="fa-solid fa-lock-open"></i> Unlock</button>` : ''}
      ${u.role !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})"><i class="fa-solid fa-trash"></i></button>` : ''}
    </td>
  </tr>`;
  }).join('');
  document.getElementById('adminContent').innerHTML = `
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-user-plus"></i> User Management</h3>
        <button class="btn btn-gold btn-sm" onclick="openCreateUserModal()"><i class="fa-solid fa-plus"></i> Create User</button>
      </div>
      <div class="table-container"><table><thead><tr><th>Emp ID</th><th>Username</th><th>Full Name</th><th>Email</th><th>Contact</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
}

function openCreateUserModal() {
  openModal('<i class="fa-solid fa-user-plus"></i> Create New User', `
    <div class="form-grid">
      <div class="form-group-app"><label>Employee ID *</label><input type="text" id="newEmpId" placeholder="e.g. ETG-001"></div>
      <div class="form-group-app"><label>Username *</label><input type="text" id="newUsername" placeholder="Login username"></div>
      <div class="form-group-app"><label>Full Name *</label><input type="text" id="newFullName" placeholder="Enter full name"></div>
      <div class="form-group-app"><label>Password *</label><input type="password" id="newPassword" placeholder="Enter password"></div>
      <div class="form-group-app"><label>Email ID</label><input type="email" id="newEmail" placeholder="email@example.com"></div>
      <div class="form-group-app"><label>Contact Number</label><input type="tel" id="newContact" placeholder="+91 XXXXXXXXXX"></div>
    </div>
    <div class="form-group-app mt-16"><label>Address</label><textarea id="newAddress" rows="2" placeholder="Enter address" style="resize:vertical;"></textarea></div>
    <div class="form-group-app"><label>Role</label><select id="newRole"><option value="staff">Staff</option><option value="accounts">Accounts</option><option value="hr">HR</option><option value="admin">Admin</option></select></div>
    <button class="btn btn-gold w-full mt-16" onclick="createUser()"><i class="fa-solid fa-user-plus"></i> Create Account</button>
  `);
}

function openEditUserModal(userId) {
  const users = getData('etg_users') || [];
  const u = users.find(x => x.id === userId);
  if (!u) return;
  openModal('<i class="fa-solid fa-user-pen"></i> Edit User — ' + u.fullName, `
    <div class="form-grid">
      <div class="form-group-app"><label>Employee ID</label><input type="text" id="editEmpId" value="${u.empId || ''}"></div>
      <div class="form-group-app"><label>Username</label><input type="text" id="editUsername" value="${u.username}"></div>
      <div class="form-group-app"><label>Full Name</label><input type="text" id="editFullName" value="${u.fullName}"></div>
      <div class="form-group-app"><label>New Password <span style="font-size:0.65rem;color:var(--text-muted);">(leave blank to keep)</span></label><input type="password" id="editPassword" placeholder="Enter new password"></div>
      <div class="form-group-app"><label>Email ID</label><input type="email" id="editEmail" value="${u.email || ''}"></div>
      <div class="form-group-app"><label>Contact Number</label><input type="tel" id="editContact" value="${u.contact || ''}"></div>
    </div>
    <div class="form-group-app mt-16"><label>Address</label><textarea id="editAddress" rows="2" style="resize:vertical;">${u.address || ''}</textarea></div>
    <div class="form-group-app"><label>Role</label><select id="editRole">
      <option value="staff" ${u.role==='staff'?'selected':''}>Staff</option>
      <option value="accounts" ${u.role==='accounts'?'selected':''}>Accounts</option>
      <option value="hr" ${u.role==='hr'?'selected':''}>HR</option>
      <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
    </select></div>
    <button class="btn btn-gold w-full mt-16" onclick="saveEditUser(${u.id})"><i class="fa-solid fa-save"></i> Save Changes</button>
  `);
}

function saveEditUser(userId) {
  const users = getData('etg_users');
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return;
  const username = document.getElementById('editUsername').value.trim();
  const fullName = document.getElementById('editFullName').value.trim();
  const password = document.getElementById('editPassword').value.trim();
  const role = document.getElementById('editRole').value;
  const empId = document.getElementById('editEmpId').value.trim();
  const email = document.getElementById('editEmail').value.trim();
  const contact = document.getElementById('editContact').value.trim();
  const address = document.getElementById('editAddress').value.trim();
  if (!username || !fullName) { showToast('Username and Full Name are required', 'error'); return; }
  const duplicate = users.find(u => u.username === username && u.id !== userId);
  if (duplicate) { showToast('Username already taken', 'error'); return; }
  users[idx].username = username;
  users[idx].fullName = fullName;
  users[idx].role = role;
  users[idx].empId = empId;
  users[idx].email = email;
  users[idx].contact = contact;
  users[idx].address = address;
  if (password) users[idx].password = password;
  setData('etg_users', users);
  if (currentUser.id === userId) {
    currentUser = users[idx];
    setData('etg_session', { userId: currentUser.id, username: currentUser.username, role: currentUser.role, fullName: currentUser.fullName });
    document.getElementById('userName').textContent = currentUser.fullName;
    document.getElementById('userRole').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Staff';
    document.getElementById('userAvatar').textContent = currentUser.fullName.charAt(0).toUpperCase();
  }
  closeModal(); renderAdmin(); showToast('User updated successfully!', 'success');
}

function createUser() {
  const empId = document.getElementById('newEmpId').value.trim();
  const username = document.getElementById('newUsername').value.trim();
  const fullName = document.getElementById('newFullName').value.trim();
  const password = document.getElementById('newPassword').value.trim();
  const email = document.getElementById('newEmail').value.trim();
  const contact = document.getElementById('newContact').value.trim();
  const address = document.getElementById('newAddress').value.trim();
  const role = document.getElementById('newRole').value;
  if (!empId || !username || !fullName || !password) { showToast('Employee ID, Username, Full Name and Password are required', 'error'); return; }
  const users = getData('etg_users');
  if (users.find(u => u.username === username)) { showToast('Username already exists', 'error'); return; }
  users.push({ id: Date.now(), empId, username, password, role, fullName, email, contact, address, attempts: 0, locked: false });
  setData('etg_users', users);
  closeModal();
  renderAdmin();
  showToast('User created successfully!', 'success');
}

function unlockUser(id) {
  const users = getData('etg_users');
  const u = users.find(x => x.id === id);
  if (u) { u.locked = false; u.attempts = 0; setData('etg_users', users); renderAdmin(); showToast('User unlocked', 'success'); }
}

function deleteUser(id) {
  const users = getData('etg_users');
  const u = users.find(x => x.id === id);
  if (u && u.role === 'admin') { showToast('Cannot delete admin accounts', 'error'); return; }
  if (!confirm('Delete this user?')) return;
  const filtered = users.filter(u => u.id !== id);
  setData('etg_users', filtered);
  renderAdmin();
  showToast('User deleted', 'success');
}

// ===== MODAL =====
function openModal(title, body) {
  document.getElementById('modalTitle').innerHTML = title;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalOverlay').classList.add('active');
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('active'); }

// ===== TOAST =====
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
  toast.innerHTML = `<i class="fa-solid ${icons[type]||icons.info}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ===== COUNTER =====
function getNextId(type) {
  const counter = getData('etg_counter');
  counter[type] = (counter[type] || 1000) + 1;
  setData('etg_counter', counter);
  return counter[type];
}

// ===== RESPONSIVE =====
function checkMobile() {
  const toggle = document.getElementById('menuToggle');
  if (window.innerWidth <= 768) toggle.style.display = 'block';
  else { toggle.style.display = 'none'; document.getElementById('sidebar').classList.remove('open'); }
}
window.addEventListener('resize', checkMobile);
checkMobile();

// ===== NOTIFICATIONS =====
function addNotification(message, forRole, icon, forUser) {
  let notifs = getData('etg_notifications') || [];
  notifs.unshift({
    id: Date.now(),
    message,
    forRole: forRole || 'all',
    forUser: forUser || null,
    icon: icon || 'fa-bell',
    time: new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }),
    read: false
  });
  // Keep last 50 notifications
  if (notifs.length > 50) notifs = notifs.slice(0, 50);
  setData('etg_notifications', notifs);
  refreshNotifBadge();
}

function refreshNotifBadge() {
  const notifs = getData('etg_notifications') || [];
  const myNotifs = notifs.filter(n => {
    if (n.forUser && n.forUser === (currentUser && currentUser.username)) return true;
    if (n.forUser && n.forUser !== (currentUser && currentUser.username)) return false;
    if (n.forRole === 'all') return true;
    if (n.forRole === (currentUser && currentUser.role)) return true;
    return false;
  });
  const unread = myNotifs.filter(n => !n.read).length;
  const badge = document.getElementById('notifBadge');
  if (badge) {
    if (unread > 0) {
      badge.style.display = 'flex';
      badge.textContent = unread > 9 ? '9+' : unread;
    } else {
      badge.style.display = 'none';
    }
  }
}

function toggleNotifications() {
  const dropdown = document.getElementById('notifDropdown');
  const isVisible = dropdown.style.display === 'block';
  dropdown.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) renderNotifList();
}

function renderNotifList() {
  const notifs = getData('etg_notifications') || [];
  const myNotifs = notifs.filter(n => {
    if (n.forUser && n.forUser === (currentUser && currentUser.username)) return true;
    if (n.forUser && n.forUser !== (currentUser && currentUser.username)) return false;
    if (n.forRole === 'all') return true;
    if (n.forRole === (currentUser && currentUser.role)) return true;
    return false;
  });
  const list = document.getElementById('notifList');

  if (myNotifs.length === 0) {
    list.innerHTML = '<div style="padding:32px 16px;text-align:center;color:#999;font-size:0.85rem;"><i class="fa-solid fa-bell-slash" style="font-size:1.5rem;display:block;margin-bottom:8px;color:#ddd;"></i>No notifications</div>';
    return;
  }

  list.innerHTML = myNotifs.slice(0, 20).map(n => `
    <div style="padding:12px 16px;border-bottom:1px solid #f5f5f5;display:flex;align-items:flex-start;gap:10px;${n.read ? '' : 'background:#fef9f0;'}" onclick="markNotifRead(${n.id})">
      <i class="fa-solid ${n.icon}" style="color:var(--accent);margin-top:3px;font-size:0.85rem;"></i>
      <div style="flex:1;">
        <p style="font-size:0.82rem;color:#1a1a2e;line-height:1.4;">${n.message}</p>
        <p style="font-size:0.68rem;color:#999;margin-top:4px;">${n.time}</p>
      </div>
      ${!n.read ? '<span style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:6px;"></span>' : ''}
    </div>
  `).join('');
}

function markNotifRead(id) {
  let notifs = getData('etg_notifications') || [];
  const n = notifs.find(x => x.id === id);
  if (n) { n.read = true; setData('etg_notifications', notifs); refreshNotifBadge(); renderNotifList(); }
}

function clearNotifications() {
  let notifs = getData('etg_notifications') || [];
  notifs = notifs.map(n => ({ ...n, read: true }));
  setData('etg_notifications', notifs);
  refreshNotifBadge();
  renderNotifList();
  showToast('All notifications cleared', 'info');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  const dropdown = document.getElementById('notifDropdown');
  const bell = document.getElementById('notifBell');
  if (dropdown && bell && !dropdown.contains(e.target) && !bell.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});

// Refresh badge on page load
setTimeout(() => refreshNotifBadge(), 500);
