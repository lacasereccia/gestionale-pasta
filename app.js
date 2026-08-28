const initialState = {
  products: [
    { id: 1, name: 'Cappelletti piccoli', category: 'Pasta fresca', unit: 'kg', storageType: 'fresh' },
    { id: 2, name: 'Passatelli', category: 'Pasta fresca', unit: 'kg', storageType: 'fresh' },
    { id: 3, name: 'Tagliatelle senza glutine', category: 'Senza glutine', unit: 'vaschette', storageType: 'fresh' },
    { id: 4, name: 'Lasagne gastronomia', category: 'Gastronomia', unit: 'vaschette', storageType: 'fresh' }
  ],
  orders: [
    { id: 'ORD-104', arrival: '2026-08-28', product: 'Cappelletti piccoli', quantity: 8, unit: 'kg', status: 'Da preparare', notes: '' },
    { id: 'ORD-103', arrival: '2026-08-27', product: 'Tagliatelle senza glutine', quantity: 24, unit: 'vaschette', status: 'Inviato', notes: '' }
  ],
  lots: [
    { id: 1, product: 'Cappelletti piccoli', location: 'marotta', production: '2026-08-27', expiry: '2026-08-29', quantity: 18, unit: 'kg' },
    { id: 2, product: 'Tagliatelle senza glutine', location: 'senigallia', production: '2026-08-25', expiry: '2026-08-28', quantity: 16, unit: 'vaschette' },
    { id: 3, product: 'Lasagne gastronomia', location: 'senigallia', production: '2026-08-24', expiry: '2026-08-27', quantity: 6, unit: 'vaschette' },
    { id: 4, product: 'Passatelli', location: 'marotta', production: '2026-08-26', expiry: '2026-08-30', quantity: 9, unit: 'kg' }
  ],
  employees: [
    { id: 1, name: 'Personale' }
  ],
  workHours: [],
  temperatures: [],
  cleaningChecks: [],
  receipts: [],
  lastInventory: null
};

let state = JSON.parse(localStorage.getItem('pastificio-state') || 'null') || initialState;
if (!Array.isArray(state.products)) state.products = initialState.products;
if (!Array.isArray(state.pendingItems)) state.pendingItems = [];
if (!Array.isArray(state.inventoryHistory)) state.inventoryHistory = [];
if (!Array.isArray(state.stockReports)) state.stockReports = [];
if (!Array.isArray(state.employees) || !state.employees.length) state.employees = initialState.employees;
if (!Array.isArray(state.workHours)) state.workHours = [];
if (!Array.isArray(state.temperatures)) state.temperatures = [];
if (!Array.isArray(state.cleaningChecks)) state.cleaningChecks = [];
if (!Array.isArray(state.receipts)) state.receipts = [];
const normalizedName = value => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('it-IT');
const canonicalProductName = value => state.products.find(product => normalizedName(product.name) === normalizedName(value))?.name || String(value || '').trim().replace(/\s+/g, ' ');
state.lots.forEach(lot => { lot.product = canonicalProductName(lot.product); });
state.orders.forEach(order => order.items?.forEach(item => { item.product = canonicalProductName(item.product); }));
state.stockReports.forEach(report => { report.product = canonicalProductName(report.product); });
state.pendingItems.forEach(item => { item.product = canonicalProductName(item.product); });
state.inventoryHistory.forEach(record => record.items?.forEach(item => { item.product = canonicalProductName(item.product); }));
state.orders.forEach(order => {
  if (!Array.isArray(order.items)) {
    order.items = [{ id: 1, product: order.product, quantity: order.quantity, unit: order.unit, production: order.production, expiry: order.expiry, prepared: false }];
  }
  order.items.forEach(item => { item.product = canonicalProductName(item.product); });
});
let selectedLocation = 'all';
let inventorySearch = '';
let openProductCategory = null;
const today = new Date();
today.setHours(12, 0, 0, 0);
const day = (date) => new Date(`${date}T12:00:00`);
const iso = (date) => date.toISOString().slice(0, 10);
let calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedOrderDay = iso(today);
let inventoryCalendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedInventoryDay = iso(today);
let selectedEmployeeId = state.employees[0].id;
let hoursMonth = iso(today).slice(0, 7);
let pendingProtectedView = null;
const formatDate = (date) => day(date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
const labelLocation = (location) => location === 'marotta' ? 'Marotta' : 'Senigallia';
let cloudSaveTimer = null;
let cloudPollTimer = null;
const onlineApp = () => location.protocol === 'https:' || location.protocol === 'http:';
const copyInitialState = () => JSON.parse(JSON.stringify(initialState));
const normalizeSharedState = (value) => {
  const next = { ...copyInitialState(), ...(value || {}) };
  ['products', 'orders', 'lots', 'employees', 'workHours', 'temperatures', 'cleaningChecks', 'receipts', 'pendingItems', 'inventoryHistory', 'stockReports'].forEach(key => { if (!Array.isArray(next[key])) next[key] = []; });
  if (!next.employees.length) next.employees = copyInitialState().employees;
  return next;
};
const uploadSharedState = async () => {
  if (!onlineApp()) return;
  try { await fetch('/api/state', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(state) }); } catch { /* The local copy remains available until the connection returns. */ }
};
const save = () => {
  localStorage.setItem('pastificio-state', JSON.stringify(state));
  if (!onlineApp()) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(uploadSharedState, 450);
};
async function loadSharedState() {
  if (!onlineApp()) return;
  try {
    const response = await fetch('/api/state', { cache: 'no-store' });
    if (response.status === 404) { uploadSharedState(); return; }
    if (!response.ok) return;
    const sharedState = normalizeSharedState(await response.json());
    if (JSON.stringify(sharedState) !== JSON.stringify(state)) {
      state = sharedState;
      localStorage.setItem('pastificio-state', JSON.stringify(state));
      if (!document.querySelector('#appShell').classList.contains('hidden')) render();
    }
  } catch { /* The app continues to work from its local copy if it is offline. */ }
}
const visibleLots = () => state.lots.filter(lot => selectedLocation === 'all' || lot.location === selectedLocation).filter(lot => !lot.availableOn || day(lot.availableOn) <= today);
const daysToExpiry = (lot) => Math.round((day(lot.expiry) - today) / 86400000);
const expiryStatus = (lot) => daysToExpiry(lot) <= 0 ? 'red' : daysToExpiry(lot) === 1 ? 'orange' : 'normal';
const storageTypeFor = lot => lot.storageType || state.products.find(product => product.name === lot.product)?.storageType || 'fresh';
const updateReportedStock = (lot, change) => { if (lot.location !== 'senigallia') return; const report = state.stockReports.find(entry => entry.product.toLocaleLowerCase('it-IT') === lot.product.toLocaleLowerCase('it-IT') && entry.unit === lot.unit); if (report) { report.quantity = Math.max(0, report.quantity + change); report.updatedAt = iso(today); } };
const orderStatus = status => status === 'Da preparare' ? 'ready' : status === 'Inviato' ? 'sent' : 'scheduled';
const stockForItem = (order, item) => item.stockAtSenigallia === undefined ? order.stockAtSenigallia : item.stockAtSenigallia;
const urgencyForItem = (order, item) => {
  const stock = stockForItem(order, item);
  if (stock === undefined || stock === null || stock === '') return { label: 'Da valutare', style: 'neutral' };
  if (Number(stock) <= 0) return { label: 'Urgente', style: 'urgent' };
  if (Number(stock) < Number(item.quantity)) return { label: 'Priorità alta', style: 'high' };
  return { label: 'Non urgente', style: 'normal' };
};
const urgencyFor = order => {
  const priorities = order.items.map(item => urgencyForItem(order, item).style);
  if (priorities.includes('urgent')) return { label: 'Urgente', style: 'urgent' };
  if (priorities.includes('high')) return { label: 'Priorità alta', style: 'high' };
  if (priorities.includes('normal')) return { label: 'Non urgente', style: 'normal' };
  return { label: 'Da valutare', style: 'neutral' };
};

