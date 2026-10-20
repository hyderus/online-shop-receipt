/**
 * SWAPEE — Virtual Receipt & QR Scanner System
 * Official Store Portal for SWAPEE (4 South Clerk Street, Edinburgh EH8 9JE, UK)
 */

// Application Storage Keys (v7: Clean compact format, reduced spacing, sharp QR)
const STORAGE_KEY_ORDERS = 'swapee_orders_v7';
const STORAGE_KEY_SETTINGS = 'swapee_settings_v7';

// Automatically wipe previous cached versions to ensure clean fresh data
['shopreceipt_orders_v1', 'shopreceipt_settings_v1', 'swapee_orders_v2', 'swapee_settings_v2', 'swapee_orders_v3', 'swapee_settings_v3', 'swapee_orders_v4', 'swapee_settings_v4', 'swapee_orders_v5', 'swapee_settings_v5', 'swapee_orders_v6', 'swapee_settings_v6'].forEach(k => {
  try { localStorage.removeItem(k); } catch (e) {}
});

// Official SWAPEE Configuration
const defaultSettings = {
  name: 'SWAPEE',
  tagline: 'SINCE 2002',
  address: '4 South Clerk Street, Edinburgh EH8 9JE, UK',
  phone: '+44 131 662 9955',
  vatNo: 'GB 693 8235 95',
  companyNo: 'SC175148',
  currency: '£',
  taxRate: 20,
  cashier: 'ASHA',
  footer: 'For electronics and mobile warranty issues past the return period, call +44 131 662 9955.'
};

// Global Runtime State
let appSettings = loadSettings();
let orders = loadOrders();
let currentViewingOrder = null;
let html5QrScannerInstance = null;
let currentScannerRunning = false;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  applySettingsToUI();
  resetSaleForm();
  updateDashboardStats();
  renderRecentDashboardOrders();
  renderOrdersHistory();
  handleDeepLink();

  window.addEventListener('popstate', handleDeepLink);
});

/* ==========================================================================
   STORAGE & DATA MANAGEMENT
   ========================================================================== */

function wipeAndResetAllData() {
  if (confirm('Are you sure you want to wipe all stored orders and reset to a clean SWAPEE database?')) {
    localStorage.clear();
    appSettings = { ...defaultSettings };
    orders = getInitialSampleOrders();
    saveSettings(appSettings);
    saveOrders(orders);
    showToast('Database wiped! Fresh SWAPEE system loaded.', 'success');
    setTimeout(() => { location.reload(); }, 500);
  }
}

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
  showToast('SWAPEE settings updated!', 'success');
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
  return getInitialSampleOrders();
}

function saveOrders(newOrders) {
  orders = newOrders;
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
  updateDashboardStats();
  renderRecentDashboardOrders();
  renderOrdersHistory();
}

/**
 * Returns clean SWAPEE starter data matching the latest verified receipt
 */
function getInitialSampleOrders() {
  const sample = [
    {
      id: 'UC664413',
      date: '2024-11-23T14:32:00.000Z',
      cashier: 'ASHA',
      customer: {
        id: 'ASHER',
        customerNo: '758D56-3',
        name: 'ASHER',
        phone: '+44 7700 900123',
        address: 'MUSEUM, YORK Y01 7FR'
      },
      items: [
        {
          name: 'Pixel 7A CHARC 128 GB',
          qty: 1,
          price: 312.88,
          total: 312.88,
          imei1: '353529407882886',
          imei2: '353529407882894',
          sn: '39251JEHN06086',
          sku: ''
        },
        {
          name: 'MALVIK PRO 30W',
          qty: 1,
          price: 27.90,
          total: 27.90,
          sku: '511',
          imei1: '',
          imei2: '',
          sn: ''
        }
      ],
      pricing: {
        subtotal: 340.78,
        discount: 20.00,
        taxRate: 20.0,
        taxAmount: 64.16,
        grandTotal: 384.94
      },
      payment: {
        method: 'VISA',
        status: 'Paid',
        acct: '****3471',
        authCode: '465116',
        entryMethod: 'CHIP READ',
        aid: 'A000004123645'
      },
      warranty: 'For electronics and mobile warranty issues past the return period, call +44 131 662 9955.'
    }
  ];
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(sample));
  return sample;
}

/* ==========================================================================
   NAVIGATION & UI TAB SWITCHING
   ========================================================================== */

function switchTab(tabId) {
  if (isCustomerVerificationMode) return;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));

  const activeTab = document.getElementById(`tab-${tabId}`);
  if (activeTab) {
    activeTab.classList.remove('hidden');
  }

  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.remove('text-slate-900', 'bg-white', 'shadow-sm');
    btn.classList.add('text-slate-600');
  });

  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('text-slate-900', 'bg-white', 'shadow-sm');
    activeBtn.classList.remove('text-slate-600');
  }

  ['dashboard', 'new-sale', 'scan-qr', 'history'].forEach(id => {
    const mobileBtn = document.getElementById(`mobile-tab-btn-${id}`);
    if (mobileBtn) {
      if (id === tabId) {
        mobileBtn.className = 'flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-center text-slate-900 bg-white shadow-sm flex items-center justify-center gap-1.5';
      } else {
        mobileBtn.className = 'flex-1 py-1.5 px-2 rounded-lg text-xs font-medium text-center text-slate-600 hover:bg-slate-200/50 flex items-center justify-center gap-1.5';
      }
    }
  });

  if (window.lucide) {
    lucide.createIcons();
  }

  if (tabId === 'history') {
    renderOrdersHistory();
  } else if (tabId === 'dashboard') {
    updateDashboardStats();
    renderRecentDashboardOrders();
  } else if (tabId === 'scan-qr') {
    document.getElementById('scan-feedback').classList.add('hidden');
  } else if (tabId !== 'scan-qr' && currentScannerRunning) {
    stopQRScanner();
  }
}

/* ==========================================================================
   SALE FORM & ITEM BUILDER (SELECTABLE IMEI1, IMEI2, SERIAL NO, SKU)
   ========================================================================== */

