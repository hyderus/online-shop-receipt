/**
 * ShopReceipt Pro — Virtual Receipt & QR Scanner System
 * Handles Order State, QR Code Generation & Scanning, WhatsApp Sharing, and Verification.
 */

// Application State Keys
const STORAGE_KEY_ORDERS = 'shopreceipt_orders_v1';
const STORAGE_KEY_SETTINGS = 'shopreceipt_settings_v1';

// Default Shop Configuration
const defaultSettings = {
  name: 'Apex Boutique & Electronics',
  tagline: 'Curated Quality & Verified Authentic Products',
  currency: '$',
  phone: '+1 (555) 839-2041',
  email: 'support@apexboutique.com',
  address: '742 Market Street, San Francisco, CA 94103',
  footer: 'Thank you for your purchase! Official warranty valid with this virtual QR receipt.'
};

// Global Runtime State
let appSettings = loadSettings();
let orders = loadOrders();
let currentViewingOrder = null;
let html5QrScannerInstance = null;
let currentScannerRunning = false;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Apply Store Settings to UI
  applySettingsToUI();

  // Populate initial product row in sale form
  resetSaleForm();

  // Update Stats & UI
  updateDashboardStats();
  renderRecentDashboardOrders();
  renderOrdersHistory();

  // Handle URL deep-linking (e.g., ?receipt=REC-2026-1001 or #view/REC-...)
  handleDeepLink();

  // Event listener for popstate
  window.addEventListener('popstate', handleDeepLink);
});

/* ==========================================================================
   STORAGE & DATA MANAGEMENT
   ========================================================================== */

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : { ...defaultSettings };
  } catch (e) {
    console.error('Failed to load settings', e);
    return { ...defaultSettings };
  }
}

function saveSettings(newSettings) {
  appSettings = { ...newSettings };
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(appSettings));
  applySettingsToUI();
  updateDashboardStats();
  renderOrdersHistory();
  showToast('Store settings saved successfully!', 'success');
}

function loadOrders() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ORDERS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load orders', e);
  }
  // If empty, return initial realistic starter orders
  return getInitialSampleOrders();
}

function saveOrders(newOrders) {
  orders = newOrders;
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
  updateDashboardStats();
  renderRecentDashboardOrders();
  renderOrdersHistory();
}

function getInitialSampleOrders() {
  const sample = [
    {
      id: 'REC-2026-8491',
      date: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
      customer: {
        name: 'Alexander Wright',
        phone: '+1 415-555-0192',
        email: 'alex.wright@email.com',
        address: '220 Montgomery St, San Francisco, CA'
      },
      items: [
        { name: 'Sony WH-1000XM5 Noise Canceling Headphones', sku: 'SNY-WH5-BLK', category: 'Electronics', price: 349.99, qty: 1, total: 349.99 },
        { name: 'Hard Shell Travel Protection Case', sku: 'CASE-WH5', category: 'Accessories', price: 29.50, qty: 1, total: 29.50 }
      ],
      pricing: {
        subtotal: 379.49,
        discount: 20.00,
        taxRate: 8.5,
        taxAmount: 30.56,
        shipping: 0.00,
        grandTotal: 390.05
      },
      payment: {
        method: 'Credit / Debit Card',
        status: 'Paid'
      },
      warranty: '1 Year Manufacturer Limited Warranty',
      notes: 'Serial #SN-2026-X84192. Express 2-Day Air Delivery.'
    },
    {
      id: 'REC-2026-7215',
      date: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
      customer: {
        name: 'Jessica Reynolds',
        phone: '+1 212-555-0144',
        email: 'jess.reynolds@gmail.com',
        address: '740 Park Avenue, New York, NY'
      },
      items: [
        { name: 'Minimalist Titanium Smart Watch Gen 3', sku: 'WCH-TT3-SLV', category: 'Electronics', price: 220.00, qty: 1, total: 220.00 }
      ],
      pricing: {
        subtotal: 220.00,
        discount: 0.00,
        taxRate: 5.0,
        taxAmount: 11.00,
        shipping: 12.00,
        grandTotal: 243.00
      },
      payment: {
        method: 'Online Payment / Gateway',
        status: 'Paid'
      },
      warranty: '6 Months Replacement Guarantee',
      notes: 'Gift wrap requested with message card.'
    },
    {
      id: 'REC-2026-6102',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Yesterday
      customer: {
        name: 'David Kim',
        phone: '+1 650-555-0178',
        email: 'dkim@valleytech.io',
        address: '380 University Ave, Palo Alto, CA'
      },
      items: [
        { name: 'Ergonomic Mechanical Keyboard (RGB Brown Switches)', sku: 'KB-MECH-BR', category: 'Accessories', price: 145.00, qty: 1, total: 145.00 },
        { name: 'Custom Coiled Aviator Cable (Midnight Blue)', sku: 'CBL-AV-BLU', category: 'Accessories', price: 35.00, qty: 2, total: 70.00 }
      ],
      pricing: {
        subtotal: 215.00,
        discount: 15.00,
        taxRate: 0.0,
        taxAmount: 0.00,
        shipping: 10.00,
        grandTotal: 210.00
      },
      payment: {
        method: 'Cash on Delivery (COD)',
        status: 'Cash on Delivery'
      },
      warranty: '1 Year Warranty',
      notes: 'Deliver to office reception on 4th floor.'
    }
  ];
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(sample));
  return sample;
}