function renderDashboard() {
  const lots = visibleLots();
  const needsAttention = lots.filter(lot => daysToExpiry(lot) <= 1 && lot.quantity > 0);
  document.querySelector('#ordersToPrepare').textContent = state.orders.filter(order => order.status === 'Da preparare' && ['urgent', 'high'].includes(urgencyFor(order).style)).length;
  document.querySelector('#activeLots').textContent = lots.filter(lot => lot.quantity > 0).length;
  document.querySelector('#nearExpiry').textContent = needsAttention.length;
  document.querySelector('#expiryCount').textContent = needsAttention.length;
  document.querySelector('#lastInventory').textContent = state.lastInventory ? formatDate(state.lastInventory) : '—';
  document.querySelector('#recentOrders').innerHTML = state.orders.slice(0, 4).map(order => { const summary = order.items.map(item => `${item.product} (${item.quantity} ${item.unit})`).join(', '); const urgency = urgencyFor(order); return `<div class="order-row"><span class="order-icon">↔</span><div><b>${order.id} · ${summary}</b><small>Serve il ${formatDate(order.arrival)} · Senigallia</small></div><span class="badge priority-${urgency.style}">${urgency.label}</span></div>`; }).join('') || '<p>Nessun ordine ancora inserito.</p>';
  document.querySelector('#attentionLots').innerHTML = needsAttention.length ? needsAttention.map(lot => `<div class="lot-alert"><div><b>${lot.product}</b><small>${labelLocation(lot.location)} · Lotto ${formatDate(lot.production)}</small></div><span class="${expiryStatus(lot) === 'red' ? 'red-text' : 'orange-text'}">${daysToExpiry(lot) <= 0 ? 'Scade oggi' : 'Scade domani'}</span></div>`).join('') : '<p>Nessun lotto in scadenza.</p>';
}

function renderOrders() {
  const monthTitle = calendarMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  const firstWeekday = (calendarMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const orderDates = new Map();
  state.orders.forEach(order => { const current = orderDates.get(order.arrival) || 'completed'; if (order.status === 'Da preparare') orderDates.set(order.arrival, 'preparing'); else orderDates.set(order.arrival, current); });
  const days = Array.from({ length: firstWeekday }, () => '<span class="calendar-day empty"></span>');
  for (let number = 1; number <= daysInMonth; number += 1) {
    const date = iso(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), number));
    const dot = orderDates.get(date); days.push(`<button class="calendar-day ${date === selectedOrderDay ? 'selected' : ''}" data-calendar-day="${date}">${number}${dot ? `<i class="calendar-dot ${dot === 'completed' ? 'completed' : ''}"></i>` : ''}</button>`);
  }
  const ordersForDay = state.orders.slice().sort((a, b) => day(a.arrival) - day(b.arrival));
  const cards = ordersForDay.map(order => {
    const isMarotta = selectedLocation !== 'senigallia';
    const isSenigallia = selectedLocation === 'senigallia';
    const items = order.items.map(item => { const itemUrgency = urgencyForItem(order, item); const stock = stockForItem(order, item); const stockText = stock === undefined || stock === null || stock === '' ? 'Giacenza non comunicata' : `Rimangono ${stock} ${item.stockUnit || order.stockUnit || item.unit}`; const actions = isMarotta && order.status === 'Da preparare' ? `<span class="order-item-actions">${item.standby ? '<span class="standby-label">Nel prossimo ordine</span>' : item.prepared ? '<span class="positive">Preparato</span>' : `<button class="unavailable-button" data-unavailable-item="${order.id}:${item.id}"><span>!</span> Non disponibile</button>`}<button class="delete-product" data-delete-order-item="${order.id}:${item.id}">Elimina</button></span>` : item.standby ? '<span class="standby-label">Nel prossimo ordine</span>' : item.prepared ? '<span class="positive">Preparato</span>' : ''; return `<div class="order-item ${item.prepared ? 'done' : ''}"><label>${isMarotta && order.status === 'Da preparare' && !item.standby ? `<input type="checkbox" data-prepare-item="${order.id}:${item.id}" ${item.prepared ? 'checked' : ''}>` : ''}<span><b>${item.product}</b><span class="order-quantities"><strong>${item.quantity} ${item.unit}</strong><small>${stockText}</small></span></span></label><span class="badge priority-${itemUrgency.style}">${itemUrgency.label}</span>${actions}</div>`; }).join('');
    const marottaFooter = isMarotta && order.status === 'Da preparare' ? `<div class="order-footer"><label>Data di invio<input type="date" value="${order.dispatchDate || order.arrival}" data-dispatch-date="${order.id}"></label><button class="secondary" data-schedule-order="${order.id}">Programma invio</button><button class="primary" data-send-order="${order.id}">Invia ora</button></div>` : isMarotta && order.status === 'Programmato' ? `<div class="order-footer"><span class="scheduled-copy">Invio programmato per il ${formatDate(order.dispatchDate)}</span><button class="primary" data-send-order="${order.id}">Invia ora</button><button class="secondary" data-cancel-order="${order.id}">Annulla</button></div>` : isMarotta && order.status === 'Inviato' ? `<div class="order-footer"><button class="secondary" data-cancel-order="${order.id}">Annulla invio</button></div>` : '';
    const senigalliaFooter = isSenigallia && order.status === 'Da preparare' ? `<div class="order-footer"><button class="delete-product" data-delete-order="${order.id}">Elimina ordine</button></div>` : '';
    const urgency = urgencyFor(order);
    return `<article class="order-card"><div class="order-card-heading"><div><b>${order.id} · Ordine per Senigallia</b><small>${order.items.length} prodotti · Serve il ${formatDate(order.arrival)}</small></div><div class="order-badges"><span class="badge priority-${urgency.style}">${urgency.label}</span><span class="badge ${orderStatus(order.status)}">${order.status}</span></div></div><div class="order-items">${items}</div>${marottaFooter}${senigalliaFooter}</article>`;
  }).join('') || '<p class="no-orders">Nessun ordine da preparare.</p>';
  document.querySelector('#ordersTable').innerHTML = cards;
}