// Catalog of quick selectable device presets
const SWAPEE_INVENTORY_PRESETS = [
  {
    name: 'Pixel 7A CHARC 128 GB',
    price: 312.88,
    imei1: '353529407882886',
    imei2: '353529407882894',
    sn: '39251JEHN06086',
    sku: '',
    type: 'dual-imei'
  },
  {
    name: 'iPhone 13 Midnight 128GB (Unlocked)',
    price: 389.00,
    imei1: '356891048291045',
    imei2: '356891048291052',
    sn: 'FFGX8910PLMQ',
    sku: '',
    type: 'dual-imei'
  },
  {
    name: 'Samsung Galaxy S24 256GB Onyx Black',
    price: 549.00,
    imei1: '358921049182390',
    imei2: '358921049182398',
    sn: 'R58X901249A',
    sku: '',
    type: 'dual-imei'
  },
  {
    name: 'MALVIK PRO 30W (511) USB-C Charger',
    price: 27.90,
    imei1: '',
    imei2: '',
    sn: '',
    sku: 'A2419621',
    type: 'accessory'
  },
  {
    name: 'SWAPEE 9H Tempered Glass Screen Shield',
    price: 14.99,
    imei1: '',
    imei2: '',
    sn: '',
    sku: 'SWP-GLS-9H',
    type: 'accessory'
  },
  {
    name: 'SWAPEE Ultra MagSafe Protective Case',
    price: 19.99,
    imei1: '',
    imei2: '',
    sn: '',
    sku: 'CASE-MAG-CLR',
    type: 'accessory'
  }
];

function generateReceiptNumber() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `UC${randomNum}`;
}

function generateNewReceiptNo() {
  document.getElementById('receipt-number').value = generateReceiptNumber();
}

function resetSaleForm() {
  const form = document.getElementById('sale-form');
  if (form) form.reset();

  generateNewReceiptNo();

  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('order-date').value = today;
  document.getElementById('order-cashier').value = appSettings.cashier || 'ASHA';
  document.getElementById('order-warranty').value = appSettings.footer;

  const itemsContainer = document.getElementById('product-items-list');
  itemsContainer.innerHTML = '';
  addProductItemRow('', 1, '', '', '', '', '', { imei1: true, imei2: true, sn: true, sku: false });

  calculateTotals();
  if (window.lucide) lucide.createIcons();
}

/**
 * Adds a product line item row with SELECTABLE IMEI 1, IMEI 2, Serial Number (S/N), and SKU
 */
