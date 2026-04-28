/* =============================================
   ETG TRAVELS — Accounting & Reports Module
   ============================================= */

function getAccountBalances() {
  const bookings = getData('etg_bookings') || [];
  const purchases = getData('etg_purchases') || [];
  const balances = { 'Company Account': 0, 'Sujith Account': 0, 'Kalanthar Account': 0 };

  // Income: Online bookings transferred to accounts
  bookings.forEach(b => {
    if (b.paymentMode === 'Online' && b.transferAccount && balances.hasOwnProperty(b.transferAccount)) {
      const total = (parseFloat(b.costPaid)||0)+(parseFloat(b.visaFee)||0)+(parseFloat(b.otherFee)||0)+(parseFloat(b.serviceFee)||0);
      balances[b.transferAccount] += total;
    }
  });

  // Expense: Purchases paid from accounts
  purchases.forEach(p => {
    if (p.paidBy && balances.hasOwnProperty(p.paidBy)) {
      balances[p.paidBy] -= parseFloat(p.amount) || 0;
    }
  });

  return balances;
}

function getAccountTransactions(accountName) {
  const bookings = getData('etg_bookings') || [];
  const purchases = getData('etg_purchases') || [];
  const txns = [];

  bookings.forEach(b => {
    if (b.paymentMode === 'Online' && b.transferAccount === accountName) {
      const total = (parseFloat(b.costPaid)||0)+(parseFloat(b.visaFee)||0)+(parseFloat(b.otherFee)||0)+(parseFloat(b.serviceFee)||0);
      txns.push({ date: b.bookingDate, type: 'credit', desc: `Booking ETG-${b.custCode} — ${b.custName}`, amount: total });
    }
  });

  purchases.forEach(p => {
    if (p.paidBy === accountName) {
      const svcLabel = p.service === 'Other' ? (p.serviceOther || 'Other') : p.service;
      txns.push({ date: p.date, type: 'debit', desc: `Purchase — ${p.vendorName} (${svcLabel})`, amount: parseFloat(p.amount) || 0 });
    }
  });

  txns.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return txns;
}