function renderInventory() {
  const query = inventorySearch.trim().toLocaleLowerCase('it-IT');
  const lots = visibleLots().filter(lot => lot.quantity > 0).filter(lot => !query || `${lot.product} ${lot.production} ${lot.expiry}`.toLocaleLowerCase('it-IT').includes(query)).sort((a,b) => day(a.production) - day(b.production));
  const tableRows = list => list.map(lot => { const status = expiryStatus(lot); const text = status === 'red' ? 'Scade oggi' : status === 'orange' ? 'Scade domani' : 'Disponibile'; const adjustment = lot.expiryAdjusted ? '<i class="expiry-adjusted"></i>' : ''; return `<tr><td><b>${lot.product}</b>${adjustment}</td><td>${labelLocation(lot.location)}</td><td>${formatDate(lot.production)}</td><td>${formatDate(lot.expiry)}</td><td>${lot.quantity} ${lot.unit}</td><td><span class="${status === 'red' ? 'red-text' : status === 'orange' ? 'orange-text' : 'positive'}">${text}</span></td><td><button class="icon-button" data-discharge="${lot.id}">Scarica</button></td></tr>`; }).join('') || '<tr><td colspan="7">Nessun lotto in questa sezione.</td></tr>';
  document.querySelector('#inventoryTable').innerHTML = tableRows(lots.filter(lot => storageTypeFor(lot) !== 'frozen'));
  document.querySelector('#frozenInventoryTable').innerHTML = tableRows(lots.filter(lot => storageTypeFor(lot) === 'frozen'));
  const reports = state.stockReports.filter(report => !query || `${report.product} ${report.updatedAt}`.toLocaleLowerCase('it-IT').includes(query));
  document.querySelector('#stockReports').innerHTML = reports.length ? reports.map(report => `<div class="stock-report-row"><div><b>${report.product}</b><small>Comunicata il ${formatDate(report.updatedAt)}</small></div><strong>${report.quantity} ${report.unit}</strong></div>`).join('') : '<p class="no-orders">Nessuna giacenza comunicata.</p>';
  const totals = new Map();
  visibleLots().filter(lot => lot.location === 'senigallia' && lot.quantity > 0).forEach(lot => { const key = `${lot.product}|${lot.unit}`; const current = totals.get(key) || { product: lot.product, unit: lot.unit, quantity: 0, reported: false }; current.quantity += Number(lot.quantity); totals.set(key, current); });
  state.stockReports.forEach(report => { const key = `${report.product}|${report.unit}`; totals.set(key, { product: report.product, unit: report.unit, quantity: report.quantity, reported: true }); });
  const summary = [...totals.values()].filter(item => !query || `${item.product}`.toLocaleLowerCase('it-IT').includes(query)).sort((a, b) => a.product.localeCompare(b.product, 'it'));
  document.querySelector('#inventorySummary').innerHTML = summary.length ? summary.map(item => `<div class="inventory-summary-row"><b>${item.product}</b><span>${item.quantity} ${item.unit}</span>${item.reported ? '<small>aggiornato dall’ordine</small>' : ''}</div>`).join('') : '<p class="no-orders">Nessun prodotto presente a Senigallia.</p>';
}

function renderExpiry() {
  const lots = visibleLots().filter(lot => lot.quantity > 0 && daysToExpiry(lot) <= 1).sort((a,b) => day(a.expiry) - day(b.expiry));
  document.querySelector('#expiryList').innerHTML = lots.length ? lots.map(lot => {const overdue = daysToExpiry(lot) <= 0; const actions = overdue ? `<div class="expiry-actions"><button class="danger-button" data-discard-lot="${lot.id}">Butta</button>${lot.expiryAdjusted ? '' : `<button class="warn-button" data-edit-expiry="${lot.id}">Altro</button>`}</div>` : ''; return `<article class="expiry-item ${overdue ? 'overdue' : ''}"><div><h3>${lot.product} <span class="${overdue ? 'red-text' : 'orange-text'}">· ${overdue ? 'Scade oggi' : 'Scade domani'}</span></h3><p>${labelLocation(lot.location)} · Prodotto il ${formatDate(lot.production)} · ${lot.quantity} ${lot.unit} rimasti</p></div>${actions}</article>`; }).join('') : '<div class="empty-state"><span>✓</span><h3>Nessuna scadenza urgente</h3><p>Non ci sono lotti in scadenza oggi o domani.</p></div>';
}

function renderProducts() {
  const categories = ['Senza glutine', 'Gastronomia', 'Pasta fresca', 'Materia prima'];
  document.querySelector('#productCategories').innerHTML = categories.map(category => {
    const products = state.products.filter(product => product.category === category);
    const isOpen = openProductCategory === category;
    return `<section class="category-panel ${isOpen ? 'open' : ''}"><button class="category-heading" data-category-folder="${category}"><h2><span class="folder-icon">${isOpen ? '▾' : '▸'}</span> ${category}</h2><span>${products.length} prodotti</span></button><div class="category-contents">${products.length ? products.map(product => `<div class="product-row"><b>${product.name}</b><span class="product-actions">${product.quick ? '<span class="storage-tag">Rapido</span>' : ''}<span class="storage-tag ${product.storageType === 'frozen' ? 'frozen' : ''}">${product.storageType === 'fresh' ? 'Fresco · +5 giorni' : 'Congelato'}</span><button class="delete-product" data-delete-product="${product.id}" aria-label="Elimina ${product.name}">Elimina</button></span></div>`).join('') : '<div class="product-row"><span>Nessun prodotto inserito</span></div>'}</div></section>`;
  }).join('');
}

function syncLotForm() {
  const form = document.querySelector('#lotForm');
  const product = state.products.find(item => item.name === form.elements.product.value);
  if (product) { form.elements.unit.value = product.unit; form.elements.storageType.value = product.storageType; }
  const isFresh = form.elements.storageType.value === 'fresh';
  const expiry = form.elements.expiryDate;
  if (isFresh && form.elements.productionDate.value) { const date = day(form.elements.productionDate.value); date.setDate(date.getDate() + 5); expiry.value = iso(date); expiry.readOnly = true; }
  else { expiry.readOnly = false; }
  document.querySelector('#expiryHint').textContent = isFresh ? 'Fresco: la scadenza viene calcolata automaticamente a 5 giorni dalla produzione.' : 'Congelato: scegli manualmente la data di scadenza.';
}