/* ==========================================================================
   NAVIGATION & UI TAB SWITCHING
   ========================================================================== */

function switchTab(tabId) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));

  // Show selected tab
  const activeTab = document.getElementById(`tab-${tabId}`);
  if (activeTab) {
    activeTab.classList.remove('hidden');
  }

  // Update desktop navigation active styling
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.remove('text-brand-700', 'bg-white', 'shadow-sm');
    btn.classList.add('text-slate-600');
  });

  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('text-brand-700', 'bg-white', 'shadow-sm');
    activeBtn.classList.remove('text-slate-600');
  }

  // Update mobile tab styling
  ['dashboard', 'new-sale', 'scan-qr', 'history'].forEach(id => {
    const mobileBtn = document.getElementById(`mobile-tab-btn-${id}`);
    if (mobileBtn) {
      if (id === tabId) {
        mobileBtn.className = 'flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-center text-brand-700 bg-white shadow-sm flex items-center justify-center gap-1.5';
      } else {
        mobileBtn.className = 'flex-1 py-1.5 px-2 rounded-lg text-xs font-medium text-center text-slate-600 hover:bg-slate-200/50 flex items-center justify-center gap-1.5';
      }
    }
  });

  // Re-run lucide icons refresh
  if (window.lucide) {
    lucide.createIcons();
  }

  // Tab specific lifecycle
  if (tabId === 'history') {
    renderOrdersHistory();
  } else if (tabId === 'dashboard') {
    updateDashboardStats();
    renderRecentDashboardOrders();
  } else if (tabId === 'scan-qr') {
    // If navigating to scan QR, ensure clean viewfinder
    document.getElementById('scan-feedback').classList.add('hidden');
  } else if (tabId !== 'scan-qr' && currentScannerRunning) {
    // Automatically stop scanner if user leaves QR tab to save battery & camera
    stopQRScanner();
  }
}

/* ==========================================================================
   SALE FORM & DYNAMIC ITEM ROWS
   ========================================================================== */

function generateReceiptNumber() {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `REC-${year}-${randomNum}`;
}

function generateNewReceiptNo() {
  document.getElementById('receipt-number').value = generateReceiptNumber();
}

function resetSaleForm() {
  const form = document.getElementById('sale-form');
  if (form) form.reset();

  // Set default receipt number
  generateNewReceiptNo();

  // Set default date to current local datetime
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('order-date').value = now.toISOString().slice(0, 16);

  // Set default warranty from store settings
  document.getElementById('order-warranty').value = '1 Year Official Warranty / 7 Days Replacement';

  // Clear product items list & add one fresh row
  const itemsContainer = document.getElementById('product-items-list');
  itemsContainer.innerHTML = '';
  addProductItemRow();

  // Recalculate totals
  calculateTotals();

  if (window.lucide) lucide.createIcons();
}

