/* =============================================
   ETG GROUPS — Invoice Module
   ============================================= */

const GST_RATE = 18;

function renderInvoice() {
  const invoices = getData('etg_invoices') || [];
  const bookings = getData('etg_bookings') || [];

  let rows = '';
  if (invoices.length === 0 && bookings.length === 0) {
    rows = '<div class="no-data"><i class="fa-solid fa-file-invoice"></i><p>No invoices yet. Create bookings first.</p></div>';
  } else {
    // Generate button + existing invoices
    let invRows = invoices.map(inv => {
      const isAdmin = currentUser && currentUser.role === 'admin';
      return `<tr>
      <td><span class="badge badge-gold">${inv.invNumber}</span></td>
      <td>ETG-${inv.custCode}</td><td>${inv.custName}</td><td>${inv.date}</td>
      <td>₹${parseFloat(inv.grandTotal||0).toLocaleString('en-IN')}</td>
      <td><span class="badge ${inv.paid?'badge-success':'badge-warning'}">${inv.paid?'Paid':'Unpaid'}</span></td>
      <td>
        <button class="btn-icon" onclick="viewInvoice('${inv.invNumber}')" title="View"><i class="fa-solid fa-eye"></i></button>
        <button class="btn-icon" onclick="printInvoice('${inv.invNumber}')" title="Download"><i class="fa-solid fa-download"></i></button>
        ${isAdmin ? `<button class="btn-icon" onclick="togglePaid('${inv.invNumber}')" title="Toggle Payment"><i class="fa-solid fa-money-bill-wave"></i></button>
        <button class="btn-icon" onclick="deleteInvoice('${inv.invNumber}')" title="Delete"><i class="fa-solid fa-trash"></i></button>` : ''}
      </td>
    </tr>`;
    }).join('');

    rows = `${invRows ? `<div class="table-container"><table><thead><tr><th>Invoice #</th><th>Client Code</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>${invRows}</tbody></table></div>` : '<div class="no-data"><i class="fa-solid fa-file-invoice"></i><p>No invoices generated yet</p></div>'}`;
  }

  // Build booking options for generating
  const bkOptions = bookings.map(b => `<option value="${b.custCode}">ETG-${b.custCode} — ${b.custName}</option>`).join('');

  document.getElementById('invoiceContent').innerHTML = `
    <div class="card mb-24">
      <div class="card-header"><h3><i class="fa-solid fa-wand-magic-sparkles"></i> Generate Invoice</h3></div>
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;">
        <div class="form-group-app" style="flex:1;min-width:250px;margin:0;">
          <label>Select Booking / Client Code</label>
          <select id="invBookingSelect" class="filter-select" style="width:100%;padding:12px;">
            <option value="">-- Select a booking --</option>${bkOptions}
          </select>
        </div>
        <button class="btn btn-gold" onclick="generateInvoice()"><i class="fa-solid fa-file-circle-plus"></i> Generate Invoice</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-file-invoice-dollar"></i> All Invoices</h3></div>
      ${rows}
    </div>
    <div id="invoicePreviewArea" class="mt-24"></div>`;
}

function generateInvoice() {
  const custCode = document.getElementById('invBookingSelect').value;
  if (!custCode) { showToast('Select a booking first', 'error'); return; }
  const bookings = getData('etg_bookings') || [];
  const booking = bookings.find(b => b.custCode == custCode);
  if (!booking) { showToast('Booking not found', 'error'); return; }

  let invoices = getData('etg_invoices') || [];
  // Check if already generated
  if (invoices.find(i => i.custCode == custCode)) {
    showToast('Invoice already exists for this booking. View it below.', 'info');
    viewInvoice(invoices.find(i => i.custCode == custCode).invNumber);
    return;
  }

  const invCount = getNextId('invoice');
  const invNumber = 'ETG-INV-' + invCount;
  const cost = parseFloat(booking.costPaid) || 0;
  const visa = parseFloat(booking.visaFee) || 0;
  const other = parseFloat(booking.otherFee) || 0;
  const service = parseFloat(booking.serviceFee) || 0;
  const subtotal = cost + visa + other + service;
  const gst = Math.round(subtotal * GST_RATE / 100);
  const grandTotal = subtotal + gst;

  const invoice = {
    invNumber, custCode: booking.custCode, custName: booking.custName,
    phone: booking.phone, email: booking.email, country: booking.country,
    services: booking.services, costPaid: cost, visaFee: visa,
    otherFee: other, serviceFee: service, subtotal, gst, grandTotal,
    date: new Date().toISOString().split('T')[0], paid: false
  };
  invoices.push(invoice);
  setData('etg_invoices', invoices);
  renderInvoice();
  showToast('Invoice generated: ' + invNumber, 'success');
  setTimeout(() => viewInvoice(invNumber), 300);
}