function addProductItemRow(
  name = '',
  qty = 1,
  price = '',
  sku = '',
  imei1 = '',
  imei2 = '',
  sn = '',
  activeFields = { imei1: true, imei2: true, sn: true, sku: true }
) {
  const container = document.getElementById('product-items-list');
  const index = container.children.length;
  const rowId = `item-row-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const hasImei1 = activeFields.imei1 !== undefined ? activeFields.imei1 : !!imei1;
  const hasImei2 = activeFields.imei2 !== undefined ? activeFields.imei2 : !!imei2;
  const hasSn = activeFields.sn !== undefined ? activeFields.sn : !!sn;
  const hasSku = activeFields.sku !== undefined ? activeFields.sku : !!sku;

  const row = document.createElement('div');
  row.id = rowId;
  row.className = 'product-item-row p-4 rounded-2xl border border-slate-300 bg-white shadow-sm space-y-3.5 transition duration-150';
  
  row.innerHTML = `
    <!-- Row Header & Preset Device Picker -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-bold font-mono flex items-center justify-center shrink-0">
          ${index + 1}
        </span>
        <span class="text-xs font-black text-slate-900 tracking-wide font-thermal uppercase">
          Product Item #${index + 1}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <!-- Quick Preset Device Dropdown -->
        <select onchange="onPresetDeviceSelected(this)" class="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-slate-50 font-mono text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900">
          <option value="">⚡ Select Device / Stock Preset...</option>
          ${SWAPEE_INVENTORY_PRESETS.map((p, idx) => `<option value="${idx}">${p.name} (£${p.price.toFixed(2)})</option>`).join('')}
        </select>

        ${index > 0 ? `
          <button type="button" onclick="removeProductItemRow(this)" class="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-lg flex items-center gap-1 font-semibold transition">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Remove
          </button>
        ` : ''}
      </div>
    </div>

    <!-- Main Title, Qty, Price -->
    <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
      <div class="sm:col-span-6">
        <label class="block text-[11px] font-bold text-slate-700 mb-1">
          Item Description / Model Name <span class="text-rose-500">*</span>
        </label>
        <input type="text" required placeholder="e.g. Pixel 7A CHARC 128 GB" value="${escapeHTML(name)}"
          class="item-name w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900" />
      </div>

      <div class="sm:col-span-3">
        <label class="block text-[11px] font-bold text-slate-700 mb-1">
          Quantity <span class="text-rose-500">*</span>
        </label>
        <input type="number" required min="1" step="1" value="${qty}" oninput="calculateTotals()"
          class="item-qty w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 font-mono text-center font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900" />
      </div>

      <div class="sm:col-span-3">
        <label class="block text-[11px] font-bold text-slate-700 mb-1">
          Unit Price (${appSettings.currency}) <span class="text-rose-500">*</span>
        </label>
        <input type="number" required min="0" step="any" placeholder="0.00" value="${price}" oninput="calculateTotals()"
          class="item-price w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 font-mono text-right font-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900" />
      </div>
    </div>

    <!-- ============================================== -->
    <!-- SELECTABLE FIELDS SELECTION CONTROL BAR (ONE LINE) -->
    <!-- ============================================== -->
    <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
      <div class="flex flex-nowrap items-center justify-between gap-2 overflow-x-auto whitespace-nowrap">
        <div class="flex items-center gap-1.5 text-[11px] font-bold text-slate-800 shrink-0">
          <i data-lucide="check-square" class="w-3.5 h-3.5 text-slate-900"></i>
          <span>Select Fields to Include:</span>
        </div>

        <!-- 1-Click Template Selector Buttons (In One Line) -->
        <div class="flex flex-nowrap items-center gap-1 text-[10px] font-mono font-semibold shrink-0">
          <button type="button" onclick="applyPresetToRow(this, 'dual-imei')" class="px-2 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-800 border border-slate-300 whitespace-nowrap">📱 Dual IMEI + S/N</button>
          <button type="button" onclick="applyPresetToRow(this, 'single-imei')" class="px-2 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-800 border border-slate-300 whitespace-nowrap">📱 1 IMEI + S/N</button>
          <button type="button" onclick="applyPresetToRow(this, 'accessory')" class="px-2 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-800 border border-slate-300 whitespace-nowrap">🔌 SKU Only</button>
          <button type="button" onclick="applyPresetToRow(this, 'all')" class="px-2 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-800 border border-slate-300 whitespace-nowrap">All 4</button>
        </div>
      </div>

      <!-- Selectable Checkboxes (Strictly in One Line) -->
      <div class="flex flex-nowrap items-center gap-2 pt-1 border-t border-slate-200/60 overflow-x-auto whitespace-nowrap">
        <!-- Selectable IMEI 1 -->
        <label class="flex-1 min-w-[95px] flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border cursor-pointer select-none transition shrink-0 ${hasImei1 ? 'bg-indigo-50/60 border-indigo-300 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-500'}">
          <input type="checkbox" class="toggle-imei1 rounded border-slate-300 text-slate-900 focus:ring-0" ${hasImei1 ? 'checked' : ''} onchange="toggleIdentifierField(this, 'imei1')">
          <span class="text-xs font-mono">IMEI 1</span>
        </label>

        <!-- Selectable IMEI 2 -->
        <label class="flex-1 min-w-[95px] flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border cursor-pointer select-none transition shrink-0 ${hasImei2 ? 'bg-indigo-50/60 border-indigo-300 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-500'}">
          <input type="checkbox" class="toggle-imei2 rounded border-slate-300 text-slate-900 focus:ring-0" ${hasImei2 ? 'checked' : ''} onchange="toggleIdentifierField(this, 'imei2')">
          <span class="text-xs font-mono">IMEI 2</span>
        </label>

        <!-- Selectable Serial Number (S/N) -->
        <label class="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border cursor-pointer select-none transition shrink-0 ${hasSn ? 'bg-indigo-50/60 border-indigo-300 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-500'}">
          <input type="checkbox" class="toggle-sn rounded border-slate-300 text-slate-900 focus:ring-0" ${hasSn ? 'checked' : ''} onchange="toggleIdentifierField(this, 'sn')">
          <span class="text-xs font-mono">Serial (S/N)</span>
        </label>

        <!-- Selectable SKU -->
        <label class="flex-1 min-w-[95px] flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border cursor-pointer select-none transition shrink-0 ${hasSku ? 'bg-indigo-50/60 border-indigo-300 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-500'}">
          <input type="checkbox" class="toggle-sku rounded border-slate-300 text-slate-900 focus:ring-0" ${hasSku ? 'checked' : ''} onchange="toggleIdentifierField(this, 'sku')">
          <span class="text-xs font-mono">SKU Code</span>
        </label>
      </div>

      <!-- ============================================== -->
      <!-- ACTIVE INPUT FIELDS CONTAINER (IN ONE LINE GRID)-->
      <!-- ============================================== -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
        
        <!-- Field 1: IMEI 1 -->
        <div class="field-container-imei1 ${hasImei1 ? '' : 'hidden'} bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-bold font-mono text-slate-600 uppercase flex items-center gap-1">
              <i data-lucide="smartphone" class="w-3 h-3 text-indigo-600"></i> IMEI 1
            </span>
            <button type="button" onclick="startFieldBarcodeScan(this, 'item-imei1')" class="text-[10px] text-slate-500 hover:text-black flex items-center gap-0.5" title="Scan Barcode from Box">
              <i data-lucide="scan" class="w-3 h-3"></i> Scan
            </button>
          </div>
          <input type="text" list="preset-imei1-options" placeholder="e.g. 353529407882886" value="${escapeHTML(imei1)}"
            class="item-imei1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>

        <!-- Field 2: IMEI 2 -->
        <div class="field-container-imei2 ${hasImei2 ? '' : 'hidden'} bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-bold font-mono text-slate-600 uppercase flex items-center gap-1">
              <i data-lucide="smartphone" class="w-3 h-3 text-indigo-600"></i> IMEI 2 (eSIM)
            </span>
            <button type="button" onclick="startFieldBarcodeScan(this, 'item-imei2')" class="text-[10px] text-slate-500 hover:text-black flex items-center gap-0.5" title="Scan Barcode from Box">
              <i data-lucide="scan" class="w-3 h-3"></i> Scan
            </button>
          </div>
          <input type="text" list="preset-imei2-options" placeholder="e.g. 353529407882894" value="${escapeHTML(imei2)}"
            class="item-imei2 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>

        <!-- Field 3: Serial Number (S/N) -->
        <div class="field-container-sn ${hasSn ? '' : 'hidden'} bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-bold font-mono text-slate-600 uppercase flex items-center gap-1">
              <i data-lucide="hash" class="w-3 h-3 text-indigo-600"></i> Serial (S/N)
            </span>
            <button type="button" onclick="startFieldBarcodeScan(this, 'item-sn')" class="text-[10px] text-slate-500 hover:text-black flex items-center gap-0.5" title="Scan Serial Barcode">
              <i data-lucide="scan" class="w-3 h-3"></i> Scan
            </button>
          </div>
          <input type="text" list="preset-sn-options" placeholder="e.g. 39251JEHN06086" value="${escapeHTML(sn)}"
            class="item-sn w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono uppercase bg-white focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>

        <!-- Field 4: SKU -->
        <div class="field-container-sku ${hasSku ? '' : 'hidden'} bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-bold font-mono text-slate-600 uppercase flex items-center gap-1">
              <i data-lucide="tag" class="w-3 h-3 text-indigo-600"></i> SKU / Part #
            </span>
            <button type="button" onclick="startFieldBarcodeScan(this, 'item-sku')" class="text-[10px] text-slate-500 hover:text-black flex items-center gap-0.5" title="Scan SKU Barcode">
              <i data-lucide="scan" class="w-3 h-3"></i> Scan
            </button>
          </div>
          <input type="text" list="preset-sku-options" placeholder="e.g. A2419621" value="${escapeHTML(sku)}"
            class="item-sku w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono uppercase bg-white focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>

      </div>
    </div>
  `;

  container.appendChild(row);
  if (window.lucide) lucide.createIcons();
  calculateTotals();
}

/**
 * Toggles visibility of an identifier field when checkbox is clicked
 */
function toggleIdentifierField(checkbox, fieldKey) {
  const row = checkbox.closest('.product-item-row');
  const container = row.querySelector(`.field-container-${fieldKey}`);
  const label = checkbox.closest('label');

  if (checkbox.checked) {
    container.classList.remove('hidden');
    label.classList.add('bg-indigo-50/60', 'border-indigo-300', 'text-indigo-900', 'font-bold');
    label.classList.remove('bg-white', 'border-slate-200', 'text-slate-500');
    const input = container.querySelector('input');
    if (input) input.focus();
  } else {
    container.classList.add('hidden');
    label.classList.remove('bg-indigo-50/60', 'border-indigo-300', 'text-indigo-900', 'font-bold');
    label.classList.add('bg-white', 'border-slate-200', 'text-slate-500');
  }
}

/**
 * 1-Click Preset applier for a specific row
 */
function applyPresetToRow(btn, mode) {
  const row = btn.closest('.product-item-row');
  const chkImei1 = row.querySelector('.toggle-imei1');
  const chkImei2 = row.querySelector('.toggle-imei2');
  const chkSn = row.querySelector('.toggle-sn');
  const chkSku = row.querySelector('.toggle-sku');

  if (mode === 'dual-imei') {
    chkImei1.checked = true;
    chkImei2.checked = true;
    chkSn.checked = true;
    chkSku.checked = false;
  } else if (mode === 'single-imei') {
    chkImei1.checked = true;
    chkImei2.checked = false;
    chkSn.checked = true;
    chkSku.checked = false;
  } else if (mode === 'accessory') {
    chkImei1.checked = false;
    chkImei2.checked = false;
    chkSn.checked = false;
    chkSku.checked = true;
  } else if (mode === 'all') {
    chkImei1.checked = true;
    chkImei2.checked = true;
    chkSn.checked = true;
    chkSku.checked = true;
  }

  [
    { chk: chkImei1, key: 'imei1' },
    { chk: chkImei2, key: 'imei2' },
    { chk: chkSn, key: 'sn' },
    { chk: chkSku, key: 'sku' }
  ].forEach(item => toggleIdentifierField(item.chk, item.key));
}

/**
 * Handles selection from the Quick Preset Device Dropdown
 */
function onPresetDeviceSelected(selectEl) {
  const index = selectEl.value;
  if (index === '') return;

  const preset = SWAPEE_INVENTORY_PRESETS[index];
  if (!preset) return;

  const row = selectEl.closest('.product-item-row');
  row.querySelector('.item-name').value = preset.name;
  row.querySelector('.item-price').value = preset.price.toFixed(2);

  // Set values
  row.querySelector('.item-imei1').value = preset.imei1;
  row.querySelector('.item-imei2').value = preset.imei2;
  row.querySelector('.item-sn').value = preset.sn;
  row.querySelector('.item-sku').value = preset.sku;

  // Apply checkboxes
  applyPresetToRow(selectEl, preset.type === 'accessory' ? 'accessory' : 'dual-imei');
  calculateTotals();
  showToast(`Pre-filled: ${preset.name}`, 'info');

  // Reset selector back to prompt
  selectEl.value = '';
}

/**
 * Quick Barcode Scanner for individual IMEI/SKU field
 */
function startFieldBarcodeScan(btn, targetInputClass) {
  const row = btn.closest('.product-item-row');
  const input = row.querySelector(`.${targetInputClass}`);

  // Switch to QR/Barcode tab with notification
  switchTab('scan-qr');
  showToast('Point camera at the barcode/IMEI to scan directly!', 'info');

  // Store target input in memory for scanner
  window.activeBarcodeTargetInput = input;
}

function removeProductItemRow(button) {
  const row = button.closest('.product-item-row');
  row.remove();
  const container = document.getElementById('product-items-list');
  Array.from(container.children).forEach((child, idx) => {
    const badge = child.querySelector('.text-xs.font-bold.font-mono');
    if (badge) badge.textContent = idx + 1;
    const title = child.querySelector('.text-xs.font-black');
    if (title) title.textContent = `Product Item #${idx + 1}`;
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

  const discountedSubtotal = Math.max(0, subtotal - discount);
  const taxAmount = (discountedSubtotal * taxRate) / 100;
  const grandTotal = Math.max(0, discountedSubtotal + taxAmount);

  const curr = appSettings.currency;
  document.getElementById('summary-subtotal').textContent = `${curr}${subtotal.toFixed(2)}`;
  document.getElementById('summary-discount').textContent = `-${curr}${discount.toFixed(2)}`;
  document.getElementById('summary-tax').textContent = `${curr}${taxAmount.toFixed(2)}`;
  document.getElementById('summary-grand-total').textContent = `${curr}${grandTotal.toFixed(2)}`;

  return {
    subtotal,
    discount,
    taxRate,
    taxAmount,
    grandTotal
  };
}