function addProductItemRow(name = '', sku = '', price = '', qty = 1) {
  const container = document.getElementById('product-items-list');
  const index = container.children.length;

  const row = document.createElement('div');
  row.className = 'product-item-row p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 transition duration-150';
  row.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
        <span class="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[11px] font-bold flex items-center justify-center">${index + 1}</span>
        Product Details
      </span>
      ${index > 0 ? `
        <button type="button" onclick="removeProductItemRow(this)" class="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 font-medium transition">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Remove
        </button>
      ` : ''}
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
      <!-- Product Name -->
      <div class="sm:col-span-5">
        <label class="block text-[11px] font-semibold text-slate-600 mb-1">Product Title / Name <span class="text-rose-500">*</span></label>
        <input type="text" required placeholder="e.g. Wireless Bluetooth Earbuds" value="${name}"
          class="item-name w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs bg-white" />
      </div>

      <!-- SKU / Code -->
      <div class="sm:col-span-3">
        <label class="block text-[11px] font-semibold text-slate-600 mb-1">SKU / Code</label>
        <input type="text" placeholder="e.g. EB-PRO-01" value="${sku}"
          class="item-sku w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs bg-white font-mono" />
      </div>

      <!-- Quantity -->
      <div class="sm:col-span-2">
        <label class="block text-[11px] font-semibold text-slate-600 mb-1">Qty <span class="text-rose-500">*</span></label>
        <input type="number" required min="1" step="1" value="${qty}" oninput="calculateTotals()"
          class="item-qty w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs bg-white font-mono text-center" />
      </div>

      <!-- Unit Price -->
      <div class="sm:col-span-2">
        <label class="block text-[11px] font-semibold text-slate-600 mb-1">Unit Price (${appSettings.currency}) <span class="text-rose-500">*</span></label>
        <input type="number" required min="0" step="any" placeholder="0.00" value="${price}" oninput="calculateTotals()"
          class="item-price w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs bg-white font-mono text-right" />
      </div>
    </div>
  `;

  container.appendChild(row);
  if (window.lucide) lucide.createIcons();
  calculateTotals();
}

function removeProductItemRow(button) {
  const row = button.closest('.product-item-row');
  row.remove();
  // Re-index remaining rows
  const container = document.getElementById('product-items-list');
  Array.from(container.children).forEach((child, idx) => {
    const badge = child.querySelector('.text-\\[11px\\]');
    if (badge) badge.textContent = idx + 1;
  });
  calculateTotals();
}

function calculateTotals() {
  const rows = document.querySelectorAll('.product-item-row');
  let subtotal = 0;

  rows.forEach(row => {
    const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
    const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
    subtotal += qty * price;
  });

  const discount = parseFloat(document.getElementById('calc-discount')?.value) || 0;
  const taxRate = parseFloat(document.getElementById('calc-tax-rate')?.value) || 0;
  const shipping = parseFloat(document.getElementById('calc-shipping')?.value) || 0;

  const discountedSubtotal = Math.max(0, subtotal - discount);
  const taxAmount = (discountedSubtotal * taxRate) / 100;
  const grandTotal = Math.max(0, discountedSubtotal + taxAmount + shipping);

  const curr = appSettings.currency;
  document.getElementById('summary-subtotal').textContent = `${curr}${subtotal.toFixed(2)}`;
  document.getElementById('summary-discount').textContent = `-${curr}${discount.toFixed(2)}`;
  document.getElementById('summary-tax').textContent = `${curr}${taxAmount.toFixed(2)} (${taxRate}%)`;
  document.getElementById('summary-shipping').textContent = `${curr}${shipping.toFixed(2)}`;
  document.getElementById('summary-grand-total').textContent = `${curr}${grandTotal.toFixed(2)}`;

  return {
    subtotal,
    discount,
    taxRate,
    taxAmount,
    shipping,
    grandTotal
  };
}

/* ==========================================================================
   CREATE & SAVE RECEIPT
   ========================================================================== */

function handleCreateReceipt(e) {
  e.preventDefault();

  const customerName = document.getElementById('cust-name').value.trim();
  const customerPhone = document.getElementById('cust-phone').value.trim();
  const customerEmail = document.getElementById('cust-email').value.trim();
  const customerAddress = document.getElementById('cust-address').value.trim();
  const receiptNo = document.getElementById('receipt-number').value.trim() || generateReceiptNumber();
  const orderDate = document.getElementById('order-date').value || new Date().toISOString();
  const paymentMethod = document.getElementById('payment-method').value;
  const paymentStatus = document.getElementById('payment-status').value;
  const warranty = document.getElementById('order-warranty').value.trim();
  const notes = document.getElementById('order-notes').value.trim();

  // Collect Product Items
  const itemRows = document.querySelectorAll('.product-item-row');
  const items = [];

  itemRows.forEach(row => {
    const name = row.querySelector('.item-name')?.value.trim();
    const sku = row.querySelector('.item-sku')?.value.trim() || 'N/A';
    const qty = parseInt(row.querySelector('.item-qty')?.value, 10) || 1;
    const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
    if (name) {
      items.push({
        name,
        sku,
        qty,
        price,
        total: qty * price
      });
    }
  });

  if (items.length === 0) {
    showToast('Please add at least one product to the receipt!', 'error');
    return;
  }

  const totals = calculateTotals();

  // Create Order Object
  const newOrder = {
    id: receiptNo,
    date: new Date(orderDate).toISOString(),
    customer: {
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      address: customerAddress
    },
    items,
    pricing: totals,
    payment: {
      method: paymentMethod,
      status: paymentStatus
    },
    warranty,
    notes,
    createdAt: new Date().toISOString()
  };

  // Prepend to orders list
  orders.unshift(newOrder);
  saveOrders(orders);

  // Trigger celebration confetti
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 }
    });
  }

  showToast(`Virtual Receipt ${newOrder.id} generated!`, 'success');

  // Open the receipt modal for preview and printing
  openReceiptModal(newOrder);

  // Reset the form for next sale
  resetSaleForm();
}

/* ==========================================================================
   VIRTUAL RECEIPT MODAL & QR RENDERING
   ========================================================================== */

function openReceiptModal(order) {
  currentViewingOrder = order;
  const curr = appSettings.currency;

  // Header & Store Information
  document.getElementById('receipt-store-name').textContent = appSettings.name;
  document.getElementById('receipt-store-tagline').textContent = appSettings.tagline;
  document.getElementById('receipt-store-phone').textContent = `Tel: ${appSettings.phone}`;
  document.getElementById('receipt-store-email').textContent = appSettings.email;
  document.getElementById('receipt-store-address').textContent = appSettings.address;
  document.getElementById('receipt-footer-msg').textContent = appSettings.footer;

  // Order & Receipt Metadata
  document.getElementById('receipt-view-id').textContent = order.id;
  document.getElementById('receipt-view-date').textContent = formatReceiptDate(order.date);

  // Status Badge
  const statusPill = document.getElementById('receipt-status-pill');
  statusPill.textContent = order.payment.status.toUpperCase();
  if (order.payment.status === 'Paid') {
    statusPill.className = 'inline-block px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase mb-2 bg-emerald-100 text-emerald-800 border border-emerald-200';
  } else if (order.payment.status === 'Pending') {
    statusPill.className = 'inline-block px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase mb-2 bg-amber-100 text-amber-800 border border-amber-200';
  } else {
    statusPill.className = 'inline-block px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase mb-2 bg-purple-100 text-purple-800 border border-purple-200';
  }

  // Customer Information (Sold to whom)
  document.getElementById('receipt-cust-name').textContent = order.customer.name;
  document.getElementById('receipt-cust-phone').textContent = order.customer.phone || 'N/A';
  document.getElementById('receipt-cust-email').textContent = order.customer.email || 'No email provided';
  document.getElementById('receipt-cust-address').textContent = order.customer.address || 'Standard Delivery / In-Store Pickup';

  // Payment & Terms
  document.getElementById('receipt-pay-method').textContent = order.payment.method;
  document.getElementById('receipt-warranty-info').textContent = order.warranty || 'Standard Store Terms';
  document.getElementById('receipt-notes').textContent = order.notes || 'None';

  // Render Product Items Table
  const itemsTbody = document.getElementById('receipt-items-tbody');
  itemsTbody.innerHTML = '';
  order.items.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-100 text-xs';
    tr.innerHTML = `
      <td class="py-2.5">
        <p class="font-bold text-slate-800">${escapeHTML(item.name)}</p>
        ${item.sku && item.sku !== 'N/A' ? `<p class="text-[10px] text-slate-400 font-mono">SKU: ${escapeHTML(item.sku)}</p>` : ''}
      </td>
      <td class="py-2.5 text-center font-mono font-medium text-slate-600">${item.qty}</td>
      <td class="py-2.5 text-right font-mono text-slate-600">${curr}${item.price.toFixed(2)}</td>
      <td class="py-2.5 text-right font-mono font-bold text-slate-800">${curr}${(item.qty * item.price).toFixed(2)}</td>
    `;
    itemsTbody.appendChild(tr);
  });

  // Totals Breakdown
  document.getElementById('receipt-subtotal').textContent = `${curr}${order.pricing.subtotal.toFixed(2)}`;

  const discountRow = document.getElementById('receipt-discount-row');
  if (order.pricing.discount > 0) {
    discountRow.classList.remove('hidden');
    document.getElementById('receipt-discount').textContent = `-${curr}${order.pricing.discount.toFixed(2)}`;
  } else {
    discountRow.classList.add('hidden');
  }

  const taxRow = document.getElementById('receipt-tax-row');
  if (order.pricing.taxAmount > 0) {
    taxRow.classList.remove('hidden');
    document.getElementById('receipt-tax-label').textContent = `Tax / VAT (${order.pricing.taxRate}%)`;
    document.getElementById('receipt-tax').textContent = `${curr}${order.pricing.taxAmount.toFixed(2)}`;
  } else {
    taxRow.classList.add('hidden');
  }

  const shippingRow = document.getElementById('receipt-shipping-row');
  if (order.pricing.shipping > 0) {
    shippingRow.classList.remove('hidden');
    document.getElementById('receipt-shipping').textContent = `${curr}${order.pricing.shipping.toFixed(2)}`;
  } else {
    shippingRow.classList.add('hidden');
  }

  document.getElementById('receipt-grand-total').textContent = `${curr}${order.pricing.grandTotal.toFixed(2)}`;

  // Verification Hash / Electronic Signature
  const hash = generateSimpleHash(`${order.id}-${order.customer.name}-${order.pricing.grandTotal}`);
  document.getElementById('receipt-hash').textContent = hash;

  // Generate QR Code
  generateReceiptQRCode(order);

  // Reveal Modal
  document.getElementById('receipt-modal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeReceiptModal() {
  document.getElementById('receipt-modal').classList.add('hidden');
  currentViewingOrder = null;
}

/**
 * Generate QR code that contains the verified URL and order metadata
 */
function generateReceiptQRCode(order) {
  const qrContainer = document.getElementById('receipt-qrcode-canvas');
  qrContainer.innerHTML = ''; // clear previous

  // The QR code contains the full link to this receipt
  // Using origin + pathname + query param ?receipt=REC-...
  const receiptUrl = `${window.location.origin}${window.location.pathname}?receipt=${encodeURIComponent(order.id)}`;

  try {
    new QRCode(qrContainer, {
      text: receiptUrl,
      width: 104,
      height: 104,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    qrContainer.innerHTML = '<span class="text-xs text-rose-500">QR Error</span>';
  }
}

function downloadQRCodePNG() {
  const qrImg = document.querySelector('#receipt-qrcode-canvas img') || document.querySelector('#receipt-qrcode-canvas canvas');
  if (!qrImg || !currentViewingOrder) {
    showToast('QR Code not ready for download', 'error');
    return;
  }

  let dataUrl = '';
  if (qrImg.tagName === 'IMG') {
    dataUrl = qrImg.src;
  } else if (qrImg.tagName === 'CANVAS') {
    dataUrl = qrImg.toDataURL('image/png');
  }

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `QR_${currentViewingOrder.id}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('QR Code image downloaded!', 'success');
}

