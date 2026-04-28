/* =============================================
   ETG TRAVELS — Customer Details Module
   ============================================= */

function renderCustomers() {
  const customers = getData('etg_customers') || [];
  const bookings = getData('etg_bookings') || [];

  let rows = '';
  if (customers.length === 0) {
    rows = '<div class="no-data"><i class="fa-solid fa-address-book"></i><p>No customers yet. Add bookings from Onboarding.</p></div>';
  } else {
    rows = `<div class="toolbar">
      <div class="search-box"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="custSearch" placeholder="Search by name, code, email..." oninput="filterCustomers()"></div>
      <button class="btn btn-gold btn-sm" onclick="exportCustomersCSV()"><i class="fa-solid fa-download"></i> Export CSV</button>
      <button class="btn btn-secondary btn-sm" onclick="openAddCustomerModal()"><i class="fa-solid fa-plus"></i> Add Customer</button>
    </div>
    <div class="table-container"><table><thead><tr>
      <th>Client Code</th><th>Name</th><th>Contact</th><th>Email</th><th>Address</th><th>Bookings</th><th>Actions</th>
    </tr></thead><tbody id="custTableBody">${customers.map(c => {
      const bkCount = bookings.filter(b => b.custCode === c.code).length;
      return `<tr class="cust-row" data-search="${(c.name+c.email+c.code+c.phone).toLowerCase()}">
        <td><span class="badge badge-gold">ETG-${c.code}</span></td>
        <td>${c.name}</td><td>${c.phone}</td><td>${c.email}</td><td>${c.address||'-'}</td>
        <td><span class="badge badge-info">${bkCount}</span></td>
        <td>
          <button class="btn-icon" onclick="viewCustomer(${c.code})" title="View"><i class="fa-solid fa-eye"></i></button>
          <button class="btn-icon" onclick="editCustomer(${c.code})" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-icon" onclick="deleteCustomer(${c.code})" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
  }

  document.getElementById('customersContent').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon gold"><i class="fa-solid fa-users"></i></div><div class="stat-info"><h4>${customers.length}</h4><p>Total Customers</p></div></div>
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-plane"></i></div><div class="stat-info"><h4>${bookings.length}</h4><p>Total Bookings</p></div></div>
    </div>
    <div class="card"><div class="card-header"><h3><i class="fa-solid fa-database"></i> Customer Database</h3></div>${rows}</div>`;
}

function filterCustomers() {
  const q = document.getElementById('custSearch').value.toLowerCase();
  document.querySelectorAll('.cust-row').forEach(row => {
    row.style.display = row.dataset.search.includes(q) ? '' : 'none';
  });
}

function openAddCustomerModal(cust) {
  const isEdit = !!cust;
  openModal(isEdit ? 'Edit Customer' : 'Add Customer', `
    <div class="form-grid">
      <div class="form-group-app"><label>Full Name *</label><input type="text" id="cName" value="${cust?cust.name:''}"></div>
      <div class="form-group-app"><label>Contact Number</label><input type="tel" id="cPhone" value="${cust?cust.phone:''}"></div>
      <div class="form-group-app"><label>Email ID</label><input type="email" id="cEmail" value="${cust?cust.email:''}"></div>
      <div class="form-group-app"><label>Address</label><input type="text" id="cAddress" value="${cust?cust.address||'':''}"></div>
    </div>
    <button class="btn btn-gold w-full mt-16" onclick="${isEdit?`saveEditCustomer(${cust.code})`:'saveCustomer()'}">
      <i class="fa-solid fa-save"></i> ${isEdit?'Update':'Save'}
    </button>`);
}

function saveCustomer() {
  const name = document.getElementById('cName').value.trim();
  if (!name) { showToast('Name is required', 'error'); return; }
  let customers = getData('etg_customers') || [];
  const code = getNextId('customer');
  customers.push({
    code, name,
    phone: document.getElementById('cPhone').value.trim(),
    email: document.getElementById('cEmail').value.trim(),
    address: document.getElementById('cAddress').value.trim(),
    createdDate: new Date().toISOString().split('T')[0]
  });
  setData('etg_customers', customers);
  closeModal(); renderCustomers(); showToast('Customer added! Code: ETG-' + code, 'success');
}

function editCustomer(code) {
  const c = (getData('etg_customers')||[]).find(x => x.code === code);
  if (c) openAddCustomerModal(c);
}

function saveEditCustomer(code) {
  let customers = getData('etg_customers');
  const idx = customers.findIndex(c => c.code === code);
  if (idx === -1) return;
  customers[idx] = { ...customers[idx],
    name: document.getElementById('cName').value.trim(),
    phone: document.getElementById('cPhone').value.trim(),
    email: document.getElementById('cEmail').value.trim(),
    address: document.getElementById('cAddress').value.trim()
  };
  setData('etg_customers', customers);
  closeModal(); renderCustomers(); showToast('Customer updated!', 'success');
}

function deleteCustomer(code) {
  if (!confirm('Delete this customer?')) return;
  let customers = getData('etg_customers');
  customers = customers.filter(c => c.code !== code);
  setData('etg_customers', customers);
  renderCustomers(); showToast('Customer deleted', 'success');
}

function viewCustomer(code) {
  const c = (getData('etg_customers')||[]).find(x => x.code === code);
  const bookings = (getData('etg_bookings')||[]).filter(b => b.custCode === code);
  if (!c) return;
  let bkHtml = bookings.length === 0 ? '<p class="text-muted">No bookings found</p>' :
    `<table style="width:100%;"><thead><tr><th>Date</th><th>Services</th><th>Country</th><th>Status</th><th>Total</th></tr></thead><tbody>
    ${bookings.map(b => {
      const total = (parseFloat(b.costPaid)||0)+(parseFloat(b.visaFee)||0)+(parseFloat(b.otherFee)||0)+(parseFloat(b.serviceFee)||0);
      return `<tr><td>${b.bookingDate}</td><td>${(b.services||[]).join(', ')}</td><td>${b.country}</td>
      <td><span class="badge ${b.status==='Completed'?'badge-success':'badge-warning'}">${b.status}</span></td>
      <td>₹${total.toLocaleString('en-IN')}</td></tr>`;
    }).join('')}</tbody></table>`;

  openModal(`<i class="fa-solid fa-user"></i> ETG-${c.code} — ${c.name}`, `
    <div class="form-grid mb-24">
      <div><p class="text-muted" style="font-size:0.75rem;">PHONE</p><p>${c.phone||'-'}</p></div>
      <div><p class="text-muted" style="font-size:0.75rem;">EMAIL</p><p>${c.email||'-'}</p></div>
      <div><p class="text-muted" style="font-size:0.75rem;">ADDRESS</p><p>${c.address||'-'}</p></div>
      <div><p class="text-muted" style="font-size:0.75rem;">SINCE</p><p>${c.createdDate||'-'}</p></div>
    </div>
    <h4 style="margin-bottom:12px;"><i class="fa-solid fa-plane text-gold"></i> Booking History</h4>
    ${bkHtml}`);
}

function exportCustomersCSV() {
  const customers = getData('etg_customers') || [];
  if (customers.length === 0) { showToast('No customers to export', 'error'); return; }
  let csv = 'Client Code,Name,Phone,Email,Address\n';
  customers.forEach(c => { csv += `ETG-${c.code},"${c.name}","${c.phone}","${c.email}","${c.address||''}"\n`; });
  downloadFile(csv, 'etg_customers.csv', 'text/csv');
  showToast('CSV exported!', 'success');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