/**
 * Loads the exact sample receipt matching the user's photo
 */
function loadSWAPEESampleReceipt() {
  document.getElementById('receipt-number').value = 'UC664413';
  document.getElementById('order-cashier').value = 'ASHA';
  document.getElementById('cust-name').value = 'ASHER';
  document.getElementById('cust-no').value = '758D56-3';
  document.getElementById('cust-address').value = 'MUSEUM, YORK Y01 7FR';
  document.getElementById('cust-phone').value = '+44 7700 900123';
  document.getElementById('order-date').value = '2024-11-23';
  
  document.getElementById('payment-method').value = 'VISA';
  document.getElementById('trans-acct').value = '****3471';
  document.getElementById('trans-auth').value = '465116';
  document.getElementById('trans-entry').value = 'CHIP READ';
  document.getElementById('trans-aid').value = 'A000004123645';
  document.getElementById('payment-status').value = 'Paid';
  
  document.getElementById('calc-discount').value = '20.00';
  document.getElementById('calc-tax-rate').value = '20';

  const container = document.getElementById('product-items-list');
  container.innerHTML = '';

  // Item 1: Pixel 7a with selectable IMEI 1, IMEI 2, and S/N active
  addProductItemRow(
    'Pixel 7a Charcoal 128GB (Unlocked)',
    1,
    312.88,
    '',
    '353529407882886',
    '353529407882894',
    '39251JEHN06086',
    { imei1: true, imei2: true, sn: true, sku: false }
  );

  // Item 2: Malvik Charger with selectable SKU active
  addProductItemRow(
    'MALVIK PRO 30W',
    1,
    27.90,
    '511',
    '',
    '',
    '',
    { imei1: false, imei2: false, sn: false, sku: true }
  );

  calculateTotals();
  showToast('Loaded SWAPEE Pixel 7a sample receipt data!', 'info');
}

/* ==========================================================================
   CREATE & SAVE RECEIPT
   ========================================================================== */