function viewInvoice(invNumber) {
  const inv = (getData('etg_invoices')||[]).find(i => i.invNumber === invNumber);
  if (!inv) return;

  const serviceRows = (inv.services || []).map((s, i) => {
    let fee = 0;
    if (s.toLowerCase().includes('visa')) fee = inv.visaFee;
    else if (i === 0) fee = inv.costPaid;
    else fee = inv.serviceFee;
    return `<tr><td>${i+1}</td><td>${s}</td><td>${inv.country}</td><td>₹${fee.toLocaleString('en-IN')}</td></tr>`;
  }).join('');

  document.getElementById('invoicePreviewArea').innerHTML = `
    <div class="card" id="invoicePrint">
      <div class="invoice-preview">
        <div class="inv-header">
          <div class="inv-company">
            <h2>✈️ ETG GROUPS</h2>
            <p>Travel Management Portal</p>
            <p style="margin-top:8px;">Phone: +91-XXXXXXXXXX</p>
            <p>Email: info@etggroups.com</p>
            <p>GSTIN: XXXXXXXXXXXXXXXXX</p>
          </div>
          <div class="inv-title">
            <h1>INVOICE</h1>
            <p><strong>${inv.invNumber}</strong></p>
            <p>Date: ${inv.date}</p>
            <p style="margin-top:8px;"><span style="padding:4px 12px;background:${inv.paid?'#2ed573':'#ffa502'};color:#fff;border-radius:12px;font-size:0.75rem;">${inv.paid?'PAID':'UNPAID'}</span></p>
          </div>
        </div>
        <div class="inv-details">
          <div><h4>Bill To</h4><p><strong>${inv.custName}</strong></p><p>${inv.phone||''}</p><p>${inv.email||''}</p></div>
          <div style="text-align:right;"><h4>Client Code</h4><p><strong>ETG-${inv.custCode}</strong></p><h4 style="margin-top:12px;">Country</h4><p>${inv.country}</p></div>
        </div>
        <table>
          <thead><tr><th>#</th><th>Service</th><th>Destination</th><th>Amount</th></tr></thead>
          <tbody>
            ${serviceRows}
            <tr><td></td><td>Visa Fee</td><td>-</td><td>₹${inv.visaFee.toLocaleString('en-IN')}</td></tr>
            <tr><td></td><td>Other Charges</td><td>-</td><td>₹${inv.otherFee.toLocaleString('en-IN')}</td></tr>
            <tr><td></td><td>Service Fee</td><td>-</td><td>₹${inv.serviceFee.toLocaleString('en-IN')}</td></tr>
          </tbody>
        </table>
        <div class="inv-total">
          <div class="total-row"><span>Subtotal:</span><span>₹${inv.subtotal.toLocaleString('en-IN')}</span></div>
          <div class="total-row"><span>GST (${GST_RATE}%):</span><span>₹${inv.gst.toLocaleString('en-IN')}</span></div>
          <div class="total-row grand-total"><span>Grand Total:</span><span>₹${inv.grandTotal.toLocaleString('en-IN')}</span></div>
        </div>
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #ddd;text-align:center;">
          <p style="font-size:0.8rem;color:#888;">Thank you for choosing ETG GROUPS! 🌍</p>
          <p style="font-size:0.7rem;color:#aaa;margin-top:4px;">This is a computer-generated invoice.</p>
        </div>
      </div>
    </div>
    <div style="text-align:center;margin-top:16px;">
      <button class="btn btn-gold" onclick="printInvoice('${inv.invNumber}')"><i class="fa-solid fa-print"></i> Print / Download PDF</button>
    </div>`;
  document.getElementById('invoicePreviewArea').scrollIntoView({ behavior: 'smooth' });
}

