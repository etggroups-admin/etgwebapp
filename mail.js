/* =============================================
   ETG GROUPS — Employee Profile Module
   ============================================= */

function renderEmpProfile() {
  const profiles = getData('etg_empprofiles') || [];
  const isAdmin = currentUser && currentUser.role === 'admin';
  const displayProfiles = isAdmin ? profiles : profiles.filter(p => p.createdBy === currentUser.username);

  let cardsHTML = '';
  if (displayProfiles.length > 0) {
    cardsHTML = displayProfiles.map(p => {
      const initials = p.name ? p.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';
      const photo = p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : `<span style="font-size:1.5rem;font-weight:700;color:#fff;">${initials}</span>`;
      return `
      <div style="background:var(--bg-card);border:1px solid var(--border-glass);border-radius:16px;padding:24px;box-shadow:var(--shadow);transition:all 0.3s;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform=''">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
          <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--gold));display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">${photo}</div>
          <div style="flex:1;">
            <h3 style="font-size:1.05rem;margin-bottom:2px;">${p.name}</h3>
            <p style="font-size:0.78rem;color:var(--text-muted);">${p.empId || 'N/A'} · ${p.sex || ''}</p>
          </div>
          <span class="badge ${p.maritalStatus === 'Married' ? 'badge-success' : 'badge-info'}" style="font-size:0.68rem;">${p.maritalStatus || 'N/A'}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.8rem;color:var(--text-secondary);">
          <p><i class="fa-solid fa-phone" style="width:16px;color:var(--accent);"></i> ${p.contact || 'N/A'}</p>
          <p><i class="fa-solid fa-envelope" style="width:16px;color:var(--accent);"></i> ${p.email || 'N/A'}</p>
          <p><i class="fa-solid fa-cake-candles" style="width:16px;color:var(--accent);"></i> ${p.dob || 'N/A'}</p>
          <p><i class="fa-solid fa-graduation-cap" style="width:16px;color:var(--accent);"></i> ${p.education || 'N/A'}</p>
        </div>
        <div style="display:flex;gap:8px;margin-top:16px;border-top:1px solid var(--border-glass);padding-top:12px;">
          <button class="btn btn-sm btn-secondary" onclick="viewEmpProfile('${p.id}')"><i class="fa-solid fa-eye"></i> View</button>
          <button class="btn btn-sm btn-secondary" onclick="openEditEmpProfile('${p.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
          ${isAdmin ? `<button class="btn btn-sm btn-danger" onclick="deleteEmpProfile('${p.id}')"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
      </div>`;
    }).join('');
  } else {
    cardsHTML = '<div class="no-data" style="grid-column:1/-1;"><i class="fa-solid fa-id-card"></i><p>No employee profiles found</p></div>';
  }

  document.getElementById('empProfileContent').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-id-card"></i></div><div class="stat-info"><h4>${displayProfiles.length}</h4><p>Total Profiles</p></div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-mars"></i></div><div class="stat-info"><h4>${displayProfiles.filter(p=>p.sex==='Male').length}</h4><p>Male</p></div></div>
      <div class="stat-card"><div class="stat-icon red"><i class="fa-solid fa-venus"></i></div><div class="stat-info"><h4>${displayProfiles.filter(p=>p.sex==='Female').length}</h4><p>Female</p></div></div>
      <div class="stat-card"><div class="stat-icon gold"><i class="fa-solid fa-ring"></i></div><div class="stat-info"><h4>${displayProfiles.filter(p=>p.maritalStatus==='Married').length}</h4><p>Married</p></div></div>
    </div>
    <div class="card mb-24">
      <div class="card-header">
        <h3><i class="fa-solid fa-id-card"></i> Employee Profiles</h3>
        <button class="btn btn-gold btn-sm" onclick="openCreateEmpProfile()"><i class="fa-solid fa-plus"></i> Add Profile</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:20px;margin-top:8px;">${cardsHTML}</div>
    </div>`;
}

function getProfileFormHTML(p) {
  p = p || {};
  const prefix = p.id ? 'edit' : 'new';
  return `
    <div style="text-align:center;margin-bottom:20px;">
      <div id="${prefix}PhotoPreview" style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--gold));margin:0 auto 12px;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;" onclick="document.getElementById('${prefix}PhotoInput').click()">
        ${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fa-solid fa-camera" style="font-size:1.5rem;color:#fff;"></i>'}
      </div>
      <input type="file" id="${prefix}PhotoInput" accept="image/*" style="display:none;" onchange="previewEmpPhoto(this,'${prefix}')">
      <p style="font-size:0.72rem;color:var(--text-muted);">Click to upload photo</p>
    </div>
    <h4 style="font-size:0.85rem;color:var(--accent);margin-bottom:12px;border-bottom:1px solid var(--border-glass);padding-bottom:8px;"><i class="fa-solid fa-user"></i> Personal Details</h4>
    <div class="form-grid">
      <div class="form-group-app"><label>Full Name *</label><input type="text" id="${prefix}EpName" value="${p.name||''}" placeholder="Enter full name"></div>
      <div class="form-group-app"><label>Employee ID *</label><input type="text" id="${prefix}EpEmpId" value="${p.empId||''}" placeholder="e.g. ETG-001"></div>
      <div class="form-group-app"><label>Date of Birth *</label><input type="date" id="${prefix}EpDob" value="${p.dob||''}"></div>
      <div class="form-group-app"><label>Age</label><input type="number" id="${prefix}EpAge" value="${p.age||''}" placeholder="Age"></div>
      <div class="form-group-app"><label>Sex *</label><select id="${prefix}EpSex">
        <option value="">Select</option>
        <option value="Male" ${p.sex==='Male'?'selected':''}>Male</option>
        <option value="Female" ${p.sex==='Female'?'selected':''}>Female</option>
      </select></div>
      <div class="form-group-app"><label>Marital Status</label><select id="${prefix}EpMarital">
        <option value="">Select</option>
        <option value="Single" ${p.maritalStatus==='Single'?'selected':''}>Single</option>
        <option value="Married" ${p.maritalStatus==='Married'?'selected':''}>Married</option>
      </select></div>
    </div>
    <h4 style="font-size:0.85rem;color:var(--accent);margin:20px 0 12px;border-bottom:1px solid var(--border-glass);padding-bottom:8px;"><i class="fa-solid fa-phone"></i> Contact Details</h4>
    <div class="form-grid">
      <div class="form-group-app"><label>Contact Number *</label><input type="tel" id="${prefix}EpContact" value="${p.contact||''}" placeholder="+91 XXXXXXXXXX"></div>
      <div class="form-group-app"><label>Alternate Contact</label><input type="tel" id="${prefix}EpAltContact" value="${p.altContact||''}" placeholder="+91 XXXXXXXXXX"></div>
      <div class="form-group-app"><label>Email ID</label><input type="email" id="${prefix}EpEmail" value="${p.email||''}" placeholder="email@example.com"></div>
    </div>
    <div class="form-group-app mt-16"><label>Address</label><textarea id="${prefix}EpAddress" rows="2" placeholder="Full address" style="resize:vertical;">${p.address||''}</textarea></div>
    <h4 style="font-size:0.85rem;color:var(--accent);margin:20px 0 12px;border-bottom:1px solid var(--border-glass);padding-bottom:8px;"><i class="fa-solid fa-people-roof"></i> Family Details</h4>
    <div class="form-grid">
      <div class="form-group-app"><label>Father's Name</label><input type="text" id="${prefix}EpFather" value="${p.fatherName||''}" placeholder="Father's name"></div>
      <div class="form-group-app"><label>Mother's Name</label><input type="text" id="${prefix}EpMother" value="${p.motherName||''}" placeholder="Mother's name"></div>
    </div>
    <h4 style="font-size:0.85rem;color:var(--accent);margin:20px 0 12px;border-bottom:1px solid var(--border-glass);padding-bottom:8px;"><i class="fa-solid fa-graduation-cap"></i> Education & Experience</h4>
    <div class="form-grid">
      <div class="form-group-app"><label>Education</label><select id="${prefix}EpEducation">
        <option value="">Select</option>
        <option value="SSLC" ${p.education==='SSLC'?'selected':''}>SSLC</option>
        <option value="HSC" ${p.education==='HSC'?'selected':''}>HSC</option>
        <option value="Diploma" ${p.education==='Diploma'?'selected':''}>Diploma</option>
        <option value="Degree" ${p.education==='Degree'?'selected':''}>Degree</option>
        <option value="Master" ${p.education==='Master'?'selected':''}>Master</option>
        <option value="PhD" ${p.education==='PhD'?'selected':''}>PhD</option>
      </select></div>
      <div class="form-group-app"><label>Experience (Years)</label><input type="text" id="${prefix}EpExperience" value="${p.experience||''}" placeholder="e.g. 3 Years"></div>
    </div>`;
}

function previewEmpPhoto(input, prefix) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById(prefix + 'PhotoPreview');
    preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
    preview.dataset.photo = e.target.result;
  };
  reader.readAsDataURL(file);
}

function openCreateEmpProfile() {
  openModal('<i class="fa-solid fa-id-card"></i> Create Employee Profile', `
    ${getProfileFormHTML()}
    <button class="btn btn-gold w-full mt-16" onclick="saveNewEmpProfile()"><i class="fa-solid fa-save"></i> Save Profile</button>
  `);
  // Auto-calc age from DOB
  setTimeout(() => {
    const dobEl = document.getElementById('newEpDob');
    if (dobEl) dobEl.addEventListener('change', () => calcAge('new'));
  }, 100);
}

function calcAge(prefix) {
  const dob = document.getElementById(prefix + 'EpDob').value;
  if (dob) {
    const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    document.getElementById(prefix + 'EpAge').value = age;
  }
}

function collectProfileData(prefix) {
  const photoPreview = document.getElementById(prefix + 'PhotoPreview');
  return {
    name: document.getElementById(prefix + 'EpName').value.trim(),
    empId: document.getElementById(prefix + 'EpEmpId').value.trim(),
    dob: document.getElementById(prefix + 'EpDob').value,
    age: document.getElementById(prefix + 'EpAge').value,
    sex: document.getElementById(prefix + 'EpSex').value,
    maritalStatus: document.getElementById(prefix + 'EpMarital').value,
    contact: document.getElementById(prefix + 'EpContact').value.trim(),
    altContact: document.getElementById(prefix + 'EpAltContact').value.trim(),
    email: document.getElementById(prefix + 'EpEmail').value.trim(),
    address: document.getElementById(prefix + 'EpAddress').value.trim(),
    fatherName: document.getElementById(prefix + 'EpFather').value.trim(),
    motherName: document.getElementById(prefix + 'EpMother').value.trim(),
    education: document.getElementById(prefix + 'EpEducation').value,
    experience: document.getElementById(prefix + 'EpExperience').value.trim(),
    photo: photoPreview.dataset.photo || (photoPreview.querySelector('img') ? photoPreview.querySelector('img').src : null)
  };
}

function saveNewEmpProfile() {
  const data = collectProfileData('new');
  if (!data.name || !data.empId || !data.dob || !data.sex || !data.contact) {
    showToast('Please fill all required fields (*)', 'error'); return;
  }
  const profiles = getData('etg_empprofiles') || [];
  profiles.push({
    ...data,
    id: 'EMP-' + Date.now(),
    createdBy: currentUser.username,
    createdDate: new Date().toISOString().split('T')[0]
  });
  setData('etg_empprofiles', profiles);
  closeModal(); renderEmpProfile();
  showToast('Employee profile created!', 'success');
}

function openEditEmpProfile(id) {
  const profiles = getData('etg_empprofiles') || [];
  const p = profiles.find(x => x.id === id);
  if (!p) return;
  openModal('<i class="fa-solid fa-user-pen"></i> Edit Profile — ' + p.name, `
    ${getProfileFormHTML(p)}
    <button class="btn btn-gold w-full mt-16" onclick="saveEditEmpProfile('${id}')"><i class="fa-solid fa-save"></i> Save Changes</button>
  `);
  setTimeout(() => {
    const dobEl = document.getElementById('editEpDob');
    if (dobEl) dobEl.addEventListener('change', () => calcAge('edit'));
    // Restore photo in dataset
    if (p.photo) document.getElementById('editPhotoPreview').dataset.photo = p.photo;
  }, 100);
}

function saveEditEmpProfile(id) {
  const data = collectProfileData('edit');
  if (!data.name || !data.empId || !data.dob || !data.sex || !data.contact) {
    showToast('Please fill all required fields (*)', 'error'); return;
  }
  const profiles = getData('etg_empprofiles') || [];
  const idx = profiles.findIndex(x => x.id === id);
  if (idx === -1) return;
  profiles[idx] = { ...profiles[idx], ...data };
  setData('etg_empprofiles', profiles);
  closeModal(); renderEmpProfile();
  showToast('Profile updated!', 'success');
}

function viewEmpProfile(id) {
  const p = (getData('etg_empprofiles') || []).find(x => x.id === id);
  if (!p) return;
  const initials = p.name ? p.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';
  const photo = p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : `<span style="font-size:2rem;font-weight:700;color:#fff;">${initials}</span>`;

  openModal('<i class="fa-solid fa-id-card"></i> ' + p.name, `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--gold));margin:0 auto 12px;display:flex;align-items:center;justify-content:center;overflow:hidden;">${photo}</div>
      <h2 style="font-size:1.2rem;">${p.name}</h2>
      <p style="font-size:0.82rem;color:var(--text-muted);">${p.empId} · ${p.sex} · ${p.age ? p.age + ' yrs' : ''}</p>
    </div>

    <h4 style="font-size:0.8rem;color:var(--accent);margin-bottom:10px;border-bottom:1px solid var(--border-glass);padding-bottom:6px;"><i class="fa-solid fa-user"></i> Personal</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
      <div><p style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;">Date of Birth</p><p style="font-weight:600;font-size:0.88rem;">${p.dob || 'N/A'}</p></div>
      <div><p style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;">Sex</p><p style="font-weight:600;font-size:0.88rem;">${p.sex || 'N/A'}</p></div>
      <div><p style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;">Marital Status</p><p style="font-weight:600;font-size:0.88rem;">${p.maritalStatus || 'N/A'}</p></div>
      <div><p style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;">Age</p><p style="font-weight:600;font-size:0.88rem;">${p.age ? p.age + ' years' : 'N/A'}</p></div>
    </div>

    <h4 style="font-size:0.8rem;color:var(--accent);margin-bottom:10px;border-bottom:1px solid var(--border-glass);padding-bottom:6px;"><i class="fa-solid fa-phone"></i> Contact</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
      <div><p style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;">Phone</p><p style="font-weight:600;font-size:0.88rem;">${p.contact || 'N/A'}</p></div>
      <div><p style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;">Alt Phone</p><p style="font-weight:600;font-size:0.88rem;">${p.altContact || 'N/A'}</p></div>
      <div><p style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;">Email</p><p style="font-weight:600;font-size:0.88rem;">${p.email || 'N/A'}</p></div>
    </div>
    <div style="margin-bottom:20px;"><p style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;">Address</p><p style="font-weight:600;font-size:0.88rem;">${p.address || 'N/A'}</p></div>

    <h4 style="font-size:0.8rem;color:var(--accent);margin-bottom:10px;border-bottom:1px solid var(--border-glass);padding-bottom:6px;"><i class="fa-solid fa-people-roof"></i> Family</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
      <div><p style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;">Father's Name</p><p style="font-weight:600;font-size:0.88rem;">${p.fatherName || 'N/A'}</p></div>
      <div><p style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;">Mother's Name</p><p style="font-weight:600;font-size:0.88rem;">${p.motherName || 'N/A'}</p></div>
    </div>

    <h4 style="font-size:0.8rem;color:var(--accent);margin-bottom:10px;border-bottom:1px solid var(--border-glass);padding-bottom:6px;"><i class="fa-solid fa-graduation-cap"></i> Education & Experience</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div><p style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;">Education</p><p style="font-weight:600;font-size:0.88rem;">${p.education || 'N/A'}</p></div>
      <div><p style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;">Experience</p><p style="font-weight:600;font-size:0.88rem;">${p.experience || 'N/A'}</p></div>
    </div>
  `);
}

function deleteEmpProfile(id) {
  if (!currentUser || currentUser.role !== 'admin') { showToast('Admin access required', 'error'); return; }
  if (!confirm('Delete this employee profile?')) return;
  let profiles = getData('etg_empprofiles') || [];
  profiles = profiles.filter(p => p.id !== id);
  setData('etg_empprofiles', profiles);
  renderEmpProfile();
  showToast('Profile deleted', 'success');
}