function handleCreateReceipt(e) {
  e.preventDefault();

  const receiptNo = document.getElementById('receipt-number').value.trim() || generateReceiptNumber();
  const cashier = document.getElementById('order-cashier').value.trim() || 'ASHA';
  const custName = document.getElementById('cust-name').value.trim();
  const custNo = document.getElementById('cust-no').value.trim() || 'N/A';
  const custAddress = document.getElementById('cust-address').value.trim() || 'N/A';
  const custPhone = document.getElementById('cust-phone').value.trim();
  const orderDate = document.getElementById('order-date').value || new Date().toISOString().slice(0, 10);

  const paymentMethod = document.getElementById('payment-method').value;
  const paymentStatus = document.getElementById('payment-status').value;
  const acct = document.getElementById('trans-acct').value.trim();
  const authCode = document.getElementById('trans-auth').value.trim();
  const entryMethod = document.getElementById('trans-entry').value.trim();
  const aid = document.getElementById('trans-aid').value.trim();
  const warranty = document.getElementById('order-warranty').value.trim();

  // Collect Product Line Items with their SELECTABLE fields
  const itemRows = document.querySelectorAll('.product-item-row');
  const items = [];

  itemRows.forEach(row => {
    const name = row.querySelector('.item-name')?.value.trim();
    const qty = parseInt(row.querySelector('.item-qty')?.value, 10) || 1;
    const price = parseFloat(row.querySelector('.item-price')?.value) || 0;

    // Check which fields the user selected to include
    const useImei1 = row.querySelector('.toggle-imei1')?.checked;
    const useImei2 = row.querySelector('.toggle-imei2')?.checked;
    const useSn = row.querySelector('.toggle-sn')?.checked;
    const useSku = row.querySelector('.toggle-sku')?.checked;

    const imei1 = useImei1 ? (row.querySelector('.item-imei1')?.value.trim() || '') : '';
    const imei2 = useImei2 ? (row.querySelector('.item-imei2')?.value.trim() || '') : '';
    const sn = useSn ? (row.querySelector('.item-sn')?.value.trim() || '') : '';
    const sku = useSku ? (row.querySelector('.item-sku')?.value.trim() || '') : '';

    if (name) {
      items.push({
        name,
        qty,
        price,
        total: qty * price,
        sku,
        imei1,
        imei2,
        sn,
        selectedFields: {
          imei1: useImei1,
          imei2: useImei2,
          sn: useSn,
          sku: useSku
        }
      });
    }
  });

  if (items.length === 0) {
    showToast('Please add at least one product to the receipt!', 'error');
    return;
  }

  const totals = calculateTotals();

  const newOrder = {
    id: receiptNo,
    date: new Date(orderDate).toISOString(),
    cashier,
    customer: {
      id: custName,
      customerNo: custNo,
      name: custName,
      address: custAddress,
      phone: custPhone
    },
    items,
    pricing: totals,
    payment: {
      method: paymentMethod,
      status: paymentStatus,
      acct,
      authCode,
      entryMethod,
      aid
    },
    warranty,
    createdAt: new Date().toISOString()
  };

  orders.unshift(newOrder);
  saveOrders(orders);

  if (typeof confetti === 'function') {
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
  }

  showToast(`SWAPEE Receipt ${newOrder.id} generated!`, 'success');
  openReceiptModal(newOrder);
  resetSaleForm();
}

/* ==========================================================================
   VIRTUAL RECEIPT RENDERING (AUTHENTIC THERMAL FORMAT)
   ========================================================================== */