function prepareLotForm() {
  const form = document.querySelector('#lotForm');
  form.reset();
  form.productionDate.value = iso(today);
  document.querySelector('#productOptions').innerHTML = state.products.map(product => `<option value="${product.name}">${product.category}</option>`).join('');
  document.querySelector('#quickProducts').innerHTML = state.products.slice(0, 6).map(product => `<button type="button" class="quick-product" data-quick-product="${product.name}">${product.name}</button>`).join('');
  syncLotForm();
}

function renderStocktake() {
  const form = document.querySelector('#stocktakeForm');
  const empty = document.querySelector('#stocktakeEmpty');
  const firstWeekday = (inventoryCalendarMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(inventoryCalendarMonth.getFullYear(), inventoryCalendarMonth.getMonth() + 1, 0).getDate();
  const doneDays = new Set(state.inventoryHistory.map(record => record.date));
  const blanks = Array.from({ length: firstWeekday }, () => '<span class="calendar-day empty"></span>');
  for (let number = 1; number <= daysInMonth; number += 1) { const date = iso(new Date(inventoryCalendarMonth.getFullYear(), inventoryCalendarMonth.getMonth(), number)); blanks.push(`<button class="calendar-day ${date === selectedInventoryDay ? 'selected' : ''}" data-inventory-day="${date}">${number}${doneDays.has(date) ? '<i class="calendar-dot completed"></i>' : ''}</button>`); }
  const historyCalendar = `<div class="orders-calendar"><div class="calendar-toolbar"><button class="calendar-nav" data-inventory-calendar-nav="previous">‹</button><h2>${inventoryCalendarMonth.toLocaleDateString('it-IT', {month:'long', year:'numeric'})}</h2><button class="calendar-nav" data-inventory-calendar-nav="next">›</button></div><div class="calendar-weekdays"><span>Lun</span><span>Mar</span><span>Mer</span><span>Gio</span><span>Ven</span><span>Sab</span><span>Dom</span></div><div class="calendar-days">${blanks.join('')}</div></div>`;
  const record = state.inventoryHistory.find(entry => entry.date === selectedInventoryDay);
  if (!form.dataset.running) { form.classList.add('hidden'); empty.classList.remove('hidden'); empty.innerHTML = `${historyCalendar}${record ? `<h3>Inventario del ${formatDate(record.date)}</h3><p>${record.items.map(item => `${item.product}: ${item.quantity} ${item.unit}`).join(' · ')}</p>` : '<span>✓</span><h3>Nessun inventario in questo giorno</h3><p>Il pallino verde indica un inventario già salvato.</p>'}`; return; }
  empty.classList.add('hidden'); form.classList.remove('hidden');
  const lots = state.lots.filter(lot => lot.location === 'senigallia' && lot.quantity > 0);
  form.innerHTML = `${historyCalendar}<h3>Nuovo inventario · ${formatDate(selectedInventoryDay)}</h3><div class="stocktake-row"><small>PRODOTTO / LOTTO</small><small>REGISTRATO</small><small>CONTEGGIATO</small><small>DIFFERENZA</small></div>${lots.map(lot => `<div class="stocktake-row"><div><b>${lot.product}</b><br><small>Lotto ${formatDate(lot.production)}</small></div><span>${lot.quantity} ${lot.unit}</span><input aria-label="Quantità contata ${lot.product}" type="number" min="0" step="0.1" value="${lot.quantity}" data-count="${lot.id}"><span class="difference" data-difference="${lot.id}">0</span></div>`).join('')}<div class="dialog-actions"><button class="primary" data-action="save-stocktake">Salva inventario</button></div>`;
}

function renderHours() {
  document.querySelector('#hoursMonth').value = hoursMonth;
  const [year, month] = hoursMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  document.querySelector('#hoursColumns').innerHTML = state.employees.map(employee => { const rows = []; for (let number = 1; number <= daysInMonth; number += 1) { const date = `${hoursMonth}-${String(number).padStart(2, '0')}`; const record = state.workHours.find(entry => String(entry.employeeId) === String(employee.id) && entry.date === date); const locked = record && selectedLocation === 'senigallia'; rows.push(`<div class="hours-row"><span>${day(date).toLocaleDateString('it-IT', { weekday:'short', day:'numeric' })}</span><input type="text" inputmode="decimal" value="${record?.hours ?? ''}" placeholder="0" ${locked ? 'readonly' : ''} data-hour-input="${employee.id}:${date}"><button class="save-hours" data-save-hours="${employee.id}:${date}" ${locked ? 'disabled' : ''}>Salva</button></div>`); } return `<article class="hours-column"><input class="employee-name-input" value="${employee.name}" data-employee-name="${employee.id}" aria-label="Nome persona"><div class="hours-heading"><span>Giorno</span><span>Ore</span></div>${rows.join('')}</article>`; }).join('');
}

function openHoursPrintPreview() {
  const [year, month] = hoursMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  document.querySelector('#hoursPrintPeriod').textContent = new Date(year, month - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  document.querySelector('#hoursPrintPreviewContent').innerHTML = state.employees.map(employee => {
    const rows = [];
    for (let number = 1; number <= daysInMonth; number += 1) {
      const date = `${hoursMonth}-${String(number).padStart(2, '0')}`;
      const record = state.workHours.find(entry => String(entry.employeeId) === String(employee.id) && entry.date === date);
      rows.push(`<div class="hours-print-row"><span>${day(date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })}</span><b>${record?.hours ?? '-'}</b></div>`);
    }
    return `<article class="hours-print-column"><h3>${employee.name}</h3><div class="hours-print-heading"><span>Giorno</span><span>Ore</span></div>${rows.join('')}</article>`;
  }).join('');
  document.querySelector('#hoursPrintPreview').showModal();
}

function renderTemperatures() {
  const stations = ['Frigo banco', 'Frigo laboratorio', 'Congelatore'];
  const record = state.temperatures.find(entry => entry.date === iso(today));
  document.querySelector('#temperatureFields').innerHTML = stations.map(name => `<label>${name}<input required type="number" step="0.1" name="${name}" value="${record?.values?.[name] ?? ''}" placeholder="°C" /></label>`).join('');
  document.querySelector('#temperatureHistory').innerHTML = state.temperatures.slice(0, 5).map(entry => `<div class="history-row"><b>${formatDate(entry.date)}</b><span>${stations.map(name => `${name}: ${entry.values[name]}°`).join(' · ')}</span></div>`).join('') || '<p class="no-orders">Nessun controllo registrato.</p>';
}

function renderCleaning() {
  const tasks = ['Banco vendita', 'Pavimento', 'Frigoriferi', 'Attrezzature', 'Bagno'];
  const record = state.cleaningChecks.find(entry => entry.date === iso(today));
  document.querySelector('#cleaningFields').innerHTML = tasks.map(task => `<label><input type="checkbox" name="${task}" ${record?.tasks?.includes(task) ? 'checked' : ''} /> ${task}</label>`).join('');
  document.querySelector('#cleaningHistory').innerHTML = state.cleaningChecks.slice(0, 5).map(entry => `<div class="history-row"><b>${formatDate(entry.date)}</b><span>${entry.tasks.join(' · ') || 'Nessuna voce completata'}</span></div>`).join('') || '<p class="no-orders">Nessuna pulizia registrata.</p>';
}

function renderReceipts() {
  document.querySelector('#receiptForm').elements.date.value = iso(today);
  document.querySelector('#receiptHistory').innerHTML = state.receipts.slice(0, 12).map(entry => `<article class="receipt-row"><div><b>${formatDate(entry.date)} · € ${Number(entry.amount).toFixed(2).replace('.', ',')}</b><small>Corrispettivo registrato</small></div>${entry.photo ? `<img src="${entry.photo}" alt="Foto corrispettivo ${formatDate(entry.date)}" />` : ''}</article>`).join('') || '<p class="no-orders">Nessun corrispettivo registrato.</p>';
}

function render() { renderDashboard(); renderOrders(); renderInventory(); renderExpiry(); renderProducts(); renderStocktake(); renderHours(); renderTemperatures(); renderCleaning(); renderReceipts(); }

function switchView(view) { document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === view)); document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view)); const names = {dashboard:'Buongiorno',orders:'Ordini tra sedi',inventory:'Magazzino',production:'Produzione',products:'Prodotti',expiry:'Scadenze',stocktake:'Inventario',hours:'Ore lavorate',temperatures:'Temperature',cleaning:'Pulizie',receipts:'Corrispettivi'}; document.querySelector('#pageTitle').textContent = names[view]; }