/* ==========================================================================
   WHATSAPP & SHARING
   ========================================================================== */

function shareViaWhatsApp() {
  if (!currentViewingOrder) return;
  const order = currentViewingOrder;
  const curr = appSettings.currency;
  const receiptUrl = `${window.location.origin}${window.location.pathname}?receipt=${encodeURIComponent(order.id)}`;

  const itemsSummary = order.items.map(i => `• ${i.name} (x${i.qty})`).join('\n');

  const text = `*Virtual Receipt from ${appSettings.name}*\n` +
    `--------------------------------\n` +
    `*Receipt No:* ${order.id}\n` +
    `*Customer:* ${order.customer.name}\n` +
    `*Date:* ${formatReceiptDate(order.date)}\n` +
    `*Status:* ${order.payment.status.toUpperCase()}\n\n` +
    `*Purchased Items:*\n${itemsSummary}\n\n` +
    `*Grand Total:* ${curr}${order.pricing.grandTotal.toFixed(2)}\n` +
    `--------------------------------\n` +
    `*Verify & View Digital Receipt Online:*\n` +
    `${receiptUrl}\n\n` +
    `Thank you for shopping with us!`;

  // Clean phone number (remove spaces, dashes)
  const phone = (order.customer.phone || '').replace(/[^0-9]/g, '');
  const waUrl = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;

  window.open(waUrl, '_blank');
}