function openReceiptModal(order, isViaQR = false) {
  currentViewingOrder = order;
  const curr = appSettings.currency;

  const actionsBar = document.getElementById('receipt-modal-actions-bar');
  const verifyBanner = document.getElementById('receipt-qr-verify-banner');

  if (isViaQR || isCustomerVerificationMode) {
    if (actionsBar) actionsBar.classList.add('hidden');
    if (verifyBanner) verifyBanner.classList.remove('hidden');
  } else {
    if (actionsBar) actionsBar.classList.remove('hidden');
    if (verifyBanner) verifyBanner.classList.add('hidden');
  }

  // Header & IDs
  document.getElementById('receipt-view-id').textContent = order.id;
  document.getElementById('receipt-view-date').textContent = formatUKDate(order.date);
  document.getElementById('receipt-view-cashier').textContent = order.cashier || 'ASHA';

  // Customer
  document.getElementById('receipt-cust-no').textContent = order.customer.customerNo || 'N/A';
  document.getElementById('receipt-cust-name').textContent = order.customer.name || order.customer.id || 'N/A';
  document.getElementById('receipt-cust-address').textContent = order.customer.address || 'N/A';

  // Product Line Items Render
  const itemsContainer = document.getElementById('receipt-items-container');
  itemsContainer.innerHTML = '';

  order.items.forEach(item => {
    const itemBlock = document.createElement('div');
    itemBlock.className = 'space-y-0.5 leading-tight';

    let detailsHtml = '';
    if (item.imei1) detailsHtml += `<div class="item-detail-row flex justify-between items-center text-[14px] sm:text-[15px] font-black"><span class="text-black font-black">IMEI1:</span><span class="font-black ml-2 font-mono tracking-wide">${escapeHTML(item.imei1)}</span></div>`;
    if (item.imei2) detailsHtml += `<div class="item-detail-row flex justify-between items-center text-[14px] sm:text-[15px] font-black"><span class="text-black font-black">IMEI2:</span><span class="font-bold ml-2 font-mono tracking-wide">${escapeHTML(item.imei2)}</span></div>`;
    if (item.sn) detailsHtml += `<div class="item-detail-row flex justify-between items-center text-[14px] sm:text-[15px] font-black"><span class="text-black font-black">S/N:</span><span class="font-bold ml-2 font-mono tracking-wide">${escapeHTML(item.sn)}</span></div>`;
    if (item.sku) detailsHtml += `<div class="item-detail-row flex justify-between items-center text-[14px] sm:text-[15px] font-black"><span class="text-black font-black">SKU:</span><span class="font-bold ml-2 font-mono tracking-wide">${escapeHTML(item.sku)}</span></div>`;

    itemBlock.innerHTML = `
      <div class="flex justify-between items-baseline font-black text-[15px] sm:text-[16px] leading-tight">
        <div class="min-w-0 pr-1">
          <span>${escapeHTML(item.name)}</span>
          <span class="text-xs font-bold text-black ml-1">(x${item.qty})</span>
        </div>
        <span class="shrink-0 whitespace-nowrap ml-2">${curr}${item.price.toFixed(2)}</span>
      </div>
      ${detailsHtml ? `<div class="text-[14px] sm:text-[15px] pl-1 font-mono font-bold space-y-0.5 leading-tight">${detailsHtml}</div>` : ''}
    `;
    itemsContainer.appendChild(itemBlock);
  });

  // Calculations
  document.getElementById('receipt-subtotal').textContent = `${curr}${order.pricing.subtotal.toFixed(2)}`;

  const discountRow = document.getElementById('receipt-discount-row');
  if (order.pricing.discount > 0) {
    discountRow.classList.remove('hidden');
    document.getElementById('receipt-discount').textContent = `${curr}${order.pricing.discount.toFixed(2)}`;
  } else {
    discountRow.classList.add('hidden');
  }

  document.getElementById('receipt-tax-label').textContent = `TAX (${order.pricing.taxRate || 20}%)`;
  document.getElementById('receipt-tax').textContent = `${curr}${order.pricing.taxAmount.toFixed(2)}`;
  document.getElementById('receipt-grand-total').textContent = `${curr}${order.pricing.grandTotal.toFixed(2)}`;

  // Transaction
  document.getElementById('receipt-pay-method').textContent = order.payment.method || 'VISA';
  document.getElementById('receipt-trans-acct').textContent = order.payment.acct || '****3471';
  document.getElementById('receipt-trans-auth').textContent = order.payment.authCode || '465116';
  document.getElementById('receipt-trans-entry').textContent = order.payment.entryMethod || 'CHIP READ';
  document.getElementById('receipt-trans-aid').textContent = order.payment.aid || 'A000004123645';

  // Warranty
  document.getElementById('receipt-warranty-text').textContent = order.warranty || appSettings.footer;

  // Render Scannable QR Code
  generateReceiptQRCode(order);

  // Reveal Modal
  document.getElementById('receipt-modal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeReceiptModal() {
  if (isCustomerVerificationMode) return;
  document.getElementById('receipt-modal').classList.add('hidden');
  currentViewingOrder = null;
}

/**
 * Direct print receipt trigger
 */
function directPrintReceipt(orderId) {
  const order = orders.find(o => o.id === orderId) || currentViewingOrder;
  if (!order) return;
  openReceiptModal(order);
  setTimeout(() => {
    window.print();
  }, 200);
}

/**
 * Download QR Code badge image directly from Dashboard / History table
 */
function downloadQRCodeForOrder(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  const tempContainer = document.createElement('div');
  const receiptUrl = `${window.location.origin}${window.location.pathname}?receipt=${encodeURIComponent(order.id)}`;

  new QRCode(tempContainer, {
    text: receiptUrl,
    width: 260,
    height: 260,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });

  setTimeout(() => {
    const canvas = tempContainer.querySelector('canvas') || tempContainer.querySelector('img');
    if (!canvas) {
      showToast('Error generating QR', 'error');
      return;
    }
    const dataUrl = canvas.tagName === 'CANVAS' ? canvas.toDataURL('image/png') : canvas.src;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `SWAPEE_QR_${order.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`QR badge for ${order.id} downloaded!`, 'success');
  }, 120);
}

/**
 * Generate QR code containing the verified URL
 */
function generateReceiptQRCode(order) {
  const qrContainer = document.getElementById('receipt-qrcode-canvas');
  qrContainer.innerHTML = '';

  // Clean, lightweight verification URL (Short length produces large, chunky QR blocks for perfect thermal readability)
  const receiptUrl = `${window.location.origin}${window.location.pathname}?receipt=${encodeURIComponent(order.id)}`;

  try {
    // Generate at 240x240 with Level L error correction:
    // Enforces low module density (Version 3) so thermal dots never bleed and cameras scan instantly
    new QRCode(qrContainer, {
      text: receiptUrl,
      width: 240,
      height: 240,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.L
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
  a.download = `SWAPEE_QR_${currentViewingOrder.id}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('SWAPEE QR code image saved!', 'success');
}

/* ==========================================================================
   WHATSAPP & SHARING
   ========================================================================== */

function shareViaWhatsApp() {
  if (!currentViewingOrder) return;
  const order = currentViewingOrder;
  const curr = appSettings.currency;
  const receiptUrl = `${window.location.origin}${window.location.pathname}?receipt=${encodeURIComponent(order.id)}`;

  const itemsSummary = order.items.map(i => {
    let s = `• ${i.name} (x${i.qty}) - ${curr}${i.price.toFixed(2)}`;
    if (i.imei1) s += ` [IMEI: ${i.imei1}]`;
    return s;
  }).join('\n');

  const text = `*SWAPEE Digital Receipt (Invoice)*\n` +
    `4 South Clerk Street, Edinburgh EH8 9JE\n` +
    `Tel: +44 131 662 9955\n` +
    `--------------------------------\n` +
    `*Receipt No:* ${order.id}\n` +
    `*Date:* ${formatUKDate(order.date)}\n` +
    `*Cashier:* ${order.cashier || 'ASHA'}\n` +
    `*Customer:* ${order.customer.name} (No: ${order.customer.customerNo || 'N/A'})\n\n` +
    `*Purchased Items:*\n${itemsSummary}\n\n` +
    `*Total Paid:* ${curr}${order.pricing.grandTotal.toFixed(2)}\n` +
    `*Payment Method:* ${order.payment.method} (${order.payment.acct || '****'})\n` +
    `--------------------------------\n` +
    `*Verify & View Digital Receipt with QR:*\n` +
    `${receiptUrl}\n\n` +
    `Thank you for choosing SWAPEE!`;

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
    showToast('Receipt link copied to clipboard!', 'success');
  }).catch(() => {
    prompt('Receipt link:', receiptUrl);
  });
}

/* ==========================================================================
   QR SCANNER ENGINE
   ========================================================================== */

function startQRScanner() {
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
    () => {}
  ).then(() => {
    currentScannerRunning = true;
    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    showToast('SWAPEE camera scanner active', 'info');
  }).catch(err => {
    console.error('Failed to start camera:', err);
    placeholder.classList.remove('hidden');
    laserBar.classList.add('hidden');
    showToast('Could not access camera. Try uploading an image file instead.', 'error');
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
  playSuccessBeep();
  stopQRScanner();

  // If scanner was triggered for a specific IMEI/SKU field
  if (window.activeBarcodeTargetInput) {
    window.activeBarcodeTargetInput.value = decodedText.trim();
    showToast(`Scanned into field: ${decodedText.trim()}`, 'success');
    window.activeBarcodeTargetInput = null;
    switchTab('new-sale');
    return;
  }

  processScannedPayload(decodedText);
}

function handleQRImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!html5QrScannerInstance) {
    html5QrScannerInstance = new Html5Qrcode('qr-reader');
  }

  showToast('Scanning QR code from image...', 'info');

  html5QrScannerInstance.scanFile(file, true)
    .then(decodedText => {
      playSuccessBeep();
      processScannedPayload(decodedText);
    })
    .catch(err => {
      console.error('Failed to decode image', err);
      showToast('No valid QR code detected in this photo.', 'error');
    });

  e.target.value = '';
}

function handleManualLookup() {
  const input = document.getElementById('manual-receipt-id');
  const code = input.value.trim().toUpperCase();
  if (!code) {
    showToast('Please enter a Receipt #', 'error');
    return;
  }
  processScannedPayload(code);
}