document.querySelector('#today').textContent = today.toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
document.querySelectorAll('dialog .close, dialog button[value="cancel"]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); button.closest('dialog')?.close('cancel'); }));
function enterApp(location) {
  selectedLocation = location;
  document.querySelector('#currentLocationLabel').textContent = location === 'marotta' ? 'Sede Marotta' : 'Sede Senigallia';
  document.querySelector('#loginScreen').classList.add('hidden');
  document.querySelector('#appShell').classList.remove('hidden');
  render();
  loadSharedState();
  clearInterval(cloudPollTimer);
  cloudPollTimer = setInterval(loadSharedState, 10000);
}
document.querySelector('#loginForm').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.currentTarget); const name = data.get('name').trim().toLowerCase(); const password = data.get('password'); const location = data.get('location'); const error = document.querySelector('#loginError'); const allowed = location === 'marotta' ? name === 'pasta' && password === 'pasta' : name === 'pasta' && password === 'pasta'; if (!allowed) { error.textContent = location === 'marotta' ? 'Per Marotta usa nome pasta e password pasta.' : 'Nome o password non corretti.'; error.classList.remove('hidden'); return; } error.classList.add('hidden'); sessionStorage.setItem('pastificio-session', JSON.stringify({name,location})); enterApp(location); });
document.querySelector('#marottaAccessForm').addEventListener('submit', event => { const data = new FormData(event.currentTarget); if (data.get('name').trim().toLowerCase() !== 'pane' || data.get('password') !== 'pane') { event.preventDefault(); document.querySelector('#marottaAccessError').classList.remove('hidden'); return; } sessionStorage.setItem('marotta-controls-authorized', 'true'); if (pendingProtectedView) switchView(pendingProtectedView); pendingProtectedView = null; });
document.querySelectorAll('.nav-item,[data-view-link]').forEach(button => button.addEventListener('click', () => { const view = button.dataset.view || button.dataset.viewLink; const protectedViews = ['temperatures', 'cleaning', 'receipts', 'hours']; if (selectedLocation === 'marotta' && protectedViews.includes(view) && sessionStorage.getItem('marotta-controls-authorized') !== 'true') { pendingProtectedView = view; document.querySelector('#marottaAccessForm').reset(); document.querySelector('#marottaAccessError').classList.add('hidden'); document.querySelector('#marottaAccessDialog').showModal(); return; } switchView(view); }));
document.querySelector('[data-action="logout"]').addEventListener('click', () => { sessionStorage.removeItem('pastificio-session'); sessionStorage.removeItem('marotta-controls-authorized'); document.querySelector('#appShell').classList.add('hidden'); document.querySelector('#loginScreen').classList.remove('hidden'); document.querySelector('#loginForm').reset(); });
const orderLine = () => `<div class="order-line"><button type="button" class="order-line-summary" data-action="edit-order-line"></button><div class="order-line-editor"><div class="order-line-heading"><b>Prodotto richiesto</b><button type="button" class="remove-line-button" data-action="remove-order-line" aria-label="Rimuovi prodotto">×</button></div><label>Nome del prodotto<input required name="product" list="orderProductOptions" placeholder="es. Cappelletti piccoli" autocomplete="off" /></label><div class="two-fields"><label>Quantità richiesta<input required name="quantity" type="number" min="0.1" step="0.1" placeholder="0" /></label><label>Unità<select name="unit"><option>kg</option><option>pezzi</option><option>vaschette</option></select></label></div><fieldset class="stock-declaration"><legend>Merce rimasta a Senigallia</legend><div class="two-fields"><label>Quantità rimasta<input required name="stockAtSenigallia" type="number" min="0" step="0.1" placeholder="0" /></label><label>Unità<select name="stockUnit"><option>kg</option><option>pezzi</option><option>vaschette</option></select></label></div></fieldset></div></div>`;
const addOrderLine = () => document.querySelector('#orderLines').insertAdjacentHTML('beforeend', orderLine());
const compactOrderLine = line => {
  const productInput = line.querySelector('[name="product"]');
  const quantityInput = line.querySelector('[name="quantity"]');
  const stockInput = line.querySelector('[name="stockAtSenigallia"]');
  const isBlank = !productInput.value.trim() && !quantityInput.value && stockInput.value === '';
  const product = productInput.value.trim() || 'Nuovo prodotto da completare';
  const quantity = line.querySelector('[name="quantity"]').value;
  const unit = line.querySelector('[name="unit"]').value;
  const stock = line.querySelector('[name="stockAtSenigallia"]').value;
  const stockUnit = line.querySelector('[name="stockUnit"]').value;
  const details = quantity && stock !== '' ? `${quantity} ${unit} richiesti · Rimangono ${stock} ${stockUnit}` : 'Tocca per continuare la compilazione';
  line.querySelector('.order-line-summary').innerHTML = `<b>${product}</b><span>${details}</span>`;
  line.querySelectorAll('input, select').forEach(control => { control.disabled = isBlank; });
  line.classList.add('compact');
};
document.querySelectorAll('[data-action="new-order"]').forEach(button => button.addEventListener('click', () => {
  if (selectedLocation === 'marotta') { alert('Gli ordini per Marotta vengono inseriti dalla sede di Senigallia. Da qui puoi prepararli e confermarne l’invio.'); return; }
  const form = document.querySelector('#orderForm');
  form.reset();
  form.querySelector('[name="arrivalDate"]').value = selectedOrderDay;
  document.querySelector('#orderLines').innerHTML = '';
  addOrderLine();
  const pending = document.querySelector('#pendingOrderItems');
  pending.classList.toggle('hidden', !state.pendingItems.length);
  pending.innerHTML = state.pendingItems.length ? `<b>Prodotti non disponibili nel precedente ordine</b>${state.pendingItems.map(item => `${item.product} · ${item.quantity} ${item.unit}`).join('<br>')}<br><small>Inseriscili di nuovo qui quando servono.</small>` : '';
  document.querySelector('#orderProductOptions').innerHTML = state.products.map(product => `<option value="${product.name}"></option>`).join('');
  document.querySelector('#orderQuickProducts').innerHTML = state.products.filter(product => product.quick).map(product => `<button type="button" class="quick-product" data-order-quick-product="${product.id}">${product.name}</button>`).join('');
  document.querySelector('#orderDialog').showModal();
}));
document.querySelectorAll('[data-action="new-lot"]').forEach(button => button.addEventListener('click', () => { prepareLotForm(); document.querySelector('#lotDialog').showModal(); }));
document.querySelector('[data-action="new-product"]').addEventListener('click', () => { document.querySelector('#productForm').reset(); document.querySelector('#productDialog').showModal(); });
document.querySelector('[data-action="start-stocktake"]').addEventListener('click', () => { selectedInventoryDay = iso(today); document.querySelector('#stocktakeForm').dataset.running = 'true'; renderStocktake(); });
document.querySelector('[data-action="add-employee"]')?.addEventListener('click', () => { const cleanName = prompt('Nome della persona')?.trim().replace(/\s+/g, ' '); if (cleanName && !state.employees.some(employee => normalizedName(employee.name) === normalizedName(cleanName))) { const employee = { id: Date.now(), name: cleanName }; state.employees.push(employee); selectedEmployeeId = employee.id; save(); renderHours(); } });
document.querySelector('#hoursMonth').addEventListener('change', event => { hoursMonth = event.target.value || hoursMonth; renderHours(); });
document.addEventListener('click', event => {
  if (event.target.closest('[data-action="print-hours"]')) { event.preventDefault(); openHoursPrintPreview(); }
  if (event.target.closest('[data-action="confirm-print-hours"]')) { event.preventDefault(); window.print(); }
});
document.querySelector('[data-action="export-data"]').addEventListener('click', () => {
  const backup = { version: 1, exportedAt: new Date().toISOString(), state };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `pastificio-backup-${iso(today)}.json`;
  link.click();
  URL.revokeObjectURL(url);
});
document.querySelector('[data-action="import-data"]').addEventListener('click', () => document.querySelector('#importDataInput').click());
document.querySelector('#importDataInput').addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      const backup = JSON.parse(reader.result);
      if (!backup?.state || !Array.isArray(backup.state.products) || !Array.isArray(backup.state.orders) || !Array.isArray(backup.state.lots)) throw new Error('invalid backup');
      if (!confirm('Ripristinare questa copia? I dati attuali su questo dispositivo verranno sostituiti.')) return;
      state = backup.state;
      if (!Array.isArray(state.pendingItems)) state.pendingItems = [];
      if (!Array.isArray(state.inventoryHistory)) state.inventoryHistory = [];
      save();
      render();
      alert('Copia ripristinata correttamente.');
    } catch {
      alert('Questo file non sembra una copia valida del gestionale.');
    } finally {
      event.target.value = '';
    }
  });
  reader.readAsText(file);
});

