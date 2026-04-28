/* =============================================
   ETG GROUPS — Internal Mail Module (Outlook-style)
   ============================================= */

let mailFolder = 'inbox';
let selectedMailId = null;

function renderMail() {
  const mailAccounts = getData('etg_mail_accounts') || [];
  const myAccount = mailAccounts.find(a => a.username === currentUser.username);
  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'hr');

  if (!myAccount && !isAdmin) {
    document.getElementById('mailApp').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:60vh;">
        <div style="text-align:center;color:var(--text-muted);">
          <i class="fa-solid fa-envelope-circle-xmark" style="font-size:3rem;color:var(--accent);margin-bottom:16px;display:block;"></i>
          <h3 style="margin-bottom:8px;">No Mail Account</h3>
          <p>Contact your Admin or HR to create a mail account for you.</p>
        </div>
      </div>`;
    return;
  }

  const allMails = getData('etg_mails') || [];
  const myMail = myAccount ? myAccount.email : currentUser.username + '@etggroups.com';

  let filteredMails = [];
  if (mailFolder === 'inbox') filteredMails = allMails.filter(m => m.to === myMail && !m.deleted);
  else if (mailFolder === 'sent') filteredMails = allMails.filter(m => m.from === myMail && !m.deleted);
  else if (mailFolder === 'starred') filteredMails = allMails.filter(m => (m.to === myMail || m.from === myMail) && m.starred);
  else if (mailFolder === 'trash') filteredMails = allMails.filter(m => (m.to === myMail || m.from === myMail) && m.deleted);

  const inboxCount = allMails.filter(m => m.to === myMail && !m.deleted && !m.read).length;
  const sentCount = allMails.filter(m => m.from === myMail && !m.deleted).length;

  // Outlook layout
  const mailList = filteredMails.length > 0 ? filteredMails.sort((a,b) => b.timestamp - a.timestamp).map(m => {
    const isUnread = !m.read && m.to === myMail;
    const sender = m.from === myMail ? `To: ${m.toName || m.to}` : (m.fromName || m.from);
    return `<div class="mail-item ${isUnread ? 'unread' : ''} ${selectedMailId === m.id ? 'selected' : ''}" onclick="openMail('${m.id}')">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:36px;height:36px;border-radius:50%;background:${isUnread ? 'var(--accent)' : '#dde1e9'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="color:${isUnread ? '#fff' : '#666'};font-size:0.75rem;font-weight:700;">${(m.fromName || m.from).charAt(0).toUpperCase()}</span>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <p style="font-weight:${isUnread ? '700' : '500'};font-size:0.82rem;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${sender}</p>
            <span style="font-size:0.65rem;color:var(--text-muted);flex-shrink:0;">${m.date}</span>
          </div>
          <p style="font-size:0.78rem;font-weight:${isUnread ? '600' : '400'};color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.subject}</p>
          <p style="font-size:0.72rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.body.substring(0, 80)}...</p>
        </div>
      </div>
    </div>`;
  }).join('') : '<div style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fa-regular fa-envelope" style="font-size:2rem;margin-bottom:8px;display:block;"></i>No messages</div>';

  // Selected mail preview
  const sel = selectedMailId ? allMails.find(m => m.id === selectedMailId) : null;
  const previewHTML = sel ? `
    <div style="padding:20px;border-bottom:1px solid var(--border-glass);">
      <h3 style="font-size:1.1rem;margin-bottom:12px;">${sel.subject}</h3>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <div style="width:40px;height:40px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;">
          <span style="color:#fff;font-weight:700;">${(sel.fromName || sel.from).charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <p style="font-weight:600;font-size:0.88rem;">${sel.fromName || sel.from}</p>
          <p style="font-size:0.72rem;color:var(--text-muted);">To: ${sel.toName || sel.to} · ${sel.date} ${sel.time}</p>
        </div>
      </div>
    </div>
    <div style="padding:20px;font-size:0.9rem;line-height:1.8;white-space:pre-wrap;">${sel.body}</div>
    <div style="padding:12px 20px;border-top:1px solid var(--border-glass);display:flex;gap:8px;">
      <button class="btn btn-sm btn-secondary" onclick="replyMail('${sel.id}')"><i class="fa-solid fa-reply"></i> Reply</button>
      <button class="btn btn-sm btn-secondary" onclick="forwardMail('${sel.id}')"><i class="fa-solid fa-share"></i> Forward</button>
      <button class="btn btn-sm btn-danger" onclick="deleteMail('${sel.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
      <button class="btn btn-sm btn-secondary" onclick="toggleStar('${sel.id}')"><i class="fa-${sel.starred ? 'solid' : 'regular'} fa-star" style="color:${sel.starred ? 'var(--gold)' : ''}"></i></button>
    </div>
  ` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);"><div style="text-align:center;"><i class="fa-regular fa-envelope-open" style="font-size:3rem;color:#dde1e9;display:block;margin-bottom:12px;"></i><p>Select a message to read</p></div></div>';

  document.getElementById('mailApp').innerHTML = `
    <div style="display:flex;height:calc(100vh - 80px);border-radius:12px;overflow:hidden;background:var(--bg-card);border:1px solid var(--border-glass);box-shadow:var(--shadow);">
      <!-- Mail Sidebar -->
      <div style="width:200px;background:#f8f9fc;border-right:1px solid var(--border-glass);flex-shrink:0;">
        <div style="padding:16px;">
          <button class="btn btn-gold btn-sm w-full" onclick="composeMail()"><i class="fa-solid fa-pen"></i> Compose</button>
        </div>
        <div style="padding:0 8px;">
          <div class="mail-folder ${mailFolder==='inbox'?'active':''}" onclick="mailFolder='inbox';selectedMailId=null;renderMail();">
            <i class="fa-solid fa-inbox"></i> Inbox ${inboxCount > 0 ? `<span style="margin-left:auto;background:var(--accent);color:#fff;font-size:0.6rem;padding:1px 7px;border-radius:10px;">${inboxCount}</span>` : ''}
          </div>
          <div class="mail-folder ${mailFolder==='sent'?'active':''}" onclick="mailFolder='sent';selectedMailId=null;renderMail();">
            <i class="fa-solid fa-paper-plane"></i> Sent <span style="margin-left:auto;font-size:0.7rem;color:var(--text-muted);">${sentCount}</span>
          </div>
          <div class="mail-folder ${mailFolder==='starred'?'active':''}" onclick="mailFolder='starred';selectedMailId=null;renderMail();">
            <i class="fa-solid fa-star"></i> Starred
          </div>
          <div class="mail-folder ${mailFolder==='trash'?'active':''}" onclick="mailFolder='trash';selectedMailId=null;renderMail();">
            <i class="fa-solid fa-trash"></i> Trash
          </div>
        </div>
        ${isAdmin ? `<div style="border-top:1px solid var(--border-glass);margin-top:16px;padding:12px 8px;">
          <div class="mail-folder" onclick="manageMailAccounts()"><i class="fa-solid fa-user-gear"></i> Accounts</div>
        </div>` : ''}
        <div style="padding:12px 16px;border-top:1px solid var(--border-glass);margin-top:auto;">
          <p style="font-size:0.68rem;color:var(--text-muted);">Signed in as</p>
          <p style="font-size:0.78rem;font-weight:600;color:var(--accent);">${myMail}</p>
        </div>
      </div>
      <!-- Mail List -->
      <div style="width:340px;border-right:1px solid var(--border-glass);overflow-y:auto;flex-shrink:0;">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border-glass);font-size:0.85rem;font-weight:600;color:var(--text-primary);text-transform:capitalize;">
          <i class="fa-solid fa-${mailFolder==='inbox'?'inbox':mailFolder==='sent'?'paper-plane':mailFolder==='starred'?'star':'trash'}"></i> ${mailFolder}
        </div>
        ${mailList}
      </div>
      <!-- Mail Preview -->
      <div style="flex:1;overflow-y:auto;">${previewHTML}</div>
    </div>`;
}

function openMail(id) {
  const mails = getData('etg_mails') || [];
  const mail = mails.find(m => m.id === id);
  if (mail && !mail.read) { mail.read = true; setData('etg_mails', mails); }
  selectedMailId = id;
  renderMail();
}

function composeMail(replyTo, fwdMail) {
  const accounts = getData('etg_mail_accounts') || [];
  const myAccount = accounts.find(a => a.username === currentUser.username);
  const myMail = myAccount ? myAccount.email : currentUser.username + '@etggroups.com';

  const toOptions = accounts.map(a => `<option value="${a.email}">${a.fullName} (${a.email})</option>`).join('');

  const defaultTo = replyTo || '';
  const defaultSubject = fwdMail ? 'Fwd: ' + fwdMail.subject : '';
  const defaultBody = fwdMail ? '\n\n--- Forwarded Message ---\n' + fwdMail.body : '';

  openModal('<i class="fa-solid fa-pen-to-square"></i> New Message', `
    <div class="form-group-app"><label>From</label><input type="text" value="${myMail}" disabled style="opacity:0.6;"></div>
    <div class="form-group-app"><label>To *</label>
      <select id="mailTo" style="margin-bottom:8px;"><option value="">— Select recipient —</option>${toOptions}</select>
      <input type="email" id="mailToCustom" placeholder="Or type email" value="${defaultTo}">
    </div>
    <div class="form-group-app"><label>Subject *</label><input type="text" id="mailSubject" placeholder="Enter subject" value="${defaultSubject}"></div>
    <div class="form-group-app"><label>Message *</label><textarea id="mailBody" rows="8" placeholder="Type your message..." style="resize:vertical;font-family:inherit;line-height:1.6;">${defaultBody}</textarea></div>
    <button class="btn btn-gold w-full mt-16" onclick="sendMail()"><i class="fa-solid fa-paper-plane"></i> Send</button>
  `);

  // Sync select to input
  setTimeout(() => {
    const sel = document.getElementById('mailTo');
    if (sel) sel.addEventListener('change', () => { document.getElementById('mailToCustom').value = sel.value; });
  }, 100);
}

function sendMail() {
  const accounts = getData('etg_mail_accounts') || [];
  const myAccount = accounts.find(a => a.username === currentUser.username);
  const from = myAccount ? myAccount.email : currentUser.username + '@etggroups.com';
  const to = document.getElementById('mailToCustom').value.trim() || document.getElementById('mailTo').value;
  const subject = document.getElementById('mailSubject').value.trim();
  const body = document.getElementById('mailBody').value.trim();

  if (!to || !subject || !body) { showToast('Please fill To, Subject and Message', 'error'); return; }

  const toAccount = accounts.find(a => a.email === to);
  const mails = getData('etg_mails') || [];
  mails.push({
    id: 'MAIL-' + Date.now(),
    from, fromName: currentUser.fullName,
    to, toName: toAccount ? toAccount.fullName : to,
    subject, body,
    date: new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short' }),
    time: new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }),
    timestamp: Date.now(),
    read: false, starred: false, deleted: false
  });
  setData('etg_mails', mails);

  // Notify recipient
  if (toAccount) {
    addNotification(`📧 New mail from <strong>${currentUser.fullName}</strong>: ${subject}`, null, 'fa-envelope', toAccount.username);
  }

  closeModal(); renderMail();
  showToast('Message sent!', 'success');
}

function replyMail(id) {
  const mail = (getData('etg_mails') || []).find(m => m.id === id);
  if (!mail) return;
  composeMail(mail.from);
  setTimeout(() => {
    document.getElementById('mailSubject').value = 'Re: ' + mail.subject;
    document.getElementById('mailBody').value = '\n\n--- Original Message ---\nFrom: ' + mail.fromName + '\n' + mail.body;
  }, 200);
}

function forwardMail(id) {
  const mail = (getData('etg_mails') || []).find(m => m.id === id);
  if (!mail) return;
  composeMail('', mail);
}

function deleteMail(id) {
  const mails = getData('etg_mails') || [];
  const mail = mails.find(m => m.id === id);
  if (mail) {
    if (mail.deleted) { // Permanent delete from trash
      const idx = mails.indexOf(mail);
      mails.splice(idx, 1);
    } else {
      mail.deleted = true;
    }
    setData('etg_mails', mails);
    selectedMailId = null; renderMail();
    showToast(mail.deleted === undefined ? 'Permanently deleted' : 'Moved to trash', 'info');
  }
}

function toggleStar(id) {
  const mails = getData('etg_mails') || [];
  const mail = mails.find(m => m.id === id);
  if (mail) { mail.starred = !mail.starred; setData('etg_mails', mails); renderMail(); }
}

// ===== MAIL ACCOUNT MANAGEMENT (Admin/HR only) =====
function manageMailAccounts() {
  if (currentUser.role !== 'admin' && currentUser.role !== 'hr') {
    showToast('Only Admin or HR can manage mail accounts', 'error'); return;
  }
  const accounts = getData('etg_mail_accounts') || [];
  const rows = accounts.map(a => `<tr>
    <td>${a.fullName}</td><td>${a.email}</td><td>${a.username}</td>
    <td><button class="btn btn-sm btn-danger" onclick="deleteMailAccount('${a.email}')"><i class="fa-solid fa-trash"></i></button></td>
  </tr>`).join('');

  openModal('<i class="fa-solid fa-user-gear"></i> Mail Accounts', `
    <div class="table-container" style="margin-bottom:16px;"><table>
      <thead><tr><th>Name</th><th>Email</th><th>User</th><th>Actions</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No accounts yet</td></tr>'}</tbody>
    </table></div>
    <h4 style="font-size:0.85rem;margin-bottom:12px;color:var(--accent);"><i class="fa-solid fa-plus"></i> Create Mail Account</h4>
    <div class="form-group-app"><label>Select Employee</label>
      <select id="mailAccEmp" onchange="fillMailAccount()">
        <option value="">— Select employee —</option>
        ${(getData('etg_users') || []).filter(u => !accounts.find(a => a.username === u.username)).map(u => `<option value="${u.username}||${u.fullName}">${u.fullName} (${u.username})</option>`).join('')}
      </select>
    </div>
    <div class="form-grid">
      <div class="form-group-app"><label>Full Name</label><input type="text" id="mailAccName" placeholder="Name"></div>
      <div class="form-group-app"><label>Email</label><input type="email" id="mailAccEmail" placeholder="name@etggroups.com"></div>
    </div>
    <button class="btn btn-gold w-full mt-16" onclick="createMailAccount()"><i class="fa-solid fa-plus"></i> Create Account</button>
  `);
}

function fillMailAccount() {
  const val = document.getElementById('mailAccEmp').value;
  if (val) {
    const [username, fullName] = val.split('||');
    document.getElementById('mailAccName').value = fullName;
    document.getElementById('mailAccEmail').value = username + '@etggroups.com';
  }
}

function createMailAccount() {
  const empVal = document.getElementById('mailAccEmp').value;
  const fullName = document.getElementById('mailAccName').value.trim();
  const email = document.getElementById('mailAccEmail').value.trim();
  if (!fullName || !email) { showToast('Name and Email are required', 'error'); return; }
  const username = empVal ? empVal.split('||')[0] : '';

  const accounts = getData('etg_mail_accounts') || [];
  if (accounts.find(a => a.email === email)) { showToast('Email already exists', 'error'); return; }
  accounts.push({ username, fullName, email, createdDate: new Date().toISOString().split('T')[0] });
  setData('etg_mail_accounts', accounts);
  showToast('Mail account created!', 'success');
  manageMailAccounts();
}

function deleteMailAccount(email) {
  if (!confirm('Delete this mail account?')) return;
  let accounts = getData('etg_mail_accounts') || [];
  accounts = accounts.filter(a => a.email !== email);
  setData('etg_mail_accounts', accounts);
  showToast('Account deleted', 'success');
  manageMailAccounts();
}