function copyReceiptLink() {
  if (!currentViewingOrder) return;
  const receiptUrl = `${window.location.origin}${window.location.pathname}?receipt=${encodeURIComponent(currentViewingOrder.id)}`;

  navigator.clipboard.writeText(receiptUrl).then(() => {
    showToast('Direct receipt link copied to clipboard!', 'success');
  }).catch(() => {
    prompt('Copy receipt link:', receiptUrl);
  });
}

/* ==========================================================================
   QR SCANNER ENGINE (HTML5-QRCODE)
   ========================================================================== */

function startQRScanner() {
  const qrReaderDiv = document.getElementById('qr-reader');
  const placeholder = document.getElementById('scanner-placeholder');
  const laserBar = document.getElementById('scanner-laser-bar');
  const startBtn = document.getElementById('btn-start-scanner');
  const stopBtn = document.getElementById('btn-stop-scanner');

  if (!html5QrScannerInstance) {
    html5QrScannerInstance = new Html5Qrcode('qr-reader');
  }

  placeholder.classList.add('hidden');
  laserBar.classList.remove('hidden');

  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.333334
  };

  html5QrScannerInstance.start(
    { facingMode: 'environment' },
    config,
    onQRCodeScanSuccess,
    onQRCodeScanError
  ).then(() => {
    currentScannerRunning = true;
    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    showToast('Camera active. Point at receipt QR code.', 'info');
  }).catch(err => {
    console.error('Failed to start camera:', err);
    placeholder.classList.remove('hidden');
    laserBar.classList.add('hidden');
    showToast('Could not access camera. Check browser permissions or upload an image file.', 'error');
  });
}

function stopQRScanner() {
  if (html5QrScannerInstance && currentScannerRunning) {
    html5QrScannerInstance.stop().then(() => {
      currentScannerRunning = false;
      document.getElementById('scanner-placeholder').classList.remove('hidden');
      document.getElementById('scanner-laser-bar').classList.add('hidden');
      document.getElementById('btn-start-scanner').classList.remove('hidden');
      document.getElementById('btn-stop-scanner').classList.add('hidden');
    }).catch(err => console.error('Error stopping QR scanner', err));
  }
}

function onQRCodeScanSuccess(decodedText) {
  // Beep feedback
  playSuccessBeep();

  // Stop scanner to avoid multiple triggers
  stopQRScanner();

  // Process the scanned text
  processScannedPayload(decodedText);
}

function onQRCodeScanError(errorMessage) {
  // Silent scan frame tick
}

function handleQRImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!html5QrScannerInstance) {
    html5QrScannerInstance = new Html5Qrcode('qr-reader');
  }

  showToast('Analyzing QR code image...', 'info');

  html5QrScannerInstance.scanFile(file, true)
    .then(decodedText => {
      playSuccessBeep();
      processScannedPayload(decodedText);
    })
    .catch(err => {
      console.error('Failed to decode image', err);
      showToast('Could not find a valid QR code in this image. Try another photo.', 'error');
    });

  // Reset file input
  e.target.value = '';
}

function handleManualLookup() {
  const input = document.getElementById('manual-receipt-id');
  const code = input.value.trim().toUpperCase();
  if (!code) {
    showToast('Please enter a Receipt # to verify', 'error');
    return;
  }
  processScannedPayload(code);
}

function processScannedPayload(payload) {
  const feedback = document.getElementById('scan-feedback');
  const feedbackText = document.getElementById('scan-feedback-text');

  let targetId = null;

  // Case 1: Scanned a URL containing ?receipt=...
  if (payload.includes('receipt=')) {
    try {
      const url = new URL(payload);
      targetId = url.searchParams.get('receipt');
    } catch {
      const match = payload.match(/receipt=([^&]+)/);
      if (match) targetId = decodeURIComponent(match[1]);
    }
  } else if (payload.startsWith('REC-')) {
    // Case 2: Direct Receipt ID
    targetId = payload;
  } else {
    targetId = payload.trim();
  }

  const foundOrder = orders.find(o => o.id.toUpperCase() === targetId.toUpperCase());

  if (foundOrder) {
    feedback.classList.remove('hidden', 'bg-rose-50', 'border-rose-200', 'text-rose-800');
    feedback.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-800');
    feedbackText.innerHTML = `<strong>Receipt Found:</strong> ${foundOrder.id} for <strong>${foundOrder.customer.name}</strong>`;

    showToast(`Verified: Receipt ${foundOrder.id} found!`, 'success');

    // Open receipt modal after brief visual delay
    setTimeout(() => {
      openReceiptModal(foundOrder);
    }, 700);
  } else {
    feedback.classList.remove('hidden', 'bg-emerald-50', 'border-emerald-200', 'text-emerald-800');
    feedback.classList.add('bg-rose-50', 'border-rose-200', 'text-rose-800');
    feedbackText.innerHTML = `No matching receipt found for "<strong>${escapeHTML(targetId)}</strong>". Verify the code and try again.`;
    showToast(`Receipt ${targetId} not found in database`, 'error');
  }
}

/* ==========================================================================
   ORDERS HISTORY & DIRECTORY
   ========================================================================== */