function processScannedPayload(payload) {
  const feedback = document.getElementById('scan-feedback');
  const feedbackText = document.getElementById('scan-feedback-text');

  let targetId = '';

  if (payload.includes('receipt=')) {
    try {
      const url = new URL(payload);
      targetId = url.searchParams.get('receipt') || '';
    } catch {
      const match = payload.match(/receipt=([^&]+)/);
      if (match) targetId = decodeURIComponent(match[1]);
    }
  } else {
    targetId = payload.trim();
  }

  const foundOrder = orders.find(o => o.id.toUpperCase() === targetId.toUpperCase());

  if (foundOrder) {
    feedback.classList.remove('hidden', 'bg-rose-50', 'border-rose-200', 'text-rose-800');
    feedback.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-800');
    feedbackText.innerHTML = `<strong>Receipt Verified:</strong> ${foundOrder.id} for <strong>${foundOrder.customer.name}</strong>`;
    showToast(`SWAPEE Receipt ${foundOrder.id} verified!`, 'success');

    setTimeout(() => {
      openReceiptModal(foundOrder, true);
    }, 600);
  } else {
    feedback.classList.remove('hidden', 'bg-emerald-50', 'border-emerald-200', 'text-emerald-800');
    feedback.classList.add('bg-rose-50', 'border-rose-200', 'text-rose-800');
    feedbackText.innerHTML = `No SWAPEE receipt found for "<strong>${escapeHTML(targetId)}</strong>".`;
    showToast(`Receipt ${targetId} not found`, 'error');
  }
}

/* ==========================================================================
   ORDERS DIRECTORY & HISTORY
   ========================================================================== */