function printInvoice(invNumber) {
  const inv = (getData('etg_invoices')||[]).find(i => i.invNumber === invNumber);
  if (!inv) return;
  // Open print window
  const printWin = window.open('', '_blank', 'width=800,height=900');
  const serviceRows = (inv.services || []).map((s, i) => {
    let fee = i === 0 ? inv.costPaid : inv.serviceFee;
    return `<tr><td>${i+1}</td><td>${s}</td><td>${inv.country}</td><td>₹${fee.toLocaleString('en-IN')}</td></tr>`;
  }).join('');

  printWin.document.write(`<!DOCTYPE html><html><head><title>${inv.invNumber}</title>
    <style>
      .logo-img{width:50px;height:auto;margin-bottom:6px;}
      body{font-family:Arial,sans-serif;padding:40px;color:#333;}
      table{width:100%;border-collapse:collapse;margin:20px 0;}
      th{background:#1a1a2e;color:#fff;padding:10px;text-align:left;font-size:0.8rem;}
      td{padding:10px;border-bottom:1px solid #eee;font-size:0.85rem;}
      .header{display:flex;justify-content:space-between;border-bottom:3px solid #f0a500;padding-bottom:16px;margin-bottom:20px;}
      .total{text-align:right;margin-top:20px;}
      .total div{padding:4px 0;}
      .grand{font-size:1.2rem;font-weight:bold;color:#e94560;border-top:2px solid #333;padding-top:8px;margin-top:8px;}
      .footer{text-align:center;margin-top:40px;font-size:0.8rem;color:#888;}
    </style>
  </head><body>
    <div class="header"><div><h2 style="color:#e94560;">ETG GROUPS</h2><p>Phone: +91-XXXXXXXXXX</p><p>Email: info@etggroups.com</p></div>
    <div style="text-align:right;"><h1>INVOICE</h1><p><strong>${inv.invNumber}</strong></p><p>Date: ${inv.date}</p></div></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:20px;">
      <div><h4 style="color:#888;font-size:0.75rem;">BILL TO</h4><p><strong>${inv.custName}</strong></p><p>${inv.phone||''}</p><p>${inv.email||''}</p></div>
      <div style="text-align:right;"><h4 style="color:#888;font-size:0.75rem;">CLIENT CODE</h4><p><strong>ETG-${inv.custCode}</strong></p></div>
    </div>
    <table><thead><tr><th>#</th><th>Service</th><th>Destination</th><th>Amount</th></tr></thead><tbody>
      ${serviceRows}
      <tr><td></td><td>Visa Fee</td><td>-</td><td>₹${inv.visaFee.toLocaleString('en-IN')}</td></tr>
      <tr><td></td><td>Other Charges</td><td>-</td><td>₹${inv.otherFee.toLocaleString('en-IN')}</td></tr>
      <tr><td></td><td>Service Fee</td><td>-</td><td>₹${inv.serviceFee.toLocaleString('en-IN')}</td></tr>
    </tbody></table>
    <div class="total"><div>Subtotal: ₹${inv.subtotal.toLocaleString('en-IN')}</div><div>GST (${GST_RATE}%): ₹${inv.gst.toLocaleString('en-IN')}</div>
    <div class="grand">Grand Total: ₹${inv.grandTotal.toLocaleString('en-IN')}</div></div>
    <div class="footer"><p>Thank you for choosing ETG GROUPS! 🌍</p></div>
  </body></html>`);
  printWin.document.close();
  setTimeout(() => printWin.print(), 500);
}

function togglePaid(invNumber) {
  if (!currentUser || currentUser.role !== 'admin') { showToast('Admin access required', 'error'); return; }
  let invoices = getData('etg_invoices');
  const inv = invoices.find(i => i.invNumber === invNumber);
  if (inv) { inv.paid = !inv.paid; setData('etg_invoices', invoices); renderInvoice(); showToast(`Invoice marked as ${inv.paid?'Paid':'Unpaid'}`, 'success'); }
}

function deleteInvoice(invNumber) {
  if (!currentUser || currentUser.role !== 'admin') { showToast('Admin access required', 'error'); return; }
  if (!confirm('Delete this invoice?')) return;
  let invoices = getData('etg_invoices');
  invoices = invoices.filter(i => i.invNumber !== invNumber);
  setData('etg_invoices', invoices);
  renderInvoice(); showToast('Invoice deleted', 'success');
}
