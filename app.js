// ═══════════════════════════════════════════════════════
//  app.js — Snow White Admin Dashboard
// ═══════════════════════════════════════════════════════

'use strict';

// ─── STATE ───────────────────────────────────────────
let state = {
  products:       [],   // كل المنتجات من Firebase
  categories:     [],   // الفئات
  activeCategory: 'all',
  searchQuery:    '',
};

// ─── DOM REFS ─────────────────────────────────────────
const $ = id => document.getElementById(id);
const tbody       = $('products-tbody');
const filterTabs  = $('filter-tabs');
const modalOverlay = $('modal-overlay');
const toastEl     = $('toast');

// ─── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupModal();
  setupSearch();
  setupAddForm();
  loadCategories();
  listenProducts();
  checkFirebaseConnection();
});

// ─── FIREBASE CONNECTION STATUS ───────────────────────
function checkFirebaseConnection() {
  try {
    db.collection('_ping').limit(1).get()
      .then(() => setStatus(true))
      .catch(() => setStatus(false));
  } catch {
    setStatus(false);
  }
}

function setStatus(connected) {
  const dot  = $('status-dot');
  const text = $('status-text');
  if (connected) {
    dot.className  = 'status-dot connected';
    text.textContent = 'Firebase متصل';
  } else {
    dot.className  = 'status-dot disconnected';
    text.textContent = 'تحقق من الإعدادات';
  }
}

// ─── NAV ──────────────────────────────────────────────
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.dataset.section;
      switchSection(sec);
    });
  });

  $('btn-open-add').addEventListener('click', () => switchSection('add'));
}

function switchSection(name) {
  // nav highlight
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.section === name));

  // sections
  document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === `section-${name}`));

  // topbar text
  const titles = { products: ['المنتجات', 'إدارة مخزون المتجر'], add: ['إضافة منتج', 'أدخل بيانات المنتج الجديد'], categories: ['الفئات', 'إدارة فئات المنتجات'] };
  const [title, sub] = titles[name] || ['', ''];
  $('page-title').textContent = title;
  $('page-sub').textContent   = sub;
}

// ─── SEARCH ───────────────────────────────────────────
function setupSearch() {
  $('search-input').addEventListener('input', e => {
    state.searchQuery = e.target.value.trim().toLowerCase();
    renderTable();
  });
}

// ─── LISTEN PRODUCTS (realtime) ───────────────────────
function listenProducts() {
  db.collection('products')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      state.products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderTable();
      renderStats();
      renderFilterTabs();
      setStatus(true);
    }, err => {
      console.error(err);
      setStatus(false);
      showToast('خطأ في تحميل البيانات', 'error');
    });
}

