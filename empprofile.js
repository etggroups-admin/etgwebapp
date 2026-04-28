/* =============================================
   ETG GROUPS — Call Management Module
   ============================================= */

let callRecorder = null;
let callAudioChunks = [];
let callRecordingStream = null;
let callTimer = null;
let callSeconds = 0;
let activeCallId = null;

function renderCalls() {
  const calls = getData('etg_calls') || [];
  const isAdmin = currentUser && currentUser.role === 'admin';
  const displayCalls = isAdmin ? calls : calls.filter(c => c.calledBy === currentUser.username);

  // Stats
  const totalCalls = displayCalls.length;
  const outgoing = displayCalls.filter(c => c.type === 'Outgoing').length;
  const incoming = displayCalls.filter(c => c.type === 'Incoming').length;
  const totalDuration = displayCalls.reduce((s, c) => s + (c.durationSec || 0), 0);
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

  // Call history table
  let tableHTML = '';
  if (displayCalls.length > 0) {
    const rows = [...displayCalls].reverse().map(c => {
      const typeIcon = c.type === 'Outgoing' ? 'fa-phone-arrow-up-right' : 'fa-phone-arrow-down-left';
      const typeColor = c.type === 'Outgoing' ? 'var(--info)' : 'var(--success)';
      const statusBadge = c.status === 'Connected' ? 'badge-success' :
                          c.status === 'Missed' ? 'badge-danger' :
                          c.status === 'No Answer' ? 'badge-warning' : 'badge-info';
      return `<tr>
        <td><i class="fa-solid ${typeIcon}" style="color:${typeColor};margin-right:6px;"></i> ${c.type}</td>
        <td><strong>${c.clientName}</strong></td>
        <td><a href="tel:${c.phone}" style="color:var(--accent);">${c.phone}</a></td>
        <td>${c.calledBy}</td>
        <td>${formatCallDuration(c.durationSec || 0)}</td>
        <td><span class="badge ${statusBadge}">${c.status}</span></td>
        <td>${c.date} ${c.time}</td>
        <td>
          <button class="btn-icon" onclick="viewCallDetails('${c.id}')" title="View"><i class="fa-solid fa-eye"></i></button>
          ${c.recording ? `<button class="btn-icon" onclick="playRecording('${c.id}')" title="Play Recording"><i class="fa-solid fa-play" style="color:var(--success);"></i></button>` : ''}
          ${isAdmin ? `<button class="btn-icon" onclick="deleteCall('${c.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>` : ''}
        </td>
      </tr>`;
    }).join('');
    tableHTML = `<div class="table-container"><table>
      <thead><tr><th>Type</th><th>Client</th><th>Phone</th><th>Called By</th><th>Duration</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  } else {
    tableHTML = '<div class="no-data"><i class="fa-solid fa-phone-slash"></i><p>No call records found</p></div>';
  }

  document.getElementById('callsContent').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue"><i class="fa-solid fa-phone"></i></div>
        <div class="stat-info"><h4>${totalCalls}</h4><p>Total Calls</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><i class="fa-solid fa-phone-arrow-up-right"></i></div>
        <div class="stat-info"><h4>${outgoing}</h4><p>Outgoing</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon gold"><i class="fa-solid fa-phone-arrow-down-left"></i></div>
        <div class="stat-info"><h4>${incoming}</h4><p>Incoming</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red"><i class="fa-solid fa-clock"></i></div>
        <div class="stat-info"><h4>${formatCallDuration(totalDuration)}</h4><p>Total Duration</p></div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card mb-24">
      <div class="card-header">
        <h3><i class="fa-solid fa-phone-volume"></i> Quick Actions</h3>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-gold btn-sm" onclick="openNewCallModal('Outgoing')"><i class="fa-solid fa-phone-arrow-up-right"></i> Make Call</button>
          <button class="btn btn-success btn-sm" onclick="openNewCallModal('Incoming')"><i class="fa-solid fa-phone-arrow-down-left"></i> Log Incoming</button>
        </div>
      </div>
      <!-- Active Call Panel -->
      <div id="activeCallPanel" style="display:none;">
        <div style="background:linear-gradient(135deg,rgba(233,69,96,0.08),rgba(233,69,96,0.02));padding:24px;border-radius:12px;border:1px solid rgba(233,69,96,0.15);text-align:center;">
          <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px;">
            <div style="width:60px;height:60px;border-radius:50%;background:rgba(233,69,96,0.1);display:flex;align-items:center;justify-content:center;animation:pulse 1.5s infinite;">
              <i class="fa-solid fa-phone" style="font-size:1.5rem;color:var(--accent);"></i>
            </div>
            <div style="text-align:left;">
              <h3 id="activeCallName" style="font-size:1.1rem;">Client Name</h3>
              <p id="activeCallPhone" style="color:var(--text-muted);font-size:0.85rem;">+91 XXXXXXXXXX</p>
            </div>
          </div>
          <div id="callTimerDisplay" style="font-size:2rem;font-weight:700;color:var(--accent);font-family:'Outfit',sans-serif;margin:12px 0;">00:00</div>
          <div id="recordingIndicator" style="display:none;margin:8px 0;">
            <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 14px;border-radius:20px;background:rgba(233,69,96,0.1);color:var(--danger);font-size:0.78rem;font-weight:600;">
              <span style="width:8px;height:8px;border-radius:50%;background:var(--danger);animation:pulse 1s infinite;"></span> Recording
            </span>
          </div>
          <div style="display:flex;gap:12px;justify-content:center;margin-top:16px;">
            <button class="btn btn-danger btn-sm" onclick="endActiveCall()"><i class="fa-solid fa-phone-slash"></i> End Call</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Call History -->
    <div class="card">
      <div class="card-header">
        <h3><i class="fa-solid fa-clock-rotate-left"></i> Call History</h3>
      </div>
      ${tableHTML}
    </div>`;
}

function openNewCallModal(type) {
  const customers = getData('etg_customers') || [];
  const custOptions = customers.map(c => `<option value="${c.name}||${c.phone}">${c.name} — ${c.phone}</option>`).join('');

  openModal(`<i class="fa-solid fa-phone"></i> ${type === 'Outgoing' ? 'Make a Call' : 'Log Incoming Call'}`, `
    <div class="form-group-app">
      <label>Select Client or Enter Manually</label>
      <select id="callCustSelect" onchange="fillCallClient()">
        <option value="">— Select from customers —</option>
        ${custOptions}
        <option value="manual">✏️ Enter Manually</option>
      </select>
    </div>
    <div class="form-grid">
      <div class="form-group-app"><label>Client Name *</label><input type="text" id="callClientName" placeholder="Enter client name"></div>
      <div class="form-group-app"><label>Phone Number *</label><input type="tel" id="callPhone" placeholder="+91 XXXXXXXXXX"></div>
    </div>
    <div class="form-group-app"><label>Subject / Purpose</label><input type="text" id="callSubject" placeholder="Purpose of call"></div>
    <div class="form-group-app"><label>Notes</label><textarea id="callNotes" rows="3" placeholder="Call notes..." style="resize:vertical;"></textarea></div>
    <div style="display:flex;gap:12px;margin-top:16px;">
      ${type === 'Outgoing' ? `<button class="btn btn-gold w-full" onclick="startCall('Outgoing')"><i class="fa-solid fa-phone"></i> Start Call & Record</button>` :
      `<button class="btn btn-success w-full" onclick="logCall('Incoming')"><i class="fa-solid fa-phone-arrow-down-left"></i> Log Call</button>`}
    </div>
  `);
}

function fillCallClient() {
  const val = document.getElementById('callCustSelect').value;
  if (val && val !== 'manual') {
    const [name, phone] = val.split('||');
    document.getElementById('callClientName').value = name;
    document.getElementById('callPhone').value = phone;
  } else {
    document.getElementById('callClientName').value = '';
    document.getElementById('callPhone').value = '';
  }
}

function startCall(type) {
  const clientName = document.getElementById('callClientName').value.trim();
  const phone = document.getElementById('callPhone').value.trim();
  const subject = document.getElementById('callSubject').value.trim();
  const notes = document.getElementById('callNotes').value.trim();

  if (!clientName || !phone) { showToast('Client name and phone are required', 'error'); return; }

  activeCallId = 'CALL-' + Date.now();
  closeModal();

  // Show active call panel
  document.getElementById('activeCallPanel').style.display = 'block';
  document.getElementById('activeCallName').textContent = clientName;
  document.getElementById('activeCallPhone').textContent = phone;

  // Open phone dialer
  window.open(`tel:${phone}`, '_self');

  // Start timer
  callSeconds = 0;
  updateTimerDisplay();
  callTimer = setInterval(() => {
    callSeconds++;
    updateTimerDisplay();
  }, 1000);

  // Start audio recording
  startAudioRecording();

  // Store temp call data
  setData('etg_active_call', { id: activeCallId, clientName, phone, subject, notes, type, startTime: Date.now() });
  showToast(`Call started with ${clientName}`, 'success');
}

async function startAudioRecording() {
  try {
    callRecordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    callRecorder = new MediaRecorder(callRecordingStream);
    callAudioChunks = [];

    callRecorder.ondataavailable = (e) => { if (e.data.size > 0) callAudioChunks.push(e.data); };
    callRecorder.start();
    document.getElementById('recordingIndicator').style.display = 'block';
  } catch (err) {
    console.warn('Microphone access denied:', err);
    showToast('Microphone access denied — call will not be recorded', 'info');
  }
}

function updateTimerDisplay() {
  const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
  const secs = String(callSeconds % 60).padStart(2, '0');
  const display = document.getElementById('callTimerDisplay');
  if (display) display.textContent = `${mins}:${secs}`;
}

function endActiveCall() {
  // Stop timer
  if (callTimer) { clearInterval(callTimer); callTimer = null; }

  // Stop recording
  let recordingBlob = null;
  if (callRecorder && callRecorder.state === 'recording') {
    callRecorder.stop();
    callRecorder.onstop = () => {
      recordingBlob = new Blob(callAudioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        saveCallRecord(reader.result);
      };
      reader.readAsDataURL(recordingBlob);
    };
  } else {
    saveCallRecord(null);
  }

  // Stop microphone
  if (callRecordingStream) {
    callRecordingStream.getTracks().forEach(t => t.stop());
    callRecordingStream = null;
  }

  document.getElementById('activeCallPanel').style.display = 'none';
  document.getElementById('recordingIndicator').style.display = 'none';
}

function saveCallRecord(recordingDataUrl) {
  const activeCall = getData('etg_active_call');
  if (!activeCall) return;

  const calls = getData('etg_calls') || [];
  calls.push({
    id: activeCall.id,
    type: activeCall.type,
    clientName: activeCall.clientName,
    phone: activeCall.phone,
    subject: activeCall.subject || '',
    notes: activeCall.notes || '',
    calledBy: currentUser.username,
    callerName: currentUser.fullName,
    durationSec: callSeconds,
    status: callSeconds > 5 ? 'Connected' : 'No Answer',
    recording: recordingDataUrl || null,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  });
  setData('etg_calls', calls);
  localStorage.removeItem('etg_active_call');

  // Notify admin
  addNotification(`📞 <strong>${currentUser.fullName}</strong> made a call to <strong>${activeCall.clientName}</strong> (${formatCallDuration(callSeconds)})`, 'admin', 'fa-phone');

  callSeconds = 0;
  activeCallId = null;
  renderCalls();
  showToast('Call saved successfully!', 'success');
}

function logCall(type) {
  const clientName = document.getElementById('callClientName').value.trim();
  const phone = document.getElementById('callPhone').value.trim();
  const subject = document.getElementById('callSubject').value.trim();
  const notes = document.getElementById('callNotes').value.trim();

  if (!clientName || !phone) { showToast('Client name and phone are required', 'error'); return; }

  const calls = getData('etg_calls') || [];
  const callId = 'CALL-' + Date.now();
  calls.push({
    id: callId,
    type,
    clientName,
    phone,
    subject: subject || '',
    notes: notes || '',
    calledBy: currentUser.username,
    callerName: currentUser.fullName,
    durationSec: 0,
    status: 'Connected',
    recording: null,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  });
  setData('etg_calls', calls);

  // Notify admin
  addNotification(`📥 <strong>${currentUser.fullName}</strong> logged an incoming call from <strong>${clientName}</strong>`, 'admin', 'fa-phone-arrow-down-left');

  closeModal();
  renderCalls();
  showToast('Incoming call logged!', 'success');
}

function viewCallDetails(callId) {
  const call = (getData('etg_calls') || []).find(c => c.id === callId);
  if (!call) return;

  openModal(`<i class="fa-solid fa-phone"></i> Call Details — ${call.clientName}`, `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
      <div><p style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Client</p><p style="font-weight:600;">${call.clientName}</p></div>
      <div><p style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Phone</p><p style="font-weight:600;"><a href="tel:${call.phone}" style="color:var(--accent);">${call.phone}</a></p></div>
      <div><p style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Type</p><p style="font-weight:600;">${call.type}</p></div>
      <div><p style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Status</p><p style="font-weight:600;">${call.status}</p></div>
      <div><p style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Duration</p><p style="font-weight:600;">${formatCallDuration(call.durationSec)}</p></div>
      <div><p style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Called By</p><p style="font-weight:600;">${call.callerName || call.calledBy}</p></div>
      <div><p style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;">Date & Time</p><p style="font-weight:600;">${call.date} ${call.time}</p></div>
    </div>
    ${call.subject ? `<div style="background:var(--bg-glass);padding:14px;border-radius:8px;border:1px solid var(--border-glass);margin-bottom:12px;">
      <p style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Subject</p>
      <p style="font-size:0.9rem;">${call.subject}</p>
    </div>` : ''}
    ${call.notes ? `<div style="background:var(--bg-glass);padding:14px;border-radius:8px;border:1px solid var(--border-glass);margin-bottom:12px;">
      <p style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Notes</p>
      <p style="font-size:0.9rem;white-space:pre-wrap;">${call.notes}</p>
    </div>` : ''}
    ${call.recording ? `<div style="margin-top:16px;">
      <p style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;"><i class="fa-solid fa-microphone" style="color:var(--accent);"></i> Call Recording</p>
      <audio controls src="${call.recording}" style="width:100%;border-radius:8px;"></audio>
    </div>` : '<p style="font-size:0.8rem;color:var(--text-muted);margin-top:12px;"><i class="fa-solid fa-microphone-slash"></i> No recording available</p>'}
  `);
}

function playRecording(callId) {
  const call = (getData('etg_calls') || []).find(c => c.id === callId);
  if (!call || !call.recording) { showToast('No recording found', 'error'); return; }
  viewCallDetails(callId);
}

function deleteCall(callId) {
  if (!currentUser || currentUser.role !== 'admin') { showToast('Admin access required', 'error'); return; }
  if (!confirm('Delete this call record?')) return;
  let calls = getData('etg_calls') || [];
  calls = calls.filter(c => c.id !== callId);
  setData('etg_calls', calls);
  renderCalls();
  showToast('Call record deleted', 'success');
}

function formatCallDuration(seconds) {
  if (!seconds || seconds === 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${String(mins).padStart(2,'0')}m`;
  return `${mins}:${String(secs).padStart(2,'0')}`;
}