document.querySelector('#orderForm').addEventListener('submit', event => {
  const data = new FormData(event.currentTarget);
  const highestOrderNumber = state.orders.reduce((highest, order) => Math.max(highest, Number(String(order.id).replace('ORD-', '')) || 0), 104);
  const orderId = `ORD-${highestOrderNumber + 1}`;
  const items = data.getAll('product').map((name, index) => ({ id: Date.now() + index, product: canonicalProductName(name), quantity: Number(data.getAll('quantity')[index]), unit: data.getAll('unit')[index], stockAtSenigallia: Number(data.getAll('stockAtSenigallia')[index]), stockUnit: data.getAll('stockUnit')[index], prepared: false }));
  const arrival = data.get('arrivalDate');
  const openOrder = state.orders.find(order => order.arrival === arrival && order.status === 'Da preparare');
  if (openOrder) {
    items.forEach(item => {
      const existing = openOrder.items.find(line => line.product.toLocaleLowerCase('it-IT') === item.product.toLocaleLowerCase('it-IT') && line.unit === item.unit && !line.standby);
      if (existing) { existing.quantity += item.quantity; existing.stockAtSenigallia = item.stockAtSenigallia; existing.stockUnit = item.stockUnit; }
      else openOrder.items.push(item);
    });
  } else state.orders.unshift({ id: orderId, arrival, items, status: 'Da preparare' });
  items.forEach(item => {
    const report = state.stockReports.find(entry => entry.product.toLocaleLowerCase('it-IT') === item.product.toLocaleLowerCase('it-IT') && entry.unit === item.stockUnit);
    const nextReport = { product: item.product, quantity: item.stockAtSenigallia, unit: item.stockUnit, updatedAt: iso(today) };
    if (report) Object.assign(report, nextReport); else state.stockReports.unshift(nextReport);
  });
  save();
  render();
});
document.querySelector('#lotForm').addEventListener('submit', event => { const data = new FormData(event.currentTarget); state.lots.unshift({id:Date.now(),product:canonicalProductName(data.get('product')),location:data.get('location'),production:data.get('productionDate'),expiry:data.get('expiryDate'),quantity:Number(data.get('quantity')),unit:data.get('unit'),storageType:data.get('storageType')}); save(); render(); });
document.querySelector('#productForm').addEventListener('submit', event => { const data = new FormData(event.currentTarget); const name = String(data.get('name')).trim().replace(/\s+/g, ' '); const existing = state.products.find(product => normalizedName(product.name) === normalizedName(name)); if (existing) { Object.assign(existing, { category:data.get('category'), unit:data.get('unit'), storageType:data.get('storageType'), quick:data.get('quick') === 'on' }); } else state.products.push({id:Date.now(),name,category:data.get('category'),unit:data.get('unit'),storageType:data.get('storageType'),quick:data.get('quick') === 'on'}); save(); render(); });
document.querySelector('#expiryForm').addEventListener('submit', event => { const data = new FormData(event.currentTarget); const lot = state.lots.find(item => String(item.id) === data.get('lotId')); if (lot) { lot.expiryAdjusted = true; lot.expiry = data.get('expiryDate'); lot.storageType = data.get('storageType'); save(); render(); } });
document.querySelector('#temperatureForm').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.currentTarget); const values = Object.fromEntries([...data.entries()].map(([name, value]) => [name, Number(value)])); state.temperatures = state.temperatures.filter(entry => entry.date !== iso(today)); state.temperatures.unshift({ date: iso(today), values }); save(); renderTemperatures(); });
document.querySelector('#cleaningForm').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.currentTarget); state.cleaningChecks = state.cleaningChecks.filter(entry => entry.date !== iso(today)); state.cleaningChecks.unshift({ date: iso(today), tasks: [...data.keys()] }); save(); renderCleaning(); });
document.querySelector('#receiptForm').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.currentTarget); const file = data.get('photo'); if (!file?.size) return; const reader = new FileReader(); reader.addEventListener('load', () => { state.receipts.unshift({ id: Date.now(), date: data.get('date'), amount: Number(data.get('amount')), photo: reader.result }); save(); event.currentTarget.reset(); renderReceipts(); }); reader.readAsDataURL(file); });
document.querySelector('#lotForm').addEventListener('change', event => { if (['product', 'storageType', 'productionDate'].includes(event.target.name)) syncLotForm(); });