// ─── RENDER TABLE ─────────────────────────────────────
function renderTable() {
  let items = [...state.products];

  // filter by category
  if (state.activeCategory !== 'all') {
    items = items.filter(p => p.category === state.activeCategory);
  }

  // filter by search
  if (state.searchQuery) {
    items = items.filter(p =>
      p.name.toLowerCase().includes(state.searchQuery) ||
      (p.category || '').toLowerCase().includes(state.searchQuery)
    );
  }

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">
          <div class="empty-icon">📦</div>
          <div>لا توجد منتجات${state.searchQuery ? ' مطابقة للبحث' : ''}</div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = items.map(p => {
    const qty    = p.quantity ?? 0;
    const status = qty === 0 ? ['badge-out', 'نفذ'] : qty <= 5 ? ['badge-low', 'منخفض'] : ['badge-available', 'متوفر'];
    return `
    <tr data-id="${p.id}">
      <td>
        <div class="product-cell">
          <div class="product-emoji">${p.emoji || '📦'}</div>
          <div>
            <div class="product-cell-name">${esc(p.name)}</div>
            <div class="product-cell-desc">${esc(p.description || '')}</div>
          </div>
        </div>
      </td>
      <td><span class="cat-pill">${esc(p.category || '—')}</span></td>
      <td class="price-cell">${formatPrice(p.price)}</td>
      <td>
        <div class="qty-cell" id="qty-cell-${p.id}">
          <input
            class="qty-input"
            type="number" min="0"
            value="${qty}"
            data-original="${qty}"
            onchange="onQtyChange('${p.id}', this)"
          />
          <button class="qty-save-btn" onclick="saveQty('${p.id}', this)">حفظ</button>
        </div>
      </td>
      <td><span class="badge ${status[0]}">${status[1]}</span></td>
      <td>
        <div class="actions-cell">
          <button class="btn-edit" onclick="openEditModal('${p.id}')">تعديل</button>
          <button class="btn-danger" onclick="confirmDelete('${p.id}', '${esc(p.name)}')">حذف</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ─── RENDER STATS ─────────────────────────────────────
function renderStats() {
  const total     = state.products.length;
  const available = state.products.filter(p => (p.quantity ?? 0) > 5).length;
  const low       = state.products.filter(p => { const q = p.quantity ?? 0; return q > 0 && q <= 5; }).length;
  const out       = state.products.filter(p => (p.quantity ?? 0) === 0).length;

  $('stat-total').textContent     = total;
  $('stat-available').textContent = available;
  $('stat-low').textContent       = low;
  $('stat-out').textContent       = out;
}

// ─── FILTER TABS ──────────────────────────────────────
function renderFilterTabs() {
  const cats = ['all', ...new Set(state.products.map(p => p.category).filter(Boolean))];
  filterTabs.innerHTML = cats.map(c => `
    <button class="filter-tab ${c === state.activeCategory ? 'active' : ''}" data-cat="${c}" onclick="setCategory('${c}')">
      ${c === 'all' ? 'الكل' : c}
    </button>`).join('');
}

function setCategory(cat) {
  state.activeCategory = cat;
  renderFilterTabs();
  renderTable();
}

// ─── QTY INLINE EDIT ──────────────────────────────────
function onQtyChange(id, input) {
  const cell = $(`qty-cell-${id}`);
  const original = parseInt(input.dataset.original);
  const current  = parseInt(input.value);
  cell.classList.toggle('dirty', current !== original);
}

async function saveQty(id, btn) {
  const cell  = btn.closest('.qty-cell');
  const input = cell.querySelector('.qty-input');
  const qty   = parseInt(input.value);
  if (isNaN(qty) || qty < 0) { showToast('كمية غير صحيحة', 'error'); return; }

  btn.textContent = '...';
  btn.disabled    = true;

  try {
    await db.collection('products').doc(id).update({ quantity: qty });
    input.dataset.original = qty;
    cell.classList.remove('dirty');
    showToast('تم تحديث الكمية ✓', 'success');
  } catch (e) {
    showToast('فشل الحفظ', 'error');
    console.error(e);
  } finally {
    btn.textContent = 'حفظ';
    btn.disabled    = false;
  }
}

// ─── ADD PRODUCT FORM ─────────────────────────────────
function setupAddForm() {
  $('add-form-body').innerHTML = `
    <div class="field-group">
      <label class="field-label">اسم المنتج *</label>
      <input class="field-input" id="f-name" type="text" placeholder="مثال: فستان صيفي أنيق" />
    </div>
    <div class="form-row">
      <div class="field-group">
        <label class="field-label">الفئة *</label>
        <select class="field-select" id="f-cat"></select>
      </div>
      <div class="field-group">
        <label class="field-label">الأيقونة (emoji)</label>
        <input class="field-input" id="f-emoji" type="text" placeholder="👗" maxlength="2" style="font-size:22px;text-align:center" />
      </div>
    </div>
    <div class="form-row">
      <div class="field-group">
        <label class="field-label">السعر (ريال) *</label>
        <input class="field-input" id="f-price" type="number" min="0" placeholder="250" />
      </div>
      <div class="field-group">
        <label class="field-label">الكمية *</label>
        <input class="field-input" id="f-qty" type="number" min="0" placeholder="20" />
      </div>
    </div>
    <div class="field-group">
      <label class="field-label">وصف المنتج</label>
      <textarea class="field-textarea" id="f-desc" placeholder="وصف مختصر..."></textarea>
    </div>
    <button class="form-submit" id="add-submit-btn" onclick="submitAddProduct()">إضافة المنتج</button>
  `;
  populateCategorySelect('f-cat');
}

async function submitAddProduct() {
  const name  = $('f-name').value.trim();
  const cat   = $('f-cat').value;
  const emoji = $('f-emoji').value.trim() || '📦';
  const price = parseFloat($('f-price').value);
  const qty   = parseInt($('f-qty').value);
  const desc  = $('f-desc').value.trim();

  if (!name)        { showToast('أدخل اسم المنتج', 'error'); return; }
  if (!cat)         { showToast('اختر الفئة', 'error'); return; }
  if (isNaN(price) || price < 0) { showToast('أدخل سعراً صحيحاً', 'error'); return; }
  if (isNaN(qty)   || qty < 0)   { showToast('أدخل كمية صحيحة', 'error'); return; }

  const btn = $('add-submit-btn');
  btn.disabled    = true;
  btn.textContent = 'جاري الإضافة...';

  try {
    await db.collection('products').add({
      name, category: cat, emoji, price, quantity: qty,
      description: desc,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    // reset form
    ['f-name','f-emoji','f-price','f-qty','f-desc'].forEach(id => $(id).value = '');
    showToast(`تمت إضافة "${name}" ✓`, 'success');
    switchSection('products');
  } catch (e) {
    showToast('فشلت الإضافة، تحقق من Firebase', 'error');
    console.error(e);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'إضافة المنتج';
  }
}

// ─── EDIT MODAL ───────────────────────────────────────
function setupModal() {
  $('modal-close').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
}

function openEditModal(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;

  $('modal-title').textContent = `تعديل: ${p.name}`;
  $('modal-body').innerHTML = `
    <div class="field-group">
      <label class="field-label">اسم المنتج</label>
      <input class="field-input" id="e-name" type="text" value="${esc(p.name)}" />
    </div>
    <div class="form-row">
      <div class="field-group">
        <label class="field-label">الفئة</label>
        <select class="field-select" id="e-cat"></select>
      </div>
      <div class="field-group">
        <label class="field-label">الأيقونة</label>
        <input class="field-input" id="e-emoji" type="text" value="${esc(p.emoji || '')}" maxlength="2" style="font-size:22px;text-align:center" />
      </div>
    </div>
    <div class="form-row">
      <div class="field-group">
        <label class="field-label">السعر</label>
        <input class="field-input" id="e-price" type="number" value="${p.price}" />
      </div>
      <div class="field-group">
        <label class="field-label">الكمية</label>
        <input class="field-input" id="e-qty" type="number" value="${p.quantity ?? 0}" />
      </div>
    </div>
    <div class="field-group">
      <label class="field-label">الوصف</label>
      <textarea class="field-textarea" id="e-desc">${esc(p.description || '')}</textarea>
    </div>
  `;

  // modal footer
  const existingFooter = modalOverlay.querySelector('.modal-footer');
  if (existingFooter) existingFooter.remove();
  const footer = document.createElement('div');
  footer.className = 'modal-footer';
  footer.innerHTML = `
    <button class="btn-secondary" onclick="closeModal()">إلغاء</button>
    <button class="btn-primary"   onclick="submitEdit('${id}')">حفظ التعديلات</button>
  `;
  modalOverlay.querySelector('.modal').appendChild(footer);

  populateCategorySelect('e-cat', p.category);
  openModal();
}

async function submitEdit(id) {
  const data = {
    name:        $('e-name').value.trim(),
    category:    $('e-cat').value,
    emoji:       $('e-emoji').value.trim() || '📦',
    price:       parseFloat($('e-price').value),
    quantity:    parseInt($('e-qty').value),
    description: $('e-desc').value.trim(),
  };

  if (!data.name)           { showToast('أدخل الاسم', 'error'); return; }
  if (isNaN(data.price))    { showToast('سعر غير صحيح', 'error'); return; }
  if (isNaN(data.quantity)) { showToast('كمية غير صحيحة', 'error'); return; }

  try {
    await db.collection('products').doc(id).update(data);
    closeModal();
    showToast('تم حفظ التعديلات ✓', 'success');
  } catch (e) {
    showToast('فشل التعديل', 'error');
    console.error(e);
  }
}

// ─── DELETE ───────────────────────────────────────────
function confirmDelete(id, name) {
  $('modal-title').textContent = 'تأكيد الحذف';
  $('modal-body').innerHTML = `
    <p style="font-size:14px;color:var(--text-dim);line-height:1.7">
      هل تريد حذف المنتج <strong style="color:var(--text)">"${name}"</strong>؟<br/>
      <span style="color:var(--red);font-size:12.5px">هذا الإجراء لا يمكن التراجع عنه.</span>
    </p>
  `;
  const existingFooter = modalOverlay.querySelector('.modal-footer');
  if (existingFooter) existingFooter.remove();
  const footer = document.createElement('div');
  footer.className = 'modal-footer';
  footer.innerHTML = `
    <button class="btn-secondary" onclick="closeModal()">إلغاء</button>
    <button class="btn-danger"    style="height:36px;padding:0 18px;font-size:13px" onclick="deleteProduct('${id}')">حذف</button>
  `;
  modalOverlay.querySelector('.modal').appendChild(footer);
  openModal();
}

async function deleteProduct(id) {
  try {
    await db.collection('products').doc(id).delete();
    closeModal();
    showToast('تم حذف المنتج', 'success');
  } catch (e) {
    showToast('فشل الحذف', 'error');
    console.error(e);
  }
}

// ─── CATEGORIES ───────────────────────────────────────
function loadCategories() {
  db.collection('categories').orderBy('name').onSnapshot(snap => {
    state.categories = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
    renderCatsList();
    populateCategorySelect('f-cat');
  });
}

function renderCatsList() {
  const list = $('cats-list');
  if (state.categories.length === 0) {
    list.innerHTML = `<p style="color:var(--text-faint);font-size:13px;padding:10px 0">لا توجد فئات بعد</p>`;
    return;
  }
  list.innerHTML = state.categories.map(c => `
    <div class="cat-item">
      <span class="cat-item-name">${esc(c.name)}</span>
      <button class="cat-delete-btn" onclick="deleteCategory('${c.id}', '${esc(c.name)}')">✕</button>
    </div>`).join('');
}

async function addCategory() {
  const input = $('new-cat-input');
  const name  = input.value.trim();
  if (!name) { showToast('أدخل اسم الفئة', 'error'); return; }
  if (state.categories.find(c => c.name === name)) { showToast('الفئة موجودة مسبقاً', 'error'); return; }

  try {
    await db.collection('categories').add({ name });
    input.value = '';
    showToast(`تمت إضافة "${name}" ✓`, 'success');
  } catch (e) {
    showToast('فشلت الإضافة', 'error');
  }
}

async function deleteCategory(id, name) {
  const inUse = state.products.some(p => p.category === name);
  if (inUse) { showToast('الفئة مستخدمة في منتجات، لا يمكن حذفها', 'error'); return; }
  try {
    await db.collection('categories').doc(id).delete();
    showToast('تم حذف الفئة', 'success');
  } catch (e) {
    showToast('فشل الحذف', 'error');
  }
}

function populateCategorySelect(selectId, selected = '') {
  const sel = $(selectId);
  if (!sel) return;
  sel.innerHTML = `<option value="">— اختر الفئة —</option>` +
    state.categories.map(c =>
      `<option value="${esc(c.name)}" ${c.name === selected ? 'selected' : ''}>${esc(c.name)}</option>`
    ).join('');
}

// ─── MODAL HELPERS ────────────────────────────────────
function openModal()  { modalOverlay.classList.add('open'); }
function closeModal() {
  modalOverlay.classList.remove('open');
  const footer = modalOverlay.querySelector('.modal-footer');
  if (footer) footer.remove();
  $('modal-body').innerHTML = '';
}

// ─── TOAST ────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = '') {
  toastEl.textContent = msg;
  toastEl.className   = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.className = 'toast'; }, 3000);
}

// ─── UTILS ────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function formatPrice(n) {
  return `${Number(n).toLocaleString('ar-SA')} ر.س`;
}
