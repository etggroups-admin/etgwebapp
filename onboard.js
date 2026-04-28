/* =============================================
   ETG TRAVELS — HRMS Module
   ============================================= */

let currentHrmsTab = 'employees';

function switchHrmsTab(tab) {
  currentHrmsTab = tab;
  document.querySelectorAll('#page-hrms .tab-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  renderHRMS();
}

function renderHRMS() {
  switch(currentHrmsTab) {
    case 'employees': renderEmployees(); break;
    case 'attendance': renderAttendance(); break;
    case 'leave': renderLeave(); break;
    case 'payroll': renderPayroll(); break;
  }
}

// ===== EMPLOYEES =====
function renderEmployees() {
  const employees = getData('etg_employees') || [];
  let rows = '';
  if (employees.length === 0) {
    rows = '<div class="no-data"><i class="fa-solid fa-user-slash"></i><p>No employees added yet</p></div>';
  } else {
    rows = `<div class="table-container"><table><thead><tr>
      <th>ID</th><th>Name</th><th>Department</th><th>Role</th><th>Phone</th><th>Email</th><th>Join Date</th><th>Salary</th><th>Actions</th>
    </tr></thead><tbody>${employees.map(e => `<tr>
      <td><span class="badge badge-gold">EMP-${e.empId}</span></td>
      <td>${e.name}</td><td>${e.department}</td><td>${e.role}</td>
      <td>${e.phone}</td><td>${e.email}</td><td>${e.joinDate}</td>
      <td>₹${parseFloat(e.salary||0).toLocaleString('en-IN')}</td>
      <td><button class="btn-icon" onclick="editEmployee(${e.empId})"><i class="fa-solid fa-pen"></i></button>
      <button class="btn-icon" onclick="deleteEmployee(${e.empId})" style="margin-left:4px;"><i class="fa-solid fa-trash"></i></button></td>
    </tr>`).join('')}</tbody></table></div>`;
  }
  document.getElementById('hrmsContent').innerHTML = `
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-id-badge"></i> Employee Directory</h3>
        <button class="btn btn-gold btn-sm" onclick="openAddEmployeeModal()"><i class="fa-solid fa-plus"></i> Add Employee</button>
      </div>${rows}
    </div>`;
}

function openAddEmployeeModal(emp) {
  const isEdit = !!emp;
  openModal(isEdit ? 'Edit Employee' : 'Add Employee', `
    <div class="form-grid">
      <div class="form-group-app"><label>Full Name</label><input type="text" id="empName" value="${emp?emp.name:''}"></div>
      <div class="form-group-app"><label>Department</label><select id="empDept">
        ${['Operations','Sales','Finance','Marketing','HR','IT','Support'].map(d => `<option ${emp&&emp.department===d?'selected':''}>${d}</option>`).join('')}
      </select></div>
      <div class="form-group-app"><label>Role / Designation</label><input type="text" id="empRole" value="${emp?emp.role:''}"></div>
      <div class="form-group-app"><label>Phone</label><input type="tel" id="empPhone" value="${emp?emp.phone:''}"></div>
      <div class="form-group-app"><label>Email</label><input type="email" id="empEmail" value="${emp?emp.email:''}"></div>
      <div class="form-group-app"><label>Date of Joining</label><input type="date" id="empJoin" value="${emp?emp.joinDate:new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group-app"><label>Monthly Salary (₹)</label><input type="number" id="empSalary" value="${emp?emp.salary:''}"></div>
      <div class="form-group-app"><label>Address</label><input type="text" id="empAddress" value="${emp?emp.address||'':''}"></div>
    </div>
    <button class="btn btn-gold w-full mt-16" onclick="${isEdit?`saveEditEmployee(${emp.empId})`:'saveEmployee()'}">
      <i class="fa-solid fa-save"></i> ${isEdit?'Update':'Save'} Employee
    </button>`);
}

function saveEmployee() {
  const name = document.getElementById('empName').value.trim();
  if (!name) { showToast('Name is required', 'error'); return; }
  const employees = getData('etg_employees');
  const empId = getNextId('employee');
  employees.push({
    empId, name, department: document.getElementById('empDept').value,
    role: document.getElementById('empRole').value.trim(),
    phone: document.getElementById('empPhone').value.trim(),
    email: document.getElementById('empEmail').value.trim(),
    joinDate: document.getElementById('empJoin').value,
    salary: document.getElementById('empSalary').value,
    address: document.getElementById('empAddress').value.trim()
  });
  setData('etg_employees', employees);
  closeModal(); renderEmployees(); showToast('Employee added!', 'success');
}

function editEmployee(empId) {
  const emp = (getData('etg_employees')||[]).find(e => e.empId === empId);
  if (emp) openAddEmployeeModal(emp);
}

function saveEditEmployee(empId) {
  const employees = getData('etg_employees');
  const idx = employees.findIndex(e => e.empId === empId);
  if (idx === -1) return;
  employees[idx] = { ...employees[idx],
    name: document.getElementById('empName').value.trim(),
    department: document.getElementById('empDept').value,
    role: document.getElementById('empRole').value.trim(),
    phone: document.getElementById('empPhone').value.trim(),
    email: document.getElementById('empEmail').value.trim(),
    joinDate: document.getElementById('empJoin').value,
    salary: document.getElementById('empSalary').value,
    address: document.getElementById('empAddress').value.trim()
  };
  setData('etg_employees', employees);
  closeModal(); renderEmployees(); showToast('Employee updated!', 'success');
}

function deleteEmployee(empId) {
  if (!confirm('Delete this employee?')) return;
  let employees = getData('etg_employees');
  employees = employees.filter(e => e.empId !== empId);
  setData('etg_employees', employees);
  renderEmployees(); showToast('Employee deleted', 'success');
}

// ===== ATTENDANCE =====
function renderAttendance() {
  const employees = getData('etg_employees') || [];
  const today = new Date().toISOString().split('T')[0];
  const attendance = getData('etg_attendance') || [];
  const todayRecords = attendance.filter(a => a.date === today);

  let rows = employees.map(e => {
    const rec = todayRecords.find(a => a.empId === e.empId);
    const status = rec ? rec.status : '';
    return `<tr>
      <td><span class="badge badge-gold">EMP-${e.empId}</span></td>
      <td>${e.name}</td><td>${e.department}</td>
      <td>
        <select class="filter-select" onchange="markAttendance(${e.empId},'${today}',this.value)" style="min-width:120px;">
          <option value="" ${!status?'selected':''}>-- Select --</option>
          <option value="Present" ${status==='Present'?'selected':''}>✅ Present</option>
          <option value="Absent" ${status==='Absent'?'selected':''}>❌ Absent</option>
          <option value="Half Day" ${status==='Half Day'?'selected':''}>🕐 Half Day</option>
          <option value="Leave" ${status==='Leave'?'selected':''}>🏖️ Leave</option>
        </select>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('hrmsContent').innerHTML = `
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-calendar-check"></i> Attendance — ${today}</h3></div>
      ${employees.length === 0 ? '<div class="no-data"><i class="fa-solid fa-user-slash"></i><p>Add employees first</p></div>' :
      `<div class="table-container"><table><thead><tr><th>ID</th><th>Name</th><th>Department</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`}
    </div>`;
}

function markAttendance(empId, date, status) {
  let attendance = getData('etg_attendance') || [];
  const idx = attendance.findIndex(a => a.empId === empId && a.date === date);
  if (idx >= 0) attendance[idx].status = status;
  else attendance.push({ empId, date, status });
  setData('etg_attendance', attendance);
  showToast('Attendance marked', 'success');
}

// ===== LEAVE MANAGEMENT =====
function renderLeave() {
  const leaves = getData('etg_leaves') || [];
  const employees = getData('etg_employees') || [];
  let rows = leaves.map(l => {
    const emp = employees.find(e => e.empId === l.empId);
    return `<tr>
      <td>${emp ? emp.name : 'Unknown'}</td><td>${l.type}</td><td>${l.from}</td><td>${l.to}</td>
      <td>${l.reason}</td>
      <td><span class="badge ${l.status==='Approved'?'badge-success':l.status==='Rejected'?'badge-danger':'badge-warning'}">${l.status}</span></td>
      <td>${l.status === 'Pending' && currentUser.role === 'admin' ? `
        <button class="btn btn-sm btn-success" onclick="updateLeave(${l.id},'Approved')">Approve</button>
        <button class="btn btn-sm btn-danger" onclick="updateLeave(${l.id},'Rejected')">Reject</button>` : '-'}
      </td>
    </tr>`;
  }).join('');

  document.getElementById('hrmsContent').innerHTML = `
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-calendar-xmark"></i> Leave Management</h3>
        <button class="btn btn-gold btn-sm" onclick="openLeaveModal()"><i class="fa-solid fa-plus"></i> Apply Leave</button>
      </div>
      ${leaves.length === 0 ? '<div class="no-data"><i class="fa-solid fa-calendar"></i><p>No leave records</p></div>' :
      `<div class="table-container"><table><thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`}
    </div>`;
}

function openLeaveModal() {
  const employees = getData('etg_employees') || [];
  openModal('Apply Leave', `
    <div class="form-group-app"><label>Employee</label><select id="leaveEmp">
      ${employees.map(e => `<option value="${e.empId}">${e.name} (EMP-${e.empId})</option>`).join('')}
    </select></div>
    <div class="form-group-app"><label>Leave Type</label><select id="leaveType">
      <option>Casual Leave</option><option>Sick Leave</option><option>Earned Leave</option><option>Compensatory Off</option>
    </select></div>
    <div class="form-grid">
      <div class="form-group-app"><label>From</label><input type="date" id="leaveFrom"></div>
      <div class="form-group-app"><label>To</label><input type="date" id="leaveTo"></div>
    </div>
    <div class="form-group-app"><label>Reason</label><textarea id="leaveReason" rows="2" style="width:100%;padding:10px;background:rgba(255,255,255,0.04);border:1px solid var(--border-glass);border-radius:8px;color:var(--text-primary);"></textarea></div>
    <button class="btn btn-gold w-full mt-16" onclick="submitLeave()"><i class="fa-solid fa-paper-plane"></i> Submit</button>
  `);
}

function submitLeave() {
  const empId = parseInt(document.getElementById('leaveEmp').value);
  const type = document.getElementById('leaveType').value;
  const from = document.getElementById('leaveFrom').value;
  const to = document.getElementById('leaveTo').value;
  const reason = document.getElementById('leaveReason').value.trim();
  if (!from || !to) { showToast('Select dates', 'error'); return; }
  let leaves = getData('etg_leaves') || [];
  leaves.push({ id: Date.now(), empId, type, from, to, reason, status: 'Pending' });
  setData('etg_leaves', leaves);
  closeModal(); renderLeave(); showToast('Leave applied!', 'success');
}

function updateLeave(id, status) {
  let leaves = getData('etg_leaves') || [];
  const l = leaves.find(x => x.id === id);
  if (l) { l.status = status; setData('etg_leaves', leaves); renderLeave(); showToast(`Leave ${status.toLowerCase()}`, 'success'); }
}

// ===== PAYROLL =====
function renderPayroll() {
  const employees = getData('etg_employees') || [];
  const totalPayroll = employees.reduce((s, e) => s + (parseFloat(e.salary) || 0), 0);
  let rows = employees.map(e => `<tr>
    <td><span class="badge badge-gold">EMP-${e.empId}</span></td>
    <td>${e.name}</td><td>${e.department}</td><td>${e.role}</td>
    <td>₹${parseFloat(e.salary||0).toLocaleString('en-IN')}</td>
  </tr>`).join('');

  document.getElementById('hrmsContent').innerHTML = `
    <div class="stats-grid" style="margin-bottom:20px;">
      <div class="stat-card"><div class="stat-icon gold"><i class="fa-solid fa-sack-dollar"></i></div><div class="stat-info"><h4>₹${totalPayroll.toLocaleString('en-IN')}</h4><p>Total Monthly Payroll</p></div></div>
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-users"></i></div><div class="stat-info"><h4>${employees.length}</h4><p>Total Employees</p></div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-money-check-dollar"></i> Payroll Summary</h3></div>
      ${employees.length === 0 ? '<div class="no-data"><i class="fa-solid fa-sack-dollar"></i><p>No employees</p></div>' :
      `<div class="table-container"><table><thead><tr><th>ID</th><th>Name</th><th>Department</th><th>Role</th><th>Monthly Salary</th></tr></thead><tbody>${rows}</tbody></table></div>`}
    </div>`;
}