function renderAccounting() {
  const bookings = getData('etg_bookings') || [];
  const invoices = getData('etg_invoices') || [];
  const purchases = getData('etg_purchases') || [];
  const balances = getAccountBalances();

  const totalRevenue = bookings.reduce((s, b) => s + (parseFloat(b.costPaid)||0) + (parseFloat(b.visaFee)||0) + (parseFloat(b.otherFee)||0) + (parseFloat(b.serviceFee)||0), 0);
  const totalPaid = invoices.filter(i => i.paid).reduce((s, i) => s + (i.grandTotal||0), 0);
  const totalUnpaid = invoices.filter(i => !i.paid).reduce((s, i) => s + (i.grandTotal||0), 0);
  const totalGST = invoices.reduce((s, i) => s + (i.gst||0), 0);
  const totalPurchases = purchases.reduce((s, p) => s + (parseFloat(p.amount)||0), 0);
  const pendingPayments = bookings.filter(b => b.paymentMode === 'Payment Pending').reduce((s, b) => s + (parseFloat(b.costPaid)||0)+(parseFloat(b.visaFee)||0)+(parseFloat(b.otherFee)||0)+(parseFloat(b.serviceFee)||0), 0);
  const cashReceived = bookings.filter(b => b.paymentMode === 'Cash').reduce((s, b) => s + (parseFloat(b.costPaid)||0)+(parseFloat(b.visaFee)||0)+(parseFloat(b.otherFee)||0)+(parseFloat(b.serviceFee)||0), 0);

  // Service breakdown
  const serviceRevenue = {};
  bookings.forEach(b => {
    (b.services||[]).forEach(s => {
      if (!serviceRevenue[s]) serviceRevenue[s] = 0;
      const perService = ((parseFloat(b.costPaid)||0)+(parseFloat(b.visaFee)||0)+(parseFloat(b.otherFee)||0)+(parseFloat(b.serviceFee)||0)) / (b.services.length || 1);
      serviceRevenue[s] += perService;
    });
  });

  // Monthly data
  const monthlyData = {};
  bookings.forEach(b => {
    if (!b.bookingDate) return;
    const month = b.bookingDate.substring(0, 7);
    if (!monthlyData[month]) monthlyData[month] = 0;
    monthlyData[month] += (parseFloat(b.costPaid)||0)+(parseFloat(b.visaFee)||0)+(parseFloat(b.otherFee)||0)+(parseFloat(b.serviceFee)||0);
  });

  const months = Object.keys(monthlyData).sort();
  const maxVal = Math.max(...Object.values(monthlyData), 1);
  const bars = months.map(m => {
    const pct = (monthlyData[m] / maxVal) * 100;
    const label = new Date(m + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    return `<div class="chart-bar" style="height:${Math.max(pct, 5)}%;" title="₹${monthlyData[m].toLocaleString('en-IN')}">
      <span class="bar-value">₹${(monthlyData[m]/1000).toFixed(1)}k</span>
      <span class="bar-label">${label}</span>
    </div>`;
  }).join('');

  const maxServiceVal = Math.max(...Object.values(serviceRevenue), 1);
  const serviceBars = Object.entries(serviceRevenue).map(([s, v]) => {
    const pct = (v / maxServiceVal) * 100;
    return `<div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:4px;">
        <span>${s}</span><span class="text-gold">₹${Math.round(v).toLocaleString('en-IN')}</span>
      </div>
      <div style="height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent),var(--gold));border-radius:4px;transition:width 0.5s;"></div>
      </div>
    </div>`;
  }).join('');

  // Account balance cards
  const accIcons = { 'Company Account': 'fa-building', 'Sujith Account': 'fa-user', 'Kalanthar Account': 'fa-user-tie' };
  const accColors = { 'Company Account': 'blue', 'Sujith Account': 'green', 'Kalanthar Account': 'gold' };
  const accBalanceCards = Object.entries(balances).map(([acc, bal]) => {
    const color = accColors[acc] || 'blue';
    const icon = accIcons[acc] || 'fa-wallet';
    const balClass = bal >= 0 ? 'text-success' : 'text-accent';
    return `<div class="stat-card account-balance-card">
      <div class="stat-icon ${color}"><i class="fa-solid ${icon}"></i></div>
      <div class="stat-info">
        <h4 class="${balClass}">₹${Math.abs(bal).toLocaleString('en-IN')}${bal < 0 ? ' (Deficit)' : ''}</h4>
        <p>${acc}</p>
      </div>
    </div>`;
  }).join('');

  // Account tabs for ledger
  const accountNames = Object.keys(balances);
  const ledgerTabs = accountNames.map((acc, i) => `<button class="tab-btn ${i===0?'active':''}" onclick="switchAccountLedger('${acc}', event)">${acc.replace(' Account','')}</button>`).join('');

  const firstAccTxns = getAccountTransactions(accountNames[0]);
  const ledgerRows = buildLedgerRows(firstAccTxns);

  document.getElementById('accountingContent').innerHTML = `
    <!-- Account Balances -->
    <div class="card mb-24" style="border-left:4px solid var(--gold);">
      <div class="card-header"><h3><i class="fa-solid fa-wallet"></i> Account Balances</h3></div>
      <div class="stats-grid">${accBalanceCards}</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:12px;">
        <div class="stat-card" style="flex:1;min-width:200px;"><div class="stat-icon red"><i class="fa-solid fa-hourglass-half"></i></div><div class="stat-info"><h4 style="color:var(--warning);">₹${pendingPayments.toLocaleString('en-IN')}</h4><p>Payment Pending</p></div></div>
        <div class="stat-card" style="flex:1;min-width:200px;"><div class="stat-icon green"><i class="fa-solid fa-money-bill-wave"></i></div><div class="stat-info"><h4>₹${cashReceived.toLocaleString('en-IN')}</h4><p>Cash Received</p></div></div>
        <div class="stat-card" style="flex:1;min-width:200px;"><div class="stat-icon red"><i class="fa-solid fa-cart-shopping"></i></div><div class="stat-info"><h4 style="color:var(--danger);">₹${totalPurchases.toLocaleString('en-IN')}</h4><p>Total Purchases</p></div></div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-indian-rupee-sign"></i></div><div class="stat-info"><h4>₹${totalRevenue.toLocaleString('en-IN')}</h4><p>Total Revenue</p></div></div>
      <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-circle-check"></i></div><div class="stat-info"><h4>₹${totalPaid.toLocaleString('en-IN')}</h4><p>Paid (incl GST)</p></div></div>
      <div class="stat-card"><div class="stat-icon red"><i class="fa-solid fa-clock"></i></div><div class="stat-info"><h4>₹${totalUnpaid.toLocaleString('en-IN')}</h4><p>Unpaid</p></div></div>
      <div class="stat-card"><div class="stat-icon gold"><i class="fa-solid fa-percent"></i></div><div class="stat-info"><h4>₹${totalGST.toLocaleString('en-IN')}</h4><p>Total GST</p></div></div>
    </div>

    <!-- Account Ledger -->
    <div class="card mb-24">
      <div class="card-header"><h3><i class="fa-solid fa-book"></i> Account Transaction Ledger</h3></div>
      <div class="tabs" id="ledgerTabs">${ledgerTabs}</div>
      <div id="ledgerContent">${ledgerRows}</div>
    </div>

    <!-- Filters & Download -->
    <div class="card mb-24">
      <div class="card-header"><h3><i class="fa-solid fa-filter"></i> Filter & Download Reports</h3></div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
        <div class="form-group-app" style="margin:0;min-width:150px;"><label>From Date</label><input type="date" id="accFrom" class="filter-select" style="width:100%;"></div>
        <div class="form-group-app" style="margin:0;min-width:150px;"><label>To Date</label><input type="date" id="accTo" class="filter-select" style="width:100%;"></div>
        <div class="form-group-app" style="margin:0;min-width:150px;"><label>Service</label>
          <select id="accService" class="filter-select" style="width:100%;"><option value="">All Services</option>${SERVICES_LIST.map(s => `<option>${s}</option>`).join('')}</select>
        </div>
        <div class="form-group-app" style="margin:0;min-width:130px;"><label>Status</label>
          <select id="accStatus" class="filter-select" style="width:100%;"><option value="">All</option><option>Pending</option><option>Confirmed</option><option>Completed</option><option>Cancelled</option></select>
        </div>
        <div class="form-group-app" style="margin:0;min-width:150px;"><label>Account</label>
          <select id="accAccount" class="filter-select" style="width:100%;"><option value="">All Accounts</option>${ACCOUNTS_LIST.map(a => `<option>${a}</option>`).join('')}</select>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="applyAccountingFilter()"><i class="fa-solid fa-filter"></i> Apply</button>
        <button class="btn btn-gold btn-sm" onclick="downloadReport()"><i class="fa-solid fa-download"></i> Download</button>
      </div>
      <div id="filteredReport" class="mt-16"></div>
    </div>

    <!-- Charts -->
    <div class="grid-2" style="gap:20px;">
      <div class="card">
        <div class="card-header"><h3><i class="fa-solid fa-chart-column"></i> Monthly Revenue</h3></div>
        ${months.length === 0 ? '<div class="no-data"><i class="fa-solid fa-chart-bar"></i><p>No data to display</p></div>' :
        `<div class="chart-container"><div class="chart-bar-group">${bars}</div></div>`}
      </div>
      <div class="card">
        <div class="card-header"><h3><i class="fa-solid fa-chart-pie"></i> Service-wise Revenue</h3></div>
        ${Object.keys(serviceRevenue).length === 0 ? '<div class="no-data"><i class="fa-solid fa-chart-pie"></i><p>No data to display</p></div>' :
        `<div style="padding:10px 0;">${serviceBars}</div>`}
      </div>
    </div>`;
}

function buildLedgerRows(txns) {
  if (txns.length === 0) return '<div class="no-data" style="padding:24px;"><i class="fa-solid fa-book-open"></i><p>No transactions for this account</p></div>';
  let balance = 0;
  const sorted = [...txns].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const rows = sorted.map(t => {
    balance += t.type === 'credit' ? t.amount : -t.amount;
    return `<tr>
      <td>${t.date}</td>
      <td>${t.desc}</td>
      <td style="color:${t.type==='credit'?'var(--success)':'var(--danger)'};">${t.type==='credit'?'↑ Credit':'↓ Debit'}</td>
      <td style="font-weight:600;color:${t.type==='credit'?'var(--success)':'var(--danger)'};">${t.type==='credit'?'+':'-'}₹${t.amount.toLocaleString('en-IN')}</td>
      <td style="font-weight:700;">₹${balance.toLocaleString('en-IN')}</td>
    </tr>`;
  }).join('');
  return `<div class="table-container"><table><thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th><th>Balance</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function switchAccountLedger(accountName, evt) {
  document.querySelectorAll('#ledgerTabs .tab-btn').forEach(btn => btn.classList.remove('active'));
  if (evt && evt.target) evt.target.classList.add('active');
  const txns = getAccountTransactions(accountName);
  document.getElementById('ledgerContent').innerHTML = buildLedgerRows(txns);
}

function applyAccountingFilter() {
  const from = document.getElementById('accFrom').value;
  const to = document.getElementById('accTo').value;
  const service = document.getElementById('accService').value;
  const status = document.getElementById('accStatus').value;
  const account = document.getElementById('accAccount').value;

  let bookings = getData('etg_bookings') || [];
  if (from) bookings = bookings.filter(b => b.bookingDate >= from);
  if (to) bookings = bookings.filter(b => b.bookingDate <= to);
  if (service) bookings = bookings.filter(b => (b.services||[]).includes(service));
  if (status) bookings = bookings.filter(b => b.status === status);
  if (account) bookings = bookings.filter(b => b.transferAccount === account);

  const total = bookings.reduce((s, b) => s + (parseFloat(b.costPaid)||0)+(parseFloat(b.visaFee)||0)+(parseFloat(b.otherFee)||0)+(parseFloat(b.serviceFee)||0), 0);

  let rows = bookings.map(b => {
    const t = (parseFloat(b.costPaid)||0)+(parseFloat(b.visaFee)||0)+(parseFloat(b.otherFee)||0)+(parseFloat(b.serviceFee)||0);
    return `<tr>
      <td><span class="badge badge-gold">ETG-${b.custCode}</span></td>
      <td>${b.custName}</td><td>${b.bookingDate}</td>
      <td>${(b.services||[]).join(', ')}</td>
      <td><span class="badge ${b.paymentMode==='Online'?'badge-success':b.paymentMode==='Cash'?'badge-info':'badge-warning'}">${b.paymentMode||'—'}</span></td>
      <td>${b.transferAccount||'—'}</td>
      <td><span class="badge ${b.status==='Completed'?'badge-success':'badge-warning'}">${b.status}</span></td>
      <td>₹${t.toLocaleString('en-IN')}</td>
    </tr>`;
  }).join('');

  document.getElementById('filteredReport').innerHTML = `
    <div style="margin-bottom:12px;"><strong>${bookings.length}</strong> records found — Total: <strong class="text-gold">₹${total.toLocaleString('en-IN')}</strong></div>
    ${bookings.length > 0 ? `<div class="table-container"><table><thead><tr>
      <th>Code</th><th>Customer</th><th>Date</th><th>Services</th><th>Payment</th><th>Account</th><th>Status</th><th>Amount</th>
    </tr></thead><tbody>${rows}</tbody></table></div>` : ''}`;
}

function downloadReport() {
  const from = document.getElementById('accFrom').value;
  const to = document.getElementById('accTo').value;
  const service = document.getElementById('accService').value;
  const status = document.getElementById('accStatus').value;
  const account = document.getElementById('accAccount').value;

  let bookings = getData('etg_bookings') || [];
  if (from) bookings = bookings.filter(b => b.bookingDate >= from);
  if (to) bookings = bookings.filter(b => b.bookingDate <= to);
  if (service) bookings = bookings.filter(b => (b.services||[]).includes(service));
  if (status) bookings = bookings.filter(b => b.status === status);
  if (account) bookings = bookings.filter(b => b.transferAccount === account);

  if (bookings.length === 0) { showToast('No data to download', 'error'); return; }

  let csv = 'Client Code,Customer Name,Date,Services,Country,Cost Paid,Visa Fee,Other Fee,Service Fee,Total,Payment Mode,Transfer Account,Status\n';
  bookings.forEach(b => {
    const t = (parseFloat(b.costPaid)||0)+(parseFloat(b.visaFee)||0)+(parseFloat(b.otherFee)||0)+(parseFloat(b.serviceFee)||0);
    csv += `ETG-${b.custCode},"${b.custName}",${b.bookingDate},"${(b.services||[]).join('; ')}",${b.country},${b.costPaid||0},${b.visaFee||0},${b.otherFee||0},${b.serviceFee||0},${t},${b.paymentMode||''},${b.transferAccount||''},${b.status}\n`;
  });

  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(csv, `ETG_Report_${dateStr}.csv`, 'text/csv');
  showToast('Report downloaded!', 'success');
}