function renderOrdersHistory() {
  const tbody = document.getElementById('orders-table-body');
  const emptyState = document.getElementById('orders-empty-state');
  const search = (document.getElementById('order-search-input')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('order-status-filter')?.value || 'ALL';
  const countBadge = document.getElementById('filtered-count');
  const navBadge = document.getElementById('nav-orders-count');

  if (navBadge) navBadge.textContent = orders.length;

  const filtered = orders.filter(order => {
    if (statusFilter !== 'ALL' && order.payment.status !== statusFilter) return false;
    if (search) {
      const inId = order.id.toLowerCase().includes(search);
      const inCust = (order.customer.name || '').toLowerCase().includes(search);
      const inItems = order.items.some(i => 
        i.name.toLowerCase().includes(search) || 
        (i.imei1 && i.imei1.toLowerCase().includes(search)) ||
        (i.sn && i.sn.toLowerCase().includes(search)) ||
        (i.sku && i.sku.toLowerCase().includes(search))
      );
      return inId || inCust || inItems;
    }
    return true;
  });

  if (countBadge) countBadge.textContent = `${filtered.length} of ${orders.length} records`;

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
    tr.className = 'hover:bg-slate-50 transition font-thermal text-xs';

    const itemsSummary = order.items.map(i => `${i.name} (x${i.qty})`).join(', ');

    tr.innerHTML = `
      <td class="py-3.5 px-4 font-bold text-slate-900">
        <button onclick="handleViewReceiptById('${order.id}')" class="hover:underline flex items-center gap-1.5 font-bold">
          <i data-lucide="receipt" class="w-3.5 h-3.5 text-slate-500"></i>
          <span>${order.id}</span>
        </button>
      </td>
      <td class="py-3.5 px-4 text-slate-500 whitespace-nowrap">
        ${formatUKDate(order.date)}
      </td>
      <td class="py-3.5 px-4 font-bold text-slate-900 uppercase">
        ${escapeHTML(order.customer.name)}
        <span class="block text-[10px] font-normal text-slate-400 font-mono">No: ${escapeHTML(order.customer.customerNo || 'N/A')}</span>
      </td>
      <td class="py-3.5 px-4 max-w-xs truncate text-slate-700">
        <span class="inline-block px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 font-bold text-[10px] mr-1">${order.items.length} item${order.items.length > 1 ? 's' : ''}</span>
        ${escapeHTML(itemsSummary)}
      </td>
      <td class="py-3.5 px-4 text-right font-bold text-slate-900">
        ${curr}${order.pricing.grandTotal.toFixed(2)}
      </td>
      <td class="py-3.5 px-4 text-center">
        <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
          order.payment.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
        }">
          ${order.payment.status}
        </span>
      </td>
      <td class="py-3.5 px-4 text-center whitespace-nowrap">
        <div class="inline-flex items-center gap-1.5 shrink-0 flex-nowrap whitespace-nowrap">
          <button onclick="directPrintReceipt('${order.id}')" title="Direct Print Receipt" class="px-2 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-black font-thermal font-bold text-xs flex items-center gap-1 shadow-xs transition">
            <i data-lucide="printer" class="w-3.5 h-3.5"></i> Print
          </button>
          <button onclick="downloadQRCodeForOrder('${order.id}')" title="Save QR (.PNG)" class="px-2 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-thermal font-bold text-xs flex items-center gap-1 transition">
            <i data-lucide="download" class="w-3.5 h-3.5"></i> QR
          </button>
          <button onclick="handleViewReceiptById('${order.id}')" title="View Full Receipt" class="p-1.5 rounded-lg text-slate-700 hover:text-black hover:bg-slate-200 transition">
            <i data-lucide="eye" class="w-4 h-4"></i>
          </button>
          <button onclick="handleWhatsAppDirect('${order.id}')" title="Send WhatsApp" class="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition">
            <i data-lucide="message-square" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteOrderRecord('${order.id}')" title="Delete" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition">
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
  if (order) openReceiptModal(order);
  else showToast(`Receipt ${orderId} not found`, 'error');
}

function handleWhatsAppDirect(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (order) {
    currentViewingOrder = order;
    shareViaWhatsApp();
  }
}

function deleteOrderRecord(orderId) {
  if (confirm(`Delete receipt ${orderId}?`)) {
    orders = orders.filter(o => o.id !== orderId);
    saveOrders(orders);
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
    container.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs font-mono">No receipts issued yet.</div>`;
    return;
  }

  const curr = appSettings.currency;
  container.innerHTML = '';

  recent.forEach(order => {
    const div = document.createElement('div');
    div.className = 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition';
    div.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full overflow-hidden bg-black p-0.5 shrink-0">
          <img src="logo.svg" alt="SWAPEE Logo" class="w-full h-full object-contain" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-900 text-sm uppercase font-thermal">${escapeHTML(order.customer.name)}</span>
            <span class="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">${order.id}</span>
          </div>
          <p class="text-xs text-slate-500 font-mono mt-0.5">
            ${order.items.length} item${order.items.length > 1 ? 's' : ''} • ${formatUKDate(order.date)}
          </p>
        </div>
      </div>
      <div class="flex items-center justify-between sm:justify-end gap-3 flex-nowrap whitespace-nowrap">
        <span class="font-mono font-black text-slate-900 text-sm whitespace-nowrap shrink-0">${curr}${order.pricing.grandTotal.toFixed(2)}</span>
        <div class="flex items-center gap-1.5 shrink-0 flex-nowrap whitespace-nowrap">
          <button onclick="directPrintReceipt('${order.id}')" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-black text-white font-thermal font-bold text-xs flex items-center gap-1 shadow-xs transition whitespace-nowrap" title="Direct Print Receipt">
            <i data-lucide="printer" class="w-3.5 h-3.5"></i> Print
          </button>
          <button onclick="downloadQRCodeForOrder('${order.id}')" class="px-2 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-thermal font-bold text-xs flex items-center gap-1 transition whitespace-nowrap" title="Download QR (.PNG)">
            <i data-lucide="download" class="w-3.5 h-3.5"></i> QR
          </button>
          <button onclick="handleViewReceiptById('${order.id}')" class="px-2 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-thermal font-bold text-xs transition whitespace-nowrap">
            View
          </button>
        </div>
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
  if (isCustomerVerificationMode) return;
  document.getElementById('setting-store-name').value = appSettings.name;
  document.getElementById('setting-store-tagline').value = appSettings.tagline;
  document.getElementById('setting-vat').value = appSettings.vatNo;
  document.getElementById('setting-company-no').value = appSettings.companyNo;
  document.getElementById('setting-currency').value = appSettings.currency;
  document.getElementById('setting-phone').value = appSettings.phone;
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
    name: document.getElementById('setting-store-name').value.trim() || 'SWAPEE',
    tagline: document.getElementById('setting-store-tagline').value.trim() || 'SINCE 2002',
    vatNo: document.getElementById('setting-vat').value.trim(),
    companyNo: document.getElementById('setting-company-no').value.trim(),
    currency: document.getElementById('setting-currency').value.trim() || '£',
    phone: document.getElementById('setting-phone').value.trim(),
    address: document.getElementById('setting-address').value.trim(),
    footer: document.getElementById('setting-footer').value.trim(),
    taxRate: 20
  };

  saveSettings(updated);
  closeSettingsModal();
}

function applySettingsToUI() {
  document.getElementById('nav-shop-name').textContent = appSettings.name;
}

/* ==========================================================================
   EXPORTS & BACKUP
   ========================================================================== */

function exportOrdersToCSV() {
  if (orders.length === 0) {
    showToast('No orders to export!', 'error');
    return;
  }

  const headers = ['Receipt No', 'Date', 'Cashier', 'Customer Name', 'Customer No', 'Address', 'Products & Serials', 'Payment Method', 'Card Acct', 'Total (£)'];
  const csvRows = [headers.join(',')];

  orders.forEach(o => {
    const itemsSummary = o.items.map(i => `${i.name} (x${i.qty})${i.imei1 ? ' [IMEI:'+i.imei1+']' : ''}`).join('; ');
    const row = [
      `"${o.id}"`,
      `"${o.date}"`,
      `"${cleanCSV(o.cashier || 'ASHA')}"`,
      `"${cleanCSV(o.customer.name)}"`,
      `"${cleanCSV(o.customer.customerNo || '')}"`,
      `"${cleanCSV(o.customer.address || '')}"`,
      `"${cleanCSV(itemsSummary)}"`,
      `"${o.payment.method}"`,
      `"${o.payment.acct || ''}"`,
      o.pricing.grandTotal.toFixed(2)
    ];
    csvRows.push(row.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SWAPEE_receipts_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('SWAPEE receipts exported to CSV!', 'success');
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
  a.download = `SWAPEE_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('SWAPEE database backup downloaded!', 'success');
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
        if (data.settings) saveSettings(data.settings);
        showToast(`Restored ${data.orders.length} SWAPEE receipts!`, 'success');
      } else {
        showToast('Invalid backup file format.', 'error');
      }
    } catch (err) {
      showToast('Error parsing file.', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/* ==========================================================================
   ROUTING & UTILITIES
   ========================================================================== */

let isCustomerVerificationMode = false;

function handleDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const receiptId = params.get('receipt');

  if (receiptId) {
    let match = orders.find(o => o.id.toUpperCase() === receiptId.toUpperCase());

    // Check if encoded payload &d= exists in URL for universal offline verification
    const encodedData = params.get('d');
    if (encodedData && !match) {
      try {
        const decoded = JSON.parse(atob(decodeURIComponent(encodedData)));
        if (decoded && decoded.id) {
          match = {
            id: decoded.id,
            date: decoded.dt || new Date().toISOString(),
            cashier: decoded.ca || 'ASHA',
            customer: {
              name: decoded.c || 'CUSTOMER',
              customerNo: decoded.cn || 'N/A',
              address: decoded.a || 'Edinburgh'
            },
            items: (decoded.itm || []).map(i => ({
              name: i.n,
              qty: i.q || 1,
              price: i.p || 0,
              total: (i.q || 1) * (i.p || 0),
              imei1: i.i1 || '',
              imei2: i.i2 || '',
              sn: i.sn || '',
              sku: i.sku || ''
            })),
            pricing: {
              grandTotal: decoded.t || 0,
              subtotal: decoded.t || 0,
              discount: 0,
              taxRate: 20,
              taxAmount: (decoded.t || 0) * 0.2
            },
            payment: {
              method: 'VISA',
              status: 'Paid'
            }
          };
          orders.unshift(match);
          saveOrders(orders);
        }
      } catch (e) {
        console.warn('Could not parse encoded data', e);
      }
    }

    // Enter Strict Customer Verification Mode (No redirects, no link editing, no browsing other pages)
    enterCustomerVerificationMode(match, receiptId);
  }
}

function enterCustomerVerificationMode(order, requestedId) {
  isCustomerVerificationMode = true;

  // Add lockdown class to body (completely hides header, main, action options)
  document.body.classList.add('verification-mode');

  // Prevent back navigation or escaping to admin
  window.history.pushState(null, '', window.location.href);
  window.addEventListener('popstate', () => {
    window.history.pushState(null, '', window.location.href);
  });

  // Block admin functions
  window.switchTab = () => false;
  window.openSettingsModal = () => false;
  window.closeReceiptModal = () => false;
  window.resetSaleForm = () => false;
  window.wipeAndResetAllData = () => false;

  if (order) {
    // Open the authentic receipt modal in QR verification mode:
    // This displays the green pop-up banner "This is an authentic invoice!"
    // and COMPLETELY REMOVES the top action bar [Print, Save QR, WhatsApp, Link, X]
    openReceiptModal(order, true);
  } else {
    showToast(`Invoice ${requestedId || ''} could not be located`, 'error');
  }
}

/**
 * Format date in UK thermal style (DD/MM/YYYY)
 */
function formatUKDate(isoString) {
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
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
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {}
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `p-3.5 px-4 rounded-xl shadow-xl border text-xs font-bold font-thermal flex items-center gap-2.5 transition transform duration-200 pointer-events-auto ${
    type === 'success' ? 'bg-black text-emerald-400 border-slate-800' :
    type === 'error' ? 'bg-rose-950 text-rose-200 border-rose-800' :
    'bg-black text-white border-slate-800'
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