document.addEventListener('click', event => {
  if (event.target.closest('[data-action="add-order-line"]')) {
    const activeLine = document.querySelector('.order-line:not(.compact)');
    if (!activeLine || !Array.from(activeLine.querySelectorAll('input, select')).every(control => control.reportValidity())) return;
    compactOrderLine(activeLine);
    addOrderLine();
    return;
  }
  const editOrderLine = event.target.closest('[data-action="edit-order-line"]');
  if (editOrderLine) {
    const nextLine = editOrderLine.closest('.order-line');
    const activeLine = document.querySelector('.order-line:not(.compact)');
    if (activeLine && activeLine !== nextLine) {
      compactOrderLine(activeLine);
    }
    nextLine.classList.remove('compact');
    nextLine.querySelectorAll('input, select').forEach(control => { control.disabled = false; });
    nextLine.querySelector('[name="product"]').focus();
    return;
  }
  const removeOrderLine = event.target.closest('[data-action="remove-order-line"]');
  if (removeOrderLine) { const lines = document.querySelectorAll('.order-line'); if (lines.length > 1) removeOrderLine.closest('.order-line').remove(); return; }
  const send = event.target.closest('[data-send-order]');
  const schedule = event.target.closest('[data-schedule-order]');
  if (send || schedule) { const orderId = (send || schedule).dataset.sendOrder || (send || schedule).dataset.scheduleOrder; const order = state.orders.find(item => item.id === orderId); const datePicker = document.querySelector(`[data-dispatch-date="${order.id}"]`); order.dispatchDate = send ? iso(today) : datePicker.value; order.status = send ? 'Inviato' : 'Programmato'; if (send && !order.inventoryLotCreated) { order.items.filter(item => !item.standby).forEach((item, index) => { const production = item.production || iso(today); const defaultExpiry = day(production); defaultExpiry.setDate(defaultExpiry.getDate() + 5); state.lots.unshift({id:Date.now() + index,product:item.product,location:'senigallia',production,expiry:item.expiry || iso(defaultExpiry),availableOn:order.dispatchDate,quantity:item.quantity,unit:item.unit,fromOrder:order.id}); const report = state.stockReports.find(entry => entry.product.toLocaleLowerCase('it-IT') === item.product.toLocaleLowerCase('it-IT') && entry.unit === item.unit); if (report) { report.quantity += item.quantity; report.updatedAt = iso(today); } else state.stockReports.unshift({ product:item.product, quantity:item.quantity, unit:item.unit, updatedAt:iso(today) }); }); order.inventoryLotCreated = true; } save(); render(); }
  const discharge = event.target.closest('[data-discharge]');
  if (discharge) { const lot = state.lots.find(item => String(item.id) === discharge.dataset.discharge); const answer = prompt(`Quanta quantità scarichi da ${lot.product}? (disponibili: ${lot.quantity} ${lot.unit})`, lot.quantity); if (answer !== null && Number(answer) >= 0) { const removed = Math.min(lot.quantity, Number(answer)); lot.quantity = Math.max(0, lot.quantity - removed); updateReportedStock(lot, -removed); save(); render(); } }
  const discardLot = event.target.closest('[data-discard-lot]');
  if (discardLot) { const lot = state.lots.find(item => String(item.id) === discardLot.dataset.discardLot); if (lot && confirm(`Buttare tutto il lotto di ${lot.product} (${lot.quantity} ${lot.unit})?`)) { updateReportedStock(lot, -lot.quantity); lot.quantity = 0; save(); render(); } }
  const editExpiry = event.target.closest('[data-edit-expiry]');
  if (editExpiry) { const lot = state.lots.find(item => String(item.id) === editExpiry.dataset.editExpiry); if (lot) { const form = document.querySelector('#expiryForm'); form.elements.lotId.value = lot.id; form.elements.product.value = lot.product; form.elements.expiryDate.value = lot.expiry; form.elements.storageType.value = storageTypeFor(lot); document.querySelector('#expiryDialog').showModal(); } }
  if (event.target.matches('[data-action="save-stocktake"]')) { const items = []; document.querySelectorAll('[data-count]').forEach(input => { const lot = state.lots.find(item => String(item.id) === input.dataset.count); const quantity = Number(input.value); lot.quantity = quantity; items.push({product:lot.product, production:lot.production, quantity, unit:lot.unit}); }); state.inventoryHistory = state.inventoryHistory.filter(entry => entry.date !== selectedInventoryDay); state.inventoryHistory.unshift({date:selectedInventoryDay,items}); state.lastInventory = selectedInventoryDay; document.querySelector('#stocktakeForm').dataset.running = ''; save(); render(); alert('Inventario salvato. Le giacenze di Senigallia sono state aggiornate.'); }
  const quick = event.target.closest('[data-quick-product]');
  if (quick) { document.querySelector('#lotProduct').value = quick.dataset.quickProduct; syncLotForm(); }
  const orderQuick = event.target.closest('[data-order-quick-product]');
  if (orderQuick) { const product = state.products.find(item => String(item.id) === orderQuick.dataset.orderQuickProduct); const form = document.querySelector('#orderForm'); const activeLine = form.querySelector('.order-line:not(.compact)') || form.querySelector('.order-line:last-child'); if (product && activeLine) { activeLine.querySelector('[name="product"]').value = product.name; activeLine.querySelector('[name="unit"]').value = product.unit; activeLine.querySelector('[name="stockUnit"]').value = product.unit; } }
  const prepared = event.target.closest('[data-prepare-item]');
  if (prepared) { const [orderId, itemId] = prepared.dataset.prepareItem.split(':'); const item = state.orders.find(order => order.id === orderId)?.items.find(line => String(line.id) === itemId); if (item) { item.prepared = prepared.checked; save(); render(); } }
  const unavailable = event.target.closest('[data-unavailable-item]');
  if (unavailable) { const [orderId, itemId] = unavailable.dataset.unavailableItem.split(':'); const item = state.orders.find(order => order.id === orderId)?.items.find(line => String(line.id) === itemId); if (item && confirm(`Mettere “${item.product}” in standby per il prossimo ordine?`)) { item.standby = true; item.prepared = false; const old = state.pendingItems.find(line => line.product.toLowerCase() === item.product.toLowerCase()); if (old) Object.assign(old, item); else state.pendingItems.push({ ...item }); save(); render(); } }
  const deleteOrderItem = event.target.closest('[data-delete-order-item]');
  if (deleteOrderItem) { const [orderId, itemId] = deleteOrderItem.dataset.deleteOrderItem.split(':'); const order = state.orders.find(item => item.id === orderId); const item = order?.items.find(line => String(line.id) === itemId); if (item && confirm(`Eliminare “${item.product}” da questo ordine?`)) { order.items = order.items.filter(line => line !== item); if (!order.items.length) state.orders = state.orders.filter(line => line !== order); save(); render(); } }
  const calendarDay = event.target.closest('[data-calendar-day]');
  if (calendarDay) { selectedOrderDay = calendarDay.dataset.calendarDay; renderOrders(); }
  const calendarNav = event.target.closest('[data-calendar-nav]');
  if (calendarNav) { calendarMonth.setMonth(calendarMonth.getMonth() + (calendarNav.dataset.calendarNav === 'next' ? 1 : -1)); renderOrders(); }
  const folder = event.target.closest('[data-category-folder]');
  if (folder) { openProductCategory = openProductCategory === folder.dataset.categoryFolder ? null : folder.dataset.categoryFolder; renderProducts(); }
  const removeProduct = event.target.closest('[data-delete-product]');
  if (removeProduct) { const product = state.products.find(item => String(item.id) === removeProduct.dataset.deleteProduct); if (product && confirm(`Eliminare “${product.name}” dall'archivio prodotti?`)) { state.products = state.products.filter(item => item !== product); save(); renderProducts(); } }
  const removeOrder = event.target.closest('[data-delete-order]');
  if (removeOrder) { const order = state.orders.find(item => item.id === removeOrder.dataset.deleteOrder); if (order && confirm(`Eliminare l'ordine ${order.id}?`)) { state.orders = state.orders.filter(item => item !== order); state.lots = state.lots.filter(lot => lot.fromOrder !== order.id); save(); render(); } }
  const cancelOrder = event.target.closest('[data-cancel-order]');
  if (cancelOrder) { const order = state.orders.find(item => item.id === cancelOrder.dataset.cancelOrder); if (order && confirm(`Annullare l'invio di ${order.id} e riaprirlo in preparazione?`)) { order.status = 'Da preparare'; order.inventoryLotCreated = false; state.lots = state.lots.filter(lot => lot.fromOrder !== order.id); save(); render(); } }
  const inventoryDay = event.target.closest('[data-inventory-day]');
  if (inventoryDay) { selectedInventoryDay = inventoryDay.dataset.inventoryDay; renderStocktake(); }
  const inventoryNav = event.target.closest('[data-inventory-calendar-nav]');
  if (inventoryNav) { inventoryCalendarMonth.setMonth(inventoryCalendarMonth.getMonth() + (inventoryNav.dataset.inventoryCalendarNav === 'next' ? 1 : -1)); renderStocktake(); }
  const employee = event.target.closest('[data-employee]');
  if (employee) { selectedEmployeeId = employee.dataset.employee; renderHours(); }
  const saveHours = event.target.closest('[data-save-hours]');
  if (saveHours) { const [employeeId, date] = saveHours.dataset.saveHours.split(':'); const input = document.querySelector(`[data-hour-input="${employeeId}:${date}"]`); const hours = Number(input.value.replace(',', '.')); if (!Number.isNaN(hours) && input.value !== '') { const existing = state.workHours.find(entry => String(entry.employeeId) === employeeId && entry.date === date); if (existing) existing.hours = hours; else state.workHours.push({ employeeId, date, hours }); save(); renderHours(); } }
  const editEmployee = event.target.closest('[data-edit-employee]');
  if (editEmployee) { const person = state.employees.find(entry => String(entry.id) === editEmployee.dataset.editEmployee); const name = prompt('Nome della persona', person?.name); if (person && name?.trim()) { person.name = name.trim().replace(/\s+/g, ' '); save(); renderHours(); } }
});
document.addEventListener('input', event => { if (event.target.matches('[data-count]')) { const lot = state.lots.find(item => String(item.id) === event.target.dataset.count); const diff = Number(event.target.value) - lot.quantity; const target = document.querySelector(`[data-difference="${lot.id}"]`); target.textContent = `${diff > 0 ? '+' : ''}${diff} ${lot.unit}`; target.className = `difference ${diff < 0 ? 'negative' : diff > 0 ? 'positive' : ''}`; } if (event.target.matches('[data-work-hours]')) { const date = event.target.dataset.workHours; const hours = Number(event.target.value.replace(',', '.')); const existing = state.workHours.find(entry => String(entry.employeeId) === String(selectedEmployeeId) && entry.date === date); if (event.target.value === '') { state.workHours = state.workHours.filter(entry => entry !== existing); } else if (!Number.isNaN(hours)) { if (existing) existing.hours = hours; else state.workHours.push({ employeeId: selectedEmployeeId, date, hours }); save(); } } });
document.addEventListener('change', event => { if (event.target.matches('[data-employee-name]')) { const employee = state.employees.find(entry => String(entry.id) === event.target.dataset.employeeName); const name = event.target.value.trim().replace(/\s+/g, ' '); if (employee && name) { employee.name = name; save(); } } });
document.querySelector('#inventorySearch').addEventListener('input', event => { inventorySearch = event.target.value; renderInventory(); });
const savedSession = JSON.parse(sessionStorage.getItem('pastificio-session') || 'null');
if (savedSession?.location) enterApp(savedSession.location);