function renderOrdersHistory() {
  const tbody = document.getElementById('orders-table-body');
  const emptyState = document.getElementById('orders-empty-state');
  const search = (document.getElementById('order-search-input')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('order-status-filter')?.value || 'ALL';
  const countBadge = document.getElementById('filtered-count');
  const navBadge = document.getElementById('nav-orders-count');

  if (navBadge) navBadge.textContent = orders.length;

  // Filter orders
  const filtered = orders.filter(order => {
    // Status Filter
    if (statusFilter !== 'ALL' && order.payment.status !== statusFilter) {
      return false;
    }
    // Search Query
    if (search) {
      const inId = order.id.toLowerCase().includes(search);
      const inCust = order.customer.name.toLowerCase().includes(search);
      const inPhone = (order.customer.phone || '').toLowerCase().includes(search);
      const inItems = order.items.some(i => i.name.toLowerCase().includes(search) || (i.sku && i.sku.toLowerCase().includes(search)));
      return inId || inCust || inPhone || inItems;
    }
    return true;
  });

  if (countBadge) countBadge.textContent = `${filtered.length} of ${orders.length} receipts`;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  tbody.innerHTML = '';

  const curr = appSettings.currency;

  filtered.forEach(order => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition group';

    const itemsSummary = order.items.map(i => `${i.name} (x${i.qty})`).join(', ');
    const itemsTooltip = escapeHTML(itemsSummary);

    let statusClass = 'bg-slate-100 text-slate-700';
    if (order.payment.status === 'Paid') statusClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    else if (order.payment.status === 'Pending') statusClass = 'bg-amber-50 text-amber-700 border border-amber-200';
    else if (order.payment.status === 'Cash on Delivery') statusClass = 'bg-purple-50 text-purple-700 border border-purple-200';

    tr.innerHTML = `
      <td class="py-3.5 px-4 font-mono font-bold text-brand-600">
        <button onclick="handleViewReceiptById('${order.id}')" class="hover:underline flex items-center gap-1.5">
          <i data-lucide="receipt" class="w-3.5 h-3.5"></i>
          <span>${order.id}</span>
        </button>
      </td>
      <td class="py-3.5 px-4 text-slate-500 whitespace-nowrap">
        ${formatShortDate(order.date)}
      </td>
      <td class="py-3.5 px-4">
        <p class="font-bold text-slate-900">${escapeHTML(order.customer.name)}</p>
        <p class="text-[11px] text-slate-500 font-mono">${escapeHTML(order.customer.phone || 'No phone')}</p>
      </td>
      <td class="py-3.5 px-4 max-w-xs truncate text-slate-600" title="${itemsTooltip}">
        <span class="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px] mr-1">${order.items.length} item${order.items.length > 1 ? 's' : ''}</span>
        ${escapeHTML(itemsSummary)}
      </td>
      <td class="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
        ${curr}${order.pricing.grandTotal.toFixed(2)}
      </td>
      <td class="py-3.5 px-4 text-center">
        <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusClass}">
          ${order.payment.status}
        </span>
      </td>
      <td class="py-3.5 px-4 text-center">
        <div class="inline-flex items-center gap-1">
          <button onclick="handleViewReceiptById('${order.id}')" title="View Virtual Receipt & QR" class="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition">
            <i data-lucide="eye" class="w-4 h-4"></i>
          </button>
          <button onclick="handleWhatsAppDirect('${order.id}')" title="Send Receipt on WhatsApp" class="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition">
            <i data-lucide="message-square" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteOrderRecord('${order.id}')" title="Delete Receipt" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition">
            <i data-lucide="trash" class="w-4 h-4"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (window.lucide) lucide.createIcons();
}

function handleViewReceiptById(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (order) {
    openReceiptModal(order);
  } else {
    showToast(`Order ${orderId} not found`, 'error');
  }
}

function handleWhatsAppDirect(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (order) {
    currentViewingOrder = order;
    shareViaWhatsApp();
  }
}

function deleteOrderRecord(orderId) {
  if (confirm(`Are you sure you want to delete receipt ${orderId}? This cannot be undone.`)) {
    const updated = orders.filter(o => o.id !== orderId);
    saveOrders(updated);
    showToast(`Receipt ${orderId} deleted`, 'info');
  }
}

/* ==========================================================================
   DASHBOARD STATS & RECENT FEED
   ========================================================================== */

function updateDashboardStats() {
  const curr = appSettings.currency;

  let totalRev = 0;
  let todayRev = 0;
  let pendingCount = 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  let todayOrdersCount = 0;

  orders.forEach(order => {
    totalRev += order.pricing.grandTotal || 0;

    const orderDay = (order.date || '').slice(0, 10);
    if (orderDay === todayStr) {
      todayRev += order.pricing.grandTotal || 0;
      todayOrdersCount++;
    }

    if (order.payment.status === 'Pending' || order.payment.status === 'Cash on Delivery') {
      pendingCount++;
    }
  });

  document.getElementById('stat-total-revenue').textContent = `${curr}${totalRev.toFixed(2)}`;
  document.getElementById('stat-total-orders').textContent = orders.length;
  document.getElementById('stat-today-revenue').textContent = `${curr}${todayRev.toFixed(2)}`;
  document.getElementById('stat-today-orders').textContent = `${todayOrdersCount} sale${todayOrdersCount === 1 ? '' : 's'} recorded today`;
  document.getElementById('stat-pending-orders').textContent = pendingCount;
}

function renderRecentDashboardOrders() {
  const container = document.getElementById('dashboard-recent-orders');
  if (!container) return;

  const recent = orders.slice(0, 4);

  if (recent.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-slate-400 text-xs">
        No sales recorded yet. Click "Create Receipt" to add your first sale!
      </div>
    `;
    return;
  }

  const curr = appSettings.currency;
  container.innerHTML = '';

  recent.forEach(order => {
    const div = document.createElement('div');
    div.className = 'flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/70 transition shadow-xs';
    div.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs shrink-0">
          <i data-lucide="shopping-bag" class="w-5 h-5"></i>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-900 text-sm">${escapeHTML(order.customer.name)}</span>
            <span class="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">${order.id}</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">
            ${order.items.length} item${order.items.length > 1 ? 's' : ''} • ${formatShortDate(order.date)}
          </p>
        </div>
      </div>
      <div class="text-right">
        <p class="font-mono font-bold text-slate-900 text-sm">${curr}${order.pricing.grandTotal.toFixed(2)}</p>
        <button onclick="handleViewReceiptById('${order.id}')" class="text-[11px] font-semibold text-brand-600 hover:text-brand-800 hover:underline">
          View Receipt →
        </button>
      </div>
    `;
    container.appendChild(div);
  });

  if (window.lucide) lucide.createIcons();
}

/* ==========================================================================
   SETTINGS MODAL & STORE PROFILE
   ========================================================================== */

function openSettingsModal() {
  document.getElementById('setting-store-name').value = appSettings.name;
  document.getElementById('setting-store-tagline').value = appSettings.tagline;
  document.getElementById('setting-currency').value = appSettings.currency;
  document.getElementById('setting-phone').value = appSettings.phone;
  document.getElementById('setting-email').value = appSettings.email;
  document.getElementById('setting-address').value = appSettings.address;
  document.getElementById('setting-footer').value = appSettings.footer;

  document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettingsModal() {
  document.getElementById('settings-modal').classList.add('hidden');
}

function handleSaveSettings(e) {
  e.preventDefault();
  const updated = {
    name: document.getElementById('setting-store-name').value.trim(),
    tagline: document.getElementById('setting-store-tagline').value.trim(),
    currency: document.getElementById('setting-currency').value.trim() || '$',
    phone: document.getElementById('setting-phone').value.trim(),
    email: document.getElementById('setting-email').value.trim(),
    address: document.getElementById('setting-address').value.trim(),
    footer: document.getElementById('setting-footer').value.trim()
  };

  saveSettings(updated);
  closeSettingsModal();
}

function applySettingsToUI() {
  document.getElementById('nav-shop-name').textContent = appSettings.name;
  document.getElementById('quick-store-name').textContent = appSettings.name;
  document.getElementById('quick-store-currency').textContent = `${appSettings.currency}`;
  document.getElementById('quick-store-phone').textContent = appSettings.phone;
}

function loadSampleDemoData() {
  if (confirm('Load fresh demo sales & orders? Existing list will be updated with sample orders.')) {
    const samples = getInitialSampleOrders();
    saveOrders(samples);
    showToast('Demo data loaded successfully!', 'success');
    closeSettingsModal();
  }
}

/* ==========================================================================
   EXPORT, BACKUP & RESTORE
   ========================================================================== */

function exportOrdersToCSV() {
  if (orders.length === 0) {
    showToast('No orders to export!', 'error');
    return;
  }

  const headers = ['Receipt No', 'Date', 'Customer Name', 'Phone', 'Email', 'Address', 'Products Sold', 'Payment Method', 'Payment Status', 'Subtotal', 'Discount', 'Tax', 'Shipping', 'Grand Total', 'Warranty', 'Notes'];
  
  const csvRows = [headers.join(',')];

  orders.forEach(o => {
    const itemsSummary = o.items.map(i => `${i.name} (x${i.qty} @ ${i.price})`).join('; ');
    const row = [
      `"${o.id}"`,
      `"${o.date}"`,
      `"${cleanCSV(o.customer.name)}"`,
      `"${cleanCSV(o.customer.phone)}"`,
      `"${cleanCSV(o.customer.email)}"`,
      `"${cleanCSV(o.customer.address)}"`,
      `"${cleanCSV(itemsSummary)}"`,
      `"${o.payment.method}"`,
      `"${o.payment.status}"`,
      o.pricing.subtotal.toFixed(2),
      o.pricing.discount.toFixed(2),
      o.pricing.taxAmount.toFixed(2),
      o.pricing.shipping.toFixed(2),
      o.pricing.grandTotal.toFixed(2),
      `"${cleanCSV(o.warranty)}"`,
      `"${cleanCSV(o.notes)}"`
    ];
    csvRows.push(row.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `receipts_export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Orders exported to CSV!', 'success');
}

function cleanCSV(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '""');
}

function backupOrdersJSON() {
  const data = {
    settings: appSettings,
    orders: orders,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shopreceipt_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Complete backup downloaded!', 'success');
}

function restoreOrdersJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.orders && Array.isArray(data.orders)) {
        saveOrders(data.orders);
        if (data.settings) {
          saveSettings(data.settings);
        }
        showToast(`Successfully restored ${data.orders.length} orders!`, 'success');
      } else {
        showToast('Invalid backup file format.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error parsing backup file.', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/* ==========================================================================
   URL DEEP-LINKING & ROUTING
   ========================================================================== */

function handleDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const receiptId = params.get('receipt');

  if (receiptId) {
    const match = orders.find(o => o.id.toUpperCase() === receiptId.toUpperCase());
    if (match) {
      openReceiptModal(match);
      showToast(`Opening Verified Receipt: ${match.id}`, 'info');
    } else {
      showToast(`Receipt ${receiptId} could not be located`, 'error');
    }
  }
}

/* ==========================================================================
   UTILITY HELPERS
   ========================================================================== */

function formatReceiptDate(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

function formatShortDate(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

function generateSimpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 'SIG-' + Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function playSuccessBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    // AudioContext might be blocked before first user gesture
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `p-3.5 px-4 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 transition transform duration-200 pointer-events-auto animate-in slide-in-from-bottom-2 ${
    type === 'success' ? 'bg-slate-900 text-emerald-400 border-slate-800' :
    type === 'error' ? 'bg-rose-950 text-rose-200 border-rose-800' :
    'bg-slate-900 text-slate-100 border-slate-800'
  }`;

  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info';

  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 shrink-0"></i>
    <span>${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
