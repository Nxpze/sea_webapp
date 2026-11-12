/**
 * Beach Trip WebApp — Main Client Application
 * Vanilla JavaScript (No Frameworks)
 * Strict adherence to style-guide.md and AI-build-guide-final.md
 */

// Application State
const state = {
  user: null, // Logged in user: { f_id, name }
  friends: [],
  trip: null,
  itinerary: [],
  places: [],
  weather: null,
  financeOverview: null,
  centralFund: [],
  expenses: [],
  debtPairs: [],
  repayments: [],
  notifications: [],
  unreadNotifsCount: 0,
  activeTab: 'dashboard',
  financeSubTab: 'overview',
  theme: localStorage.getItem('sea_theme') || 'auto',
  loading: false
};

// ==========================================================================
// Utility & Helper Functions
// ==========================================================================

async function api(path, options = {}) {
  const defaultHeaders = {
    'Accept': 'application/json'
  };
  if (options.body && !(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`/api${path}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      },
      credentials: 'same-origin'
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
    return data;
  } catch (err) {
    console.error(`API Error [${path}]:`, err);
    throw err;
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info'}"></i>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);
  lucide.createIcons({ root: toast });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoney(amount) {
  const num = parseFloat(amount) || 0;
  return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Format Gregorian date string (YYYY-MM-DD) to Thai Buddhist Era (DD/MM/YYYY)
 */
function formatDateBE(dateStr) {
  if (!dateStr) return 'ยังไม่ได้กำหนด';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const yearBE = d.getFullYear() + 543;
    return `${day}/${month}/${yearBE}`;
  } catch (e) {
    return dateStr;
  }
}

function formatDateTimeBE(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const yearBE = d.getFullYear() + 543;
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${yearBE} ${hours}:${mins} น.`;
  } catch (e) {
    return dateStr;
  }
}

function getCountdownDays(targetDateStr) {
  if (!targetDateStr) return null;
  const target = new Date(targetDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Convert file to Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Extract pure base64 without data:image/png;base64,
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

// ==========================================================================
// Theme Management
// ==========================================================================

function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('sea_theme', theme);
  const body = document.body;
  body.classList.remove('theme-light', 'theme-dark');

  if (theme === 'dark') {
    body.classList.add('theme-dark');
  } else if (theme === 'light') {
    body.classList.add('theme-light');
  }
}

function toggleTheme() {
  const current = state.theme;
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  showToast(`เปลี่ยนเป็นโหมด${next === 'dark' ? 'มืด' : 'สว่าง'}แล้วนะ`, 'info');
}

// ==========================================================================
// Initialization & Authentication
// ==========================================================================

async function initApp() {
  applyTheme(state.theme);

  try {
    // 1. Check current session
    const meRes = await api('/auth/me');
    if (meRes.authenticated && meRes.user) {
      state.user = meRes.user;
    }

    // 2. Load members list
    const friendsRes = await api('/auth/friends');
    state.friends = friendsRes.friends || [];

    if (!state.user) {
      renderLoginScreen();
    } else {
      await loadInitialData();
      renderApp();
    }
  } catch (err) {
    console.error('Initialization error:', err);
    renderLoginScreen();
  }
}

async function loadInitialData() {
  try {
    const [tripRes, itinRes, placesRes, notifsRes] = await Promise.all([
      api('/trip').catch(() => ({ trip: null })),
      api('/itinerary').catch(() => ({ days: [] })),
      api('/places').catch(() => ({ places: [] })),
      api('/notifications').catch(() => ({ notifications: [], unreadCount: 0 }))
    ]);

    state.trip = tripRes.trip;
    state.itinerary = itinRes.days || [];
    state.places = placesRes.places || [];
    state.notifications = notifsRes.notifications || [];
    state.unreadNotifsCount = notifsRes.unreadCount || 0;

    // Load weather (Koh Lan)
    loadWeather();
  } catch (err) {
    console.error('Failed to load initial data:', err);
  }
}

async function loadWeather() {
  try {
    const targetDate = state.trip?.trip_start_date || null;
    const query = targetDate ? `?date=${targetDate}` : '';
    const res = await api(`/weather${query}`);
    state.weather = res;
    if (state.activeTab === 'dashboard' || state.activeTab === 'weather') {
      renderContent();
    }
  } catch (err) {
    console.warn('Weather fetch failed:', err.message);
  }
}

// ==========================================================================
// Login & Logout
// ==========================================================================

function renderLoginScreen() {
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="card glass-strong" style="width: 100%; max-width: 400px; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--color-primary-soft); color: var(--color-primary); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            <i data-lucide="palmtree" style="width: 32px; height: 32px;"></i>
          </div>
          <h1>ทริปทะเล 2027 🏖️</h1>
          <p style="color: var(--color-text-muted); font-size: 14px; margin-top: 4px;">เลือกชื่อของเธอแล้วใส่รหัสผ่านเพื่อเข้าสู่ระบบนะ</p>
        </div>

        <form id="login-form">
          <div class="form-group">
            <label class="form-label">
              <i data-lucide="user" style="width: 16px; height: 16px;"></i>
              สมาชิก
            </label>
            <select id="login-friend" class="form-select" required>
              <option value="" disabled selected>-- เลือกชื่อของตัวเอง --</option>
              ${state.friends.map(f => `<option value="${escapeHtml(f.f_id)}">${escapeHtml(f.name)}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">
              <i data-lucide="key" style="width: 16px; height: 16px;"></i>
              รหัสผ่านกลุ่ม (Shared Password)
            </label>
            <input type="password" id="login-password" class="form-input" placeholder="พิมพ์รหัสผ่านกลุ่ม..." required />
          </div>

          <div id="login-error" class="form-error" style="display: none; margin-bottom: 16px;"></div>

          <button type="submit" id="login-btn" class="btn btn-filled btn-block">
            <span>เข้าสู่ระบบ</span>
            <i data-lucide="arrow-right" style="width: 18px; height: 18px;"></i>
          </button>
        </form>
      </div>
    </div>
  `;

  lucide.createIcons({ root });

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f_id = document.getElementById('login-friend').value;
    const password = document.getElementById('login-password').value;
    const errBox = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-btn');

    errBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>รอแป๊บนะ...</span>`;

    try {
      const res = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ f_id, password })
      });

      state.user = res.user;
      showToast(`ยินดีต้อนรับนะคุณ ${res.user.name} 🎉`, 'success');
      await loadInitialData();
      renderApp();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>เข้าสู่ระบบ</span> <i data-lucide="arrow-right" style="width: 18px; height: 18px;"></i>`;
      lucide.createIcons({ root: submitBtn });
    }
  });
}

async function handleLogout() {
  if (!confirm('ต้องการออกจากระบบจริงเหรอ?')) return;
  try {
    await api('/auth/logout', { method: 'POST' });
    state.user = null;
    showToast('ออกจากระบบเรียบร้อยแล้ว บ๊ายบายนะ 👋', 'info');
    renderLoginScreen();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================================================
// Main App Layout Renderer
// ==========================================================================

function renderApp() {
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="app-container">
      <!-- Top Header -->
      <header class="app-header glass">
        <div class="header-brand">
          <i data-lucide="waves" class="header-logo-icon"></i>
          <div class="header-title-group">
            <h1>ทริปทะเลเกาะล้าน</h1>
            <p id="trip-date-badge">${formatDateBE(state.trip?.trip_start_date)} - ${formatDateBE(state.trip?.trip_end_date)}</p>
          </div>
        </div>

        <div class="header-actions">
          <button class="icon-btn" onclick="toggleTheme()" title="สลับธีม สว่าง/มืด">
            <i data-lucide="${state.theme === 'dark' ? 'sun' : 'moon'}" style="width: 20px; height: 20px;"></i>
          </button>

          <button class="icon-btn" onclick="openNotificationsModal()" title="การแจ้งเตือน">
            <i data-lucide="bell" style="width: 20px; height: 20px;"></i>
            ${state.unreadNotifsCount > 0 ? `<span class="notif-badge">${state.unreadNotifsCount}</span>` : ''}
          </button>

          <div class="user-pill" onclick="switchTab('more')">
            <div class="user-avatar">${state.user.name.substring(0, 1)}</div>
            <span>${escapeHtml(state.user.name)}</span>
          </div>
        </div>
      </header>

      <!-- Main Content Area -->
      <main id="main-content" class="content-wrapper"></main>

      <!-- Mobile Bottom Navigation (Style Guide: 5 items, outline icons, fixed 64px) -->
      <nav class="bottom-nav">
        <button class="nav-item ${state.activeTab === 'dashboard' ? 'active' : ''}" onclick="switchTab('dashboard')">
          <i data-lucide="layout-dashboard"></i>
          <span>หน้าแรก</span>
        </button>

        <button class="nav-item ${state.activeTab === 'itinerary' ? 'active' : ''}" onclick="switchTab('itinerary')">
          <i data-lucide="calendar"></i>
          <span>แผนเที่ยว</span>
        </button>

        <button class="nav-item ${state.activeTab === 'places' ? 'active' : ''}" onclick="switchTab('places')">
          <i data-lucide="map-pin"></i>
          <span>สถานที่</span>
        </button>

        <button class="nav-item ${state.activeTab === 'finance' ? 'active' : ''}" onclick="switchTab('finance')">
          <i data-lucide="wallet"></i>
          <span>การเงิน</span>
        </button>

        <button class="nav-item ${state.activeTab === 'more' ? 'active' : ''}" onclick="switchTab('more')">
          <i data-lucide="more-horizontal"></i>
          <span>เพิ่มเติม</span>
        </button>
      </nav>
    </div>
  `;

  lucide.createIcons({ root });
  renderContent();
}

function switchTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick').includes(tabName));
  });
  renderContent();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderContent() {
  const container = document.getElementById('main-content');
  if (!container) return;

  switch (state.activeTab) {
    case 'dashboard':
      renderDashboard(container);
      break;
    case 'itinerary':
      renderItinerary(container);
      break;
    case 'places':
      renderPlaces(container);
      break;
    case 'finance':
      renderFinanceHub(container);
      break;
    case 'more':
      renderMoreMenu(container);
      break;
    default:
      renderDashboard(container);
  }

  lucide.createIcons({ root: container });
}

// ==========================================================================
// 1. Dashboard View
// ==========================================================================

async function renderDashboard(container) {
  container.innerHTML = `<div class="spinner"></div>`;

  // Fetch overview data
  let finance = null;
  try {
    const res = await api('/finance/overview');
    finance = res;
    state.financeOverview = res;
  } catch (e) {
    console.warn('Dashboard finance overview fetch failed:', e);
  }

  const daysLeft = getCountdownDays(state.trip?.trip_start_date);
  const weatherPreview = state.weather?.currentDays?.[0] || null;

  container.innerHTML = `
    <!-- Countdown & Trip Banner -->
    <div class="card glass" style="background: linear-gradient(135deg, var(--color-primary-soft), var(--glass-bg));">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span class="badge badge-primary">เตรียมตัวไปทะเล</span>
          <h2 style="margin-top: 6px;">
            ${daysLeft !== null 
              ? (daysLeft > 0 ? `อีก ${daysLeft} วัน จะถึงวันเที่ยวแล้ว! 🌴` : daysLeft === 0 ? `วันนี้เดินทางแล้ว! เย้! 🎉` : `ทริปจบไปแล้ว แต่ความทรงจำยังอยู่ 🌊`)
              : 'ยังไม่ได้ระบุวันเดินทางทริป'}
          </h2>
          <p style="font-size: 13px; color: var(--color-text-muted); margin-top: 2px;">
            สมาชิกทั้งหมด ${state.friends.length} คน • เกาะล้าน ชลบุรี
          </p>
        </div>
        ${state.weather ? `
          <div style="text-align: right; background: var(--color-surface); padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
            <div style="font-size: 12px; color: var(--color-text-muted);">อากาศเกาะล้าน</div>
            <div style="font-size: 18px; font-weight: 700; color: var(--color-primary-strong);">${weatherPreview ? `${weatherPreview.tempMax}°C` : '-'}</div>
            <div style="font-size: 11px; color: var(--color-text-muted);">${weatherPreview ? weatherPreview.condition : 'ปกติ'}</div>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Personal Overview of Current User -->
    <div class="card glass">
      <div class="card-header">
        <h3 class="card-title">
          <i data-lucide="user-check" style="width: 18px; height: 18px; color: var(--color-primary); vertical-align: -3px;"></i>
          สรุปยอดของ ${escapeHtml(state.user.name)}
        </h3>
        <span class="badge badge-accent">ส่วนตัว</span>
      </div>
      <div class="stats-grid">
        <div class="stat-card glass" style="background: var(--color-surface);">
          <span class="stat-label">ฉันสมทบกองกลาง</span>
          <span class="stat-val stat-val-primary">฿${formatMoney(finance?.mySummary?.centralFundPaid || 0)}</span>
        </div>
        <div class="stat-card glass" style="background: var(--color-surface);">
          <span class="stat-label">ฉันสำรองจ่ายไป</span>
          <span class="stat-val stat-val-primary">฿${formatMoney(finance?.mySummary?.expensesPaid || 0)}</span>
        </div>
        <div class="stat-card glass" style="background: var(--color-surface);">
          <span class="stat-label">หนี้ที่ฉันต้องจ่ายคนอื่น</span>
          <span class="stat-val ${finance?.mySummary?.debtsToPay > 0 ? 'stat-val-accent' : ''}">฿${formatMoney(finance?.mySummary?.debtsToPay || 0)}</span>
        </div>
        <div class="stat-card glass" style="background: var(--color-surface);">
          <span class="stat-label">คนอื่นค้างจ่ายฉัน</span>
          <span class="stat-val" style="color: var(--color-success);">฿${formatMoney(finance?.mySummary?.debtsToReceive || 0)}</span>
        </div>
      </div>
    </div>

    <!-- Group Finance Overview -->
    <div class="card glass">
      <div class="card-header">
        <h3 class="card-title">
          <i data-lucide="pie-chart" style="width: 18px; height: 18px; color: var(--color-primary); vertical-align: -3px;"></i>
          ภาพรวมการเงินกลุ่ม
        </h3>
        <button class="btn btn-sm btn-secondary" onclick="switchTab('finance')">ดูทั้งหมด</button>
      </div>
      <div class="stats-grid">
        <div class="stat-card glass" style="background: var(--color-surface);">
          <span class="stat-label">ยอดเงินกองกลางรวม</span>
          <span class="stat-val stat-val-primary">฿${formatMoney(finance?.centralFundTotal || 0)}</span>
        </div>
        <div class="stat-card glass" style="background: var(--color-surface);">
          <span class="stat-label">ค่าใช้จ่ายรวมทั้งหมด</span>
          <span class="stat-val stat-val-primary">฿${formatMoney(finance?.expensesTotal || 0)}</span>
        </div>
      </div>

      <!-- Quick Actions -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 6px;">
        <button class="btn btn-filled btn-sm" onclick="openCentralFundModal()">
          <i data-lucide="plus-circle" style="width: 16px; height: 16px;"></i>
          <span>เติมเงินกองกลาง</span>
        </button>
        <button class="btn btn-sm" onclick="openExpenseModal()">
          <i data-lucide="receipt" style="width: 16px; height: 16px;"></i>
          <span>บันทึกค่าใช้จ่าย</span>
        </button>
      </div>
    </div>

    <!-- Highlight Places (Hotel & Koh Lan) -->
    <div class="card glass">
      <div class="card-header">
        <h3 class="card-title">
          <i data-lucide="map-pinned" style="width: 18px; height: 18px; color: var(--color-primary); vertical-align: -3px;"></i>
          สถานที่หลักของทริป
        </h3>
        <button class="btn btn-sm btn-secondary" onclick="switchTab('places')">ดูทั้งหมด</button>
      </div>

      <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
        <!-- Koh Lan Card -->
        <div class="glass" style="display: flex; gap: 12px; overflow: hidden; padding: 12px; border-radius: var(--radius-md);">
          <img src="/data/pic/kholan.jpeg" alt="เกาะล้าน" style="width: 90px; height: 90px; object-fit: cover; border-radius: var(--radius-sm);" />
          <div style="display: flex; flex-direction: column; justify-content: center; gap: 4px;">
            <span class="badge badge-primary" style="width: fit-content;">เกาะล้าน</span>
            <div style="font-weight: 600; font-size: 15px;">เกาะล้าน พัทยา</div>
            <p style="font-size: 12px; color: var(--color-text-muted);">นั่งเล่นช่วงเย็นดูพระอาทิตย์ตก ฟินสุด ๆ</p>
            <a href="https://maps.app.goo.gl/7t1YWUuHURgrhvRq7" target="_blank" rel="noopener" style="font-size: 12px; font-weight: 600;">เปิด Google Maps &rarr;</a>
          </div>
        </div>

        <!-- Chalita Goodview Card -->
        <div class="glass" style="display: flex; gap: 12px; overflow: hidden; padding: 12px; border-radius: var(--radius-md);">
          <img src="/data/pic/hotel.jpeg" alt="ชลิตา กู๊ดวิว" style="width: 90px; height: 90px; object-fit: cover; border-radius: var(--radius-sm);" />
          <div style="display: flex; flex-direction: column; justify-content: center; gap: 4px;">
            <span class="badge badge-accent" style="width: fit-content;">ที่พัก (กำลังพิจารณา)</span>
            <div style="font-weight: 600; font-size: 15px;">ชลิตา กู๊ดวิว</div>
            <p style="font-size: 12px; color: var(--color-text-muted);">ราคาประมาณ 990 บาท/คืน (ยังไม่ยืนยันการจอง)</p>
            <a href="https://maps.app.goo.gl/ZfTXBdAXYt9ib1pr5" target="_blank" rel="noopener" style="font-size: 12px; font-weight: 600;">เปิด Google Maps &rarr;</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==========================================================================
// 2. Itinerary View (Calendar / Plan)
// ==========================================================================

let selectedDayIndex = 1;

function renderItinerary(container) {
  if (!state.itinerary || state.itinerary.length === 0) {
    container.innerHTML = `
      <div class="card glass empty-state">
        <i data-lucide="calendar-x" class="empty-state-icon"></i>
        <h3>ยังไม่มีข้อมูลแผนการเดินทาง</h3>
        <p>ไม่พบรายการใน plan.json เลย</p>
      </div>
    `;
    return;
  }

  const selectedDay = state.itinerary.find(d => d.dayIndex === selectedDayIndex) || state.itinerary[0];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h2>แผนการเดินทาง (${state.itinerary.length} วัน)</h2>
    </div>

    <!-- Day Selector Tabs -->
    <div class="tabs-nav">
      ${state.itinerary.map(day => `
        <button class="tab-btn ${day.dayIndex === selectedDay.dayIndex ? 'active' : ''}" 
                onclick="selectItineraryDay(${day.dayIndex})">
          วันที่ ${day.dayIndex} (${day.dateInfo ? day.dateInfo.dateBE.substring(0, 5) : day.key})
        </button>
      `).join('')}
    </div>

    <!-- Day Header -->
    <div class="card glass">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <div>
          <span class="badge badge-primary">วันที่ ${selectedDay.dayIndex}</span>
          <h3 style="margin-top: 6px;">${escapeHtml(selectedDay.title)}</h3>
          <p style="font-size: 13px; color: var(--color-text-muted);">
            วันที่ตามแผน: ${selectedDay.dateInfo ? selectedDay.dateInfo.dateBE : selectedDay.key}
          </p>
        </div>
        <span style="font-size: 13px; color: var(--color-text-muted);">${selectedDay.activities.length} กิจกรรม</span>
      </div>
    </div>

    <!-- Timeline of Activities -->
    <div class="timeline-list">
      ${selectedDay.activities.map((act, idx) => `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-time">${escapeHtml(act.time_begin)} - ${escapeHtml(act.time_end)}</div>
          
          <div class="card glass timeline-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <h4 style="font-size: 16px; font-weight: 600;">${escapeHtml(act.name)}</h4>
              ${act.price ? `<span class="badge badge-accent">${escapeHtml(act.price)}</span>` : ''}
            </div>

            ${act.note ? `<p style="font-size: 14px; color: var(--color-text-muted);">${escapeHtml(act.note)}</p>` : ''}

            ${act.mapUrl ? `
              <div style="margin-top: 4px;">
                <a href="${escapeHtml(act.mapUrl)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary" style="display: inline-flex;">
                  <i data-lucide="navigation" style="width: 14px; height: 14px;"></i>
                  <span>เปิด Google Maps</span>
                </a>
              </div>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function selectItineraryDay(dayIndex) {
  selectedDayIndex = dayIndex;
  renderContent();
}

// ==========================================================================
// 3. Places View
// ==========================================================================

let placeCategoryFilter = 'all';

function renderPlaces(container) {
  const filtered = state.places.filter(p => {
    if (placeCategoryFilter === 'all') return true;
    return p.category === placeCategoryFilter;
  });

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h2>สถานที่สำคัญ (${state.places.length})</h2>
    </div>

    <!-- Category Filter Tabs -->
    <div class="tabs-nav">
      <button class="tab-btn ${placeCategoryFilter === 'all' ? 'active' : ''}" onclick="filterPlaces('all')">ทั้งหมด</button>
      <button class="tab-btn ${placeCategoryFilter === 'attraction' ? 'active' : ''}" onclick="filterPlaces('attraction')">ที่เที่ยว</button>
      <button class="tab-btn ${placeCategoryFilter === 'accommodation' ? 'active' : ''}" onclick="filterPlaces('accommodation')">ที่พัก</button>
      <button class="tab-btn ${placeCategoryFilter === 'transit' ? 'active' : ''}" onclick="filterPlaces('transit')">การเดินทาง</button>
    </div>

    <!-- Places Grid -->
    <div class="places-grid">
      ${filtered.map(p => `
        <div class="card glass place-card">
          ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" class="place-card-img" />` : ''}
          
          <div class="place-card-body">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span class="badge ${p.category === 'accommodation' ? 'badge-accent' : 'badge-primary'}">
                  ${p.category === 'accommodation' ? 'ที่พัก (ยังไม่จอง)' : p.category === 'attraction' ? 'สถานที่ท่องเที่ยว' : 'การเดินทาง'}
                </span>
                <h3 style="margin-top: 6px;">${escapeHtml(p.name)}</h3>
              </div>
              ${p.price ? `<span class="badge badge-accent">${escapeHtml(p.price)}</span>` : ''}
            </div>

            ${p.note ? `<p style="font-size: 14px; color: var(--color-text-muted);">${escapeHtml(p.note)}</p>` : ''}

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding-top: 10px; border-top: 1px solid var(--color-border);">
              <span style="font-size: 12px; color: var(--color-text-muted);">
                ปรากฏในแผนวันที่: ${p.daysAppearing ? p.daysAppearing.join(', ') : '-'}
              </span>

              ${p.mapUrl ? `
                <a href="${escapeHtml(p.mapUrl)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary">
                  <i data-lucide="map" style="width: 14px; height: 14px;"></i>
                  <span>แผนที่</span>
                </a>
              ` : ''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function filterPlaces(cat) {
  placeCategoryFilter = cat;
  renderContent();
}

// ==========================================================================
// 4. Finance Hub & Sub-pages
// ==========================================================================

function renderFinanceHub(container) {
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h2>ระบบการเงินกลุ่ม 💰</h2>
    </div>

    <!-- Finance Sub-Nav Tabs -->
    <div class="tabs-nav">
      <button class="tab-btn ${state.financeSubTab === 'overview' ? 'active' : ''}" onclick="switchFinanceTab('overview')">ภาพรวม & กราฟ</button>
      <button class="tab-btn ${state.financeSubTab === 'central-fund' ? 'active' : ''}" onclick="switchFinanceTab('central-fund')">เงินกองกลาง</button>
      <button class="tab-btn ${state.financeSubTab === 'expenses' ? 'active' : ''}" onclick="switchFinanceTab('expenses')">ค่าใช้จ่าย</button>
      <button class="tab-btn ${state.financeSubTab === 'debt' ? 'active' : ''}" onclick="switchFinanceTab('debt')">รายการหนี้</button>
      <button class="tab-btn ${state.financeSubTab === 'repayments' ? 'active' : ''}" onclick="switchFinanceTab('repayments')">ประวัติชำระเงิน</button>
    </div>

    <div id="finance-sub-content"></div>
  `;

  renderFinanceSubContent();
}

function switchFinanceTab(subTab) {
  state.financeSubTab = subTab;
  document.querySelectorAll('.tabs-nav .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick').includes(subTab));
  });
  renderFinanceSubContent();
}

async function renderFinanceSubContent() {
  const container = document.getElementById('finance-sub-content');
  if (!container) return;

  container.innerHTML = `<div class="spinner"></div>`;

  switch (state.financeSubTab) {
    case 'overview':
      await renderFinanceOverviewSub(container);
      break;
    case 'central-fund':
      await renderCentralFundSub(container);
      break;
    case 'expenses':
      await renderExpensesSub(container);
      break;
    case 'debt':
      await renderDebtSub(container);
      break;
    case 'repayments':
      await renderRepaymentsSub(container);
      break;
  }

  lucide.createIcons({ root: container });
}

// --- 4.1 Finance Overview & Charts ---
async function renderFinanceOverviewSub(container) {
  const data = await api('/finance/overview');
  state.financeOverview = data;

  const maxExpense = Math.max(...(data.expensesByMember.map(m => m.amount) || [1]), 1);
  const maxCategory = Math.max(...(data.expensesByCategory.map(c => c.amount) || [1]), 1);

  container.innerHTML = `
    <!-- Top Summary Stats -->
    <div class="stats-grid">
      <div class="stat-card glass" style="background: var(--color-surface);">
        <span class="stat-label">ยอดเงินกองกลางสะสม</span>
        <span class="stat-val stat-val-primary">฿${formatMoney(data.centralFundTotal)}</span>
      </div>
      <div class="stat-card glass" style="background: var(--color-surface);">
        <span class="stat-label">ค่าใช้จ่ายรวมทั้งหมด</span>
        <span class="stat-val stat-val-primary">฿${formatMoney(data.expensesTotal)}</span>
      </div>
      <div class="stat-card glass" style="background: var(--color-surface);">
        <span class="stat-label">ยอดหนี้ค้างชำระรวม</span>
        <span class="stat-val ${data.totalDebt > 0 ? 'stat-val-accent' : ''}">฿${formatMoney(data.totalDebt)}</span>
      </div>
      <div class="stat-card glass" style="background: var(--color-surface);">
        <span class="stat-label">จำนวนสมาชิกในทริป</span>
        <span class="stat-val">${data.centralFundByMember.length} คน</span>
      </div>
    </div>

    <!-- Chart: Expenses by Category -->
    <div class="card glass">
      <h3 class="card-title">
        <i data-lucide="tag" style="width: 18px; height: 18px; color: var(--color-primary); vertical-align: -3px;"></i>
        ค่าใช้จ่ายแยกตามหมวดหมู่
      </h3>
      
      ${data.expensesByCategory.length === 0 ? `
        <div class="empty-state" style="padding: 20px;">
          <p>ยังไม่มีรายการค่าใช้จ่ายเลย เริ่มบันทึกอันแรกกันเลย</p>
        </div>
      ` : `
        <div class="chart-container">
          ${data.expensesByCategory.map(cat => {
            const pct = Math.round((cat.amount / maxCategory) * 100);
            return `
              <div class="chart-bar-row">
                <div class="chart-bar-label">
                  <span>${escapeHtml(cat.type)}</span>
                  <b>฿${formatMoney(cat.amount)}</b>
                </div>
                <div class="chart-bar-track">
                  <div class="chart-bar-fill" style="width: ${pct}%;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>

    <!-- Chart: Spending by Member -->
    <div class="card glass">
      <h3 class="card-title">
        <i data-lucide="users" style="width: 18px; height: 18px; color: var(--color-primary); vertical-align: -3px;"></i>
        ยอดสำรองจ่ายแยกตามสมาชิก
      </h3>

      <div class="chart-container">
        ${data.expensesByMember.map(m => {
          const pct = Math.round((m.amount / maxExpense) * 100);
          return `
            <div class="chart-bar-row">
              <div class="chart-bar-label">
                <span>${escapeHtml(m.name)}</span>
                <b>฿${formatMoney(m.amount)}</b>
              </div>
              <div class="chart-bar-track">
                <div class="chart-bar-fill accent" style="width: ${pct}%;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Central Fund contributions per member -->
    <div class="card glass">
      <h3 class="card-title">
        <i data-lucide="banknote" style="width: 18px; height: 18px; color: var(--color-primary); vertical-align: -3px;"></i>
        ยอดสมทบเงินกองกลางของแต่ละคน
      </h3>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${data.centralFundByMember.map(m => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--color-border);">
            <span>${escapeHtml(m.name)}</span>
            <b style="color: var(--color-primary-strong);">฿${formatMoney(m.amount)}</b>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// --- 4.2 Central Fund Sub ---
async function renderCentralFundSub(container) {
  const data = await api('/finance/central-fund');
  state.centralFund = data.items || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <h3 style="font-size: 18px;">ประวัติการเติมเงินกองกลาง</h3>
      <button class="btn btn-filled btn-sm" onclick="openCentralFundModal()">
        <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
        <span>เติมเงินกองกลาง</span>
      </button>
    </div>

    ${state.centralFund.length === 0 ? `
      <div class="card glass empty-state">
        <i data-lucide="inbox" class="empty-state-icon"></i>
        <h3>ยังไม่มีรายการเงินกองกลางเลย</h3>
        <p>แตะปุ่มด้านบนเพื่อส่งสลิปเติมเงินกองกลางคนแรกกันเลยนะ!</p>
      </div>
    ` : `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${state.centralFund.map(item => `
          <div class="card glass" style="${item.is_void ? 'opacity: 0.6;' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <b>${escapeHtml(item.member_name)}</b>
                  ${item.is_void ? `<span class="badge badge-void">ยกเลิกแล้ว</span>` : `<span class="badge badge-success">สำเร็จ</span>`}
                </div>
                <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 2px;">
                  วันที่: ${formatDateBE(item.date)} • รหัส: ${escapeHtml(item.slips_id)}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 18px; font-weight: 700; color: ${item.is_void ? 'var(--color-text-muted)' : 'var(--color-primary-strong)'};">
                  ฿${formatMoney(item.amount_c)}
                </div>
              </div>
            </div>

            ${item.is_void && item.void_reason ? `
              <div style="font-size: 13px; color: var(--color-error); background: var(--color-error-soft); padding: 6px 10px; border-radius: var(--radius-sm);">
                เหตุผลที่ยกเลิก: ${escapeHtml(item.void_reason)}
              </div>
            ` : ''}

            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; padding-top: 10px; border-top: 1px solid var(--color-border);">
              ${item.signed_url ? `
                <button class="btn btn-sm btn-secondary" onclick="viewSlip('${escapeHtml(item.signed_url)}', 'สลิปกองกลาง ${escapeHtml(item.slips_id)}')">
                  <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
                  <span>ดูสลิป</span>
                </button>
              ` : ''}

              ${!item.is_void && item.f_id === state.user.f_id ? `
                <button class="btn btn-sm btn-danger" onclick="openVoidModal('central_fund', '${escapeHtml(item.slips_id)}')">
                  <i data-lucide="x-circle" style="width: 14px; height: 14px;"></i>
                  <span>ยกเลิกรายการ</span>
                </button>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

// --- 4.3 Expenses Sub ---
async function renderExpensesSub(container) {
  const data = await api('/finance/expenses');
  state.expenses = data.expenses || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <h3 style="font-size: 18px;">รายการค่าใช้จ่ายสำรองจ่าย</h3>
      <button class="btn btn-filled btn-sm" onclick="openExpenseModal()">
        <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
        <span>บันทึกค่าใช้จ่าย</span>
      </button>
    </div>

    ${state.expenses.length === 0 ? `
      <div class="card glass empty-state">
        <i data-lucide="receipt" class="empty-state-icon"></i>
        <h3>ยังไม่มีรายการค่าใช้จ่ายเลย</h3>
        <p>เมื่อมีใครสำรองจ่ายค่าอาหารหรือค่ากิจกรรม สามารถบันทึกที่นี่ได้เลยนะ</p>
      </div>
    ` : `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${state.expenses.map(exp => `
          <div class="card glass" style="${exp.is_void ? 'opacity: 0.6;' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="badge badge-primary">${escapeHtml(exp.type)}</span>
                  ${exp.is_void ? `<span class="badge badge-void">ยกเลิกแล้ว</span>` : ''}
                  ${!exp.is_void && exp.hasSplits ? `<span class="badge badge-success">หารแล้ว (${exp.splits.length} คน)</span>` : ''}
                </div>
                <h4 style="font-size: 16px; font-weight: 600; margin-top: 6px;">
                  ${escapeHtml(exp.description || exp.type)}
                </h4>
                <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 2px;">
                  ผู้สำรองจ่าย: <b>${escapeHtml(exp.payer_name)}</b> • วันที่: ${formatDateBE(exp.date)}
                </div>
              </div>

              <div style="text-align: right;">
                <div style="font-size: 19px; font-weight: 700; color: ${exp.is_void ? 'var(--color-text-muted)' : 'var(--color-primary-strong)'};">
                  ฿${formatMoney(exp.amount_e)}
                </div>
              </div>
            </div>

            ${exp.is_void && exp.void_reason ? `
              <div style="font-size: 13px; color: var(--color-error); background: var(--color-error-soft); padding: 6px 10px; border-radius: var(--radius-sm);">
                เหตุผลที่ยกเลิก: ${escapeHtml(exp.void_reason)}
              </div>
            ` : ''}

            <!-- Splits Preview if any -->
            ${exp.splits && exp.splits.length > 0 ? `
              <div style="background: var(--color-surface); padding: 10px 14px; border-radius: var(--radius-md); font-size: 13px; display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--color-border);">
                <div style="font-weight: 600; color: var(--color-text-muted); font-size: 12px;">สมาชิกร่วมหาร:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  ${exp.splits.map(s => `
                    <span class="badge badge-secondary" style="font-size: 11px;">
                      ${escapeHtml(s.participant_name)}: ฿${formatMoney(s.amount_r)}
                      ${s.settlement_id ? '✓' : ''}
                    </span>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Action Buttons -->
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; padding-top: 10px; border-top: 1px solid var(--color-border); flex-wrap: wrap;">
              ${exp.signed_url ? `
                <button class="btn btn-sm btn-secondary" onclick="viewSlip('${escapeHtml(exp.signed_url)}', 'สลิป ${escapeHtml(exp.type)}')">
                  <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
                  <span>ดูสลิป</span>
                </button>
              ` : ''}

              ${!exp.is_void && !exp.hasSplits && exp.f_id === state.user.f_id ? `
                <button class="btn btn-sm btn-filled" onclick="openSplitModal('${escapeHtml(exp.expenses_id)}', ${exp.amount_e})">
                  <i data-lucide="split" style="width: 14px; height: 14px;"></i>
                  <span>แบ่งค่าใช้จ่าย</span>
                </button>
              ` : ''}

              ${!exp.is_void && exp.f_id === state.user.f_id && !exp.hasSettledDebt ? `
                <button class="btn btn-sm btn-danger" onclick="openVoidModal('expense', '${escapeHtml(exp.expenses_id)}')">
                  <i data-lucide="x-circle" style="width: 14px; height: 14px;"></i>
                  <span>ยกเลิก</span>
                </button>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

// --- 4.4 Debt List Sub ---
async function renderDebtSub(container) {
  const data = await api('/finance/debt');
  state.debtPairs = data.debtPairs || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <h3 style="font-size: 18px;">รายการหนี้คงค้างระหว่างสมาชิก</h3>
    </div>

    ${state.debtPairs.length === 0 ? `
      <div class="card glass empty-state">
        <i data-lucide="smile" class="empty-state-icon" style="color: var(--color-success); opacity: 1;"></i>
        <h3>ไม่มีหนี้ค้างชำระเลย!</h3>
        <p>ทุกคนเคลียร์หนี้เรียบร้อย หรือยังไม่มีการแบ่งค่าใช้จ่ายจ้า</p>
      </div>
    ` : `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${state.debtPairs.map(pair => {
          const isMyDebt = pair.debtor_id === state.user.f_id;
          const isMyCredit = pair.creditor_id === state.user.f_id;

          return `
            <div class="card glass" style="${isMyDebt ? 'border-color: var(--color-accent);' : ''}">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px; font-weight: 700;">${escapeHtml(pair.debtor_name)}</span>
                    <i data-lucide="arrow-right" style="width: 16px; height: 16px; color: var(--color-text-muted);"></i>
                    <span style="font-size: 16px; font-weight: 700; color: var(--color-primary-strong);">${escapeHtml(pair.creditor_name)}</span>
                  </div>
                  <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 4px;">
                    รวมทั้งหมด ${pair.splits.length} รายการค่าใช้จ่าย
                  </div>
                </div>

                <div style="text-align: right;">
                  <div style="font-size: 20px; font-weight: 700; color: var(--color-accent);">
                    ฿${formatMoney(pair.total_debt)}
                  </div>
                </div>
              </div>

              <!-- Splits breakdown collapsible -->
              <details style="margin-top: 8px; font-size: 13px;">
                <summary style="cursor: pointer; color: var(--color-primary); font-weight: 500;">
                  ดูรายละเอียดค่าใช้จ่าย (${pair.splits.length} รายการ)
                </summary>
                <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px; padding-left: 10px; border-left: 2px solid var(--color-border);">
                  ${pair.splits.map(s => `
                    <div style="display: flex; justify-content: space-between;">
                      <span>${escapeHtml(s.expense_desc || s.expense_type)} (${formatDateBE(s.expense_date)})</span>
                      <b>฿${formatMoney(s.amount)}</b>
                    </div>
                  `).join('')}
                </div>
              </details>

              <!-- Payment Action Button -->
              <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; padding-top: 10px; border-top: 1px solid var(--color-border);">
                ${isMyDebt ? `
                  <button class="btn btn-filled btn-sm" onclick="openSettlementModal('${escapeHtml(pair.debtor_id)}', '${escapeHtml(pair.creditor_id)}', '${escapeHtml(pair.creditor_name)}', ${pair.total_debt})">
                    <i data-lucide="check-check" style="width: 16px; height: 16px;"></i>
                    <span>ชำระหนี้ทั้งหมด (฿${formatMoney(pair.total_debt)})</span>
                  </button>
                ` : `
                  <span style="font-size: 13px; color: var(--color-text-muted); align-self: center;">
                    ${isMyCredit ? 'รอเพื่อนโอนชำระเงิน' : ''}
                  </span>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;
}

// --- 4.5 Repayments Sub ---
async function renderRepaymentsSub(container) {
  const data = await api('/finance/repayments');
  state.repayments = data.items || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <h3 style="font-size: 18px;">ประวัติการชำระหนี้</h3>
    </div>

    ${state.repayments.length === 0 ? `
      <div class="card glass empty-state">
        <i data-lucide="clock" class="empty-state-icon"></i>
        <h3>ยังไม่มีประวัติการชำระหนี้</h3>
        <p>เมื่อมีการชำระหนี้และแนบสลิป ประวัติจะแสดงที่นี่นะ</p>
      </div>
    ` : `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${state.repayments.map(item => `
          <div class="card glass" style="${item.is_void ? 'opacity: 0.6;' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <b>${escapeHtml(item.debtor_name)}</b>
                  <i data-lucide="arrow-right" style="width: 14px; height: 14px; color: var(--color-text-muted);"></i>
                  <b>${escapeHtml(item.creditor_name)}</b>
                  ${item.is_void ? `<span class="badge badge-void">ยกเลิกแล้ว</span>` : `<span class="badge badge-success">ชำระแล้ว</span>`}
                </div>
                <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 2px;">
                  วันที่: ${formatDateBE(item.date)} • รหัส: ${escapeHtml(item.settlement_id)}
                </div>
                ${item.description ? `<p style="font-size: 13px; color: var(--color-text-muted); margin-top: 4px;">${escapeHtml(item.description)}</p>` : ''}
              </div>

              <div style="text-align: right;">
                <div style="font-size: 19px; font-weight: 700; color: ${item.is_void ? 'var(--color-text-muted)' : 'var(--color-success)'};">
                  ฿${formatMoney(item.amount_s)}
                </div>
              </div>
            </div>

            ${item.is_void && item.void_reason ? `
              <div style="font-size: 13px; color: var(--color-error); background: var(--color-error-soft); padding: 6px 10px; border-radius: var(--radius-sm); margin-top: 6px;">
                เหตุผลที่ยกเลิก: ${escapeHtml(item.void_reason)}
              </div>
            ` : ''}

            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; padding-top: 10px; border-top: 1px solid var(--color-border);">
              ${item.signed_url ? `
                <button class="btn btn-sm btn-secondary" onclick="viewSlip('${escapeHtml(item.signed_url)}', 'สลิปชำระหนี้ ${escapeHtml(item.settlement_id)}')">
                  <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
                  <span>ดูสลิป</span>
                </button>
              ` : ''}

              ${!item.is_void && item.debtor_id === state.user.f_id ? `
                <button class="btn btn-sm btn-danger" onclick="openVoidModal('settlement', '${escapeHtml(item.settlement_id)}')">
                  <i data-lucide="x-circle" style="width: 14px; height: 14px;"></i>
                  <span>ยกเลิก</span>
                </button>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

// ==========================================================================
// 5. More / Profile & Settings
// ==========================================================================

function renderMoreMenu(container) {
  container.innerHTML = `
    <h2>การตั้งค่าและประวัติ ⚙️</h2>

    <!-- User Profile Card -->
    <div class="card glass">
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--color-primary); color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700;">
          ${state.user.name.substring(0, 1)}
        </div>
        <div>
          <h3 style="font-size: 18px;">${escapeHtml(state.user.name)}</h3>
          <p style="font-size: 13px; color: var(--color-text-muted);">รหัสสมาชิก: ${escapeHtml(state.user.f_id)}</p>
        </div>
      </div>
    </div>

    <!-- Project Settings (Trip Dates) -->
    <div class="card glass">
      <div class="card-header">
        <h3 class="card-title">
          <i data-lucide="calendar-range" style="width: 18px; height: 18px; color: var(--color-primary); vertical-align: -3px;"></i>
          กำหนดวันเดินทางของทริป
        </h3>
      </div>
      <p style="font-size: 13px; color: var(--color-text-muted);">
        วันเดินทางจะเชื่อมโยงไปยังการนับถอยหลัง, แผนเที่ยว และการพยากรณ์อากาศ
      </p>

      <form id="trip-settings-form" style="margin-top: 10px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="form-group">
            <label class="form-label">วันเริ่มต้นทริป</label>
            <input type="date" id="trip-start-date" class="form-input" value="${state.trip?.trip_start_date ? state.trip.trip_start_date.split('T')[0] : ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">วันสิ้นสุดทริป</label>
            <input type="date" id="trip-end-date" class="form-input" value="${state.trip?.trip_end_date ? state.trip.trip_end_date.split('T')[0] : ''}" />
          </div>
        </div>

        <button type="submit" class="btn btn-filled btn-sm">
          <i data-lucide="save" style="width: 16px; height: 16px;"></i>
          <span>บันทึกวันทริป</span>
        </button>
      </form>
    </div>

    <!-- Weather Section Full -->
    <div class="card glass">
      <div class="card-header">
        <h3 class="card-title">
          <i data-lucide="cloud-sun" style="width: 18px; height: 18px; color: var(--color-primary); vertical-align: -3px;"></i>
          พยากรณ์อากาศเกาะล้าน (Open-Meteo)
        </h3>
      </div>

      ${state.weather?.horizonMessage ? `
        <div style="font-size: 13px; color: var(--color-warning); background: var(--color-warning-soft); padding: 8px 12px; border-radius: var(--radius-sm);">
          ${escapeHtml(state.weather.horizonMessage)}
        </div>
      ` : ''}

      <div class="weather-scroll">
        ${(state.weather?.currentDays || []).map(d => `
          <div class="card glass weather-day-card">
            <span style="font-size: 12px; font-weight: 600;">${d.date.substring(5)}</span>
            <span style="font-size: 18px; font-weight: 700; color: var(--color-primary-strong);">${d.tempMax}°</span>
            <span style="font-size: 11px; color: var(--color-text-muted);">${d.tempMin}°</span>
            <span style="font-size: 11px; margin-top: 4px;">${escapeHtml(d.condition)}</span>
            ${d.precipProb !== null ? `
              <span class="badge badge-primary" style="font-size: 10px; margin-top: 4px;">
                ☔ ${d.precipProb}%
              </span>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Audit Logs Viewer -->
    <div class="card glass">
      <div class="card-header">
        <h3 class="card-title">
          <i data-lucide="history" style="width: 18px; height: 18px; color: var(--color-primary); vertical-align: -3px;"></i>
          ประวัติการเปลี่ยนแปลง (Audit Logs)
        </h3>
        <button class="btn btn-sm btn-secondary" onclick="openAuditLogsModal()">ดูประวัติ</button>
      </div>
      <p style="font-size: 13px; color: var(--color-text-muted);">
        บันทึกทุกเหตุการณ์ทางการเงิน, การแก้สลิป, การยกเลิกรายการ และการแก้วันทริป
      </p>
    </div>

    <!-- Logout -->
    <button class="btn btn-danger btn-block" onclick="handleLogout()" style="margin-top: 10px;">
      <i data-lucide="log-out" style="width: 18px; height: 18px;"></i>
      <span>ออกจากระบบ</span>
    </button>
  `;

  document.getElementById('trip-settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const startDate = document.getElementById('trip-start-date').value;
    const endDate = document.getElementById('trip-end-date').value;

    try {
      await api('/trip', {
        method: 'PUT',
        body: JSON.stringify({ trip_start_date: startDate || null, trip_end_date: endDate || null })
      });
      showToast('บันทึกวันทริปเรียบร้อยแล้วจ้า', 'success');
      await loadInitialData();
      renderApp();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// ==========================================================================
// Modals & User Actions
// ==========================================================================

function openModal(htmlContent) {
  closeModal();
  const backdrop = document.createElement('div');
  backdrop.id = 'active-modal-backdrop';
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal-content glass-strong">
      ${htmlContent}
    </div>
  `;
  document.body.appendChild(backdrop);
  lucide.createIcons({ root: backdrop });

  // Close when tapping outside
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  // Animate in
  setTimeout(() => backdrop.classList.add('open'), 10);
}

function closeModal() {
  const current = document.getElementById('active-modal-backdrop');
  if (current) {
    current.classList.remove('open');
    setTimeout(() => current.remove(), 250);
  }
}

// 1. Central Fund Modal
function openCentralFundModal() {
  openModal(`
    <div class="modal-header">
      <h3>เติมเงินกองกลาง 💰</h3>
      <button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button>
    </div>

    <form id="cf-form">
      <div class="form-group">
        <label class="form-label">จำนวนเงิน (บาท)</label>
        <input type="number" step="0.01" id="cf-amount" class="form-input" placeholder="เช่น 500" required />
      </div>

      <div class="form-group">
        <label class="form-label">วันที่โอน</label>
        <input type="date" id="cf-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required />
      </div>

      <div class="form-group">
        <label class="form-label">แนบสลิปโอนเงิน (จำเป็น)</label>
        <input type="file" id="cf-slip" class="form-input" accept="image/jpeg,image/png,application/pdf" required />
        <span class="form-hint">รองรับไฟล์ JPG, PNG, PDF ขนาดไม่เกิน 5 MB</span>
      </div>

      <div id="cf-error" class="form-error" style="display: none; margin-bottom: 12px;"></div>

      <button type="submit" id="cf-submit-btn" class="btn btn-filled btn-block">
        <span>บันทึกการเติมเงิน</span>
      </button>
    </form>
  `);

  document.getElementById('cf-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = document.getElementById('cf-amount').value;
    const date = document.getElementById('cf-date').value;
    const fileInput = document.getElementById('cf-slip');
    const errBox = document.getElementById('cf-error');
    const btn = document.getElementById('cf-submit-btn');

    if (!fileInput.files || fileInput.files.length === 0) {
      errBox.textContent = 'กรุณาแนบไฟล์สลิปด้วยนะ';
      errBox.style.display = 'block';
      return;
    }

    const file = fileInput.files[0];
    if (file.size > 5 * 1024 * 1024) {
      errBox.textContent = 'ขนาดไฟล์ใหญ่เกิน 5 MB นะ';
      errBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span>กำลังบันทึกและอัปโหลด...</span>`;

    try {
      const base64 = await fileToBase64(file);
      await api('/finance/central-fund', {
        method: 'POST',
        body: JSON.stringify({
          amount,
          date,
          slip_file: base64,
          original_filename: file.name,
          mime_type: file.type
        })
      });

      closeModal();
      showToast('บันทึกการเติมเงินกองกลางเรียบร้อยแล้วจ้า 🎉', 'success');
      if (state.activeTab === 'finance') {
        renderFinanceSubContent();
      } else {
        renderContent();
      }
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = `<span>บันทึกการเติมเงิน</span>`;
    }
  });
}

// 2. Record Expense Modal
function openExpenseModal() {
  const expenseTypes = [
    'ค่าอาหารและเครื่องดื่ม',
    'ค่าที่พัก',
    'ค่าเดินทาง (รถ/เรือ/น้ำมัน)',
    'ค่ากิจกรรม / ตั๋วเข้าชม',
    'ของใช้ส่วนกลาง',
    'อื่นๆ'
  ];

  openModal(`
    <div class="modal-header">
      <h3>บันทึกค่าใช้จ่ายสำรองจ่าย 🧾</h3>
      <button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button>
    </div>

    <form id="exp-form">
      <div class="form-group">
        <label class="form-label">ประเภทค่าใช้จ่าย</label>
        <select id="exp-type" class="form-select" required>
          ${expenseTypes.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">จำนวนเงินจริง (บาท)</label>
        <input type="number" step="0.01" id="exp-amount" class="form-input" placeholder="เช่น 1200" required />
      </div>

      <div class="form-group">
        <label class="form-label">วันที่เกิดค่าใช้จ่าย</label>
        <input type="date" id="exp-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required />
      </div>

      <div class="form-group">
        <label class="form-label">คำอธิบายเพิ่มเติม (ถ้าไม่มีสลิป ต้องกรอกช่องนี้)</label>
        <input type="text" id="exp-desc" class="form-input" placeholder="เช่น ค่าอาหารเย็นมื้อแรกที่เกาะล้าน..." />
      </div>

      <div class="form-group">
        <label class="form-label">แนบสลิป (ถ้ามี)</label>
        <input type="file" id="exp-slip" class="form-input" accept="image/jpeg,image/png,application/pdf" />
        <span class="form-hint">ขนาดไม่เกิน 5 MB</span>
      </div>

      <div id="exp-error" class="form-error" style="display: none; margin-bottom: 12px;"></div>

      <button type="submit" id="exp-submit-btn" class="btn btn-filled btn-block">
        <span>บันทึกค่าใช้จ่าย</span>
      </button>
    </form>
  `);

  document.getElementById('exp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('exp-type').value;
    const amount = document.getElementById('exp-amount').value;
    const date = document.getElementById('exp-date').value;
    const description = document.getElementById('exp-desc').value;
    const fileInput = document.getElementById('exp-slip');
    const errBox = document.getElementById('exp-error');
    const btn = document.getElementById('exp-submit-btn');

    let base64 = null;
    let fileName = null;
    let mimeType = null;

    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      if (file.size > 5 * 1024 * 1024) {
        errBox.textContent = 'ขนาดไฟล์ใหญ่เกิน 5 MB นะ';
        errBox.style.display = 'block';
        return;
      }
      base64 = await fileToBase64(file);
      fileName = file.name;
      mimeType = file.type;
    } else if (!description || !description.trim()) {
      errBox.textContent = 'ถ้าไม่มีสลิป ต้องกรอกคำอธิบายเพิ่มเติมด้วยนะ';
      errBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span>กำลังบันทึก...</span>`;

    try {
      const res = await api('/finance/expenses', {
        method: 'POST',
        body: JSON.stringify({
          type,
          amount,
          date,
          description,
          slip_file: base64,
          original_filename: fileName,
          mime_type: mimeType
        })
      });

      closeModal();
      showToast('บันทึกค่าใช้จ่ายเรียบร้อยแล้วจ้า', 'success');
      
      // Propose to split immediately
      if (confirm('ต้องการหารค่าใช้จ่ายรายการนี้กับเพื่อนเลยไหม?')) {
        openSplitModal(res.expenses_id, parseFloat(amount));
      } else if (state.activeTab === 'finance') {
        renderFinanceSubContent();
      } else {
        renderContent();
      }
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = `<span>บันทึกค่าใช้จ่าย</span>`;
    }
  });
}

// 3. Split Expense Modal
function openSplitModal(expensesId, totalAmount) {
  openModal(`
    <div class="modal-header">
      <h3>แบ่งค่าใช้จ่าย 🤝</h3>
      <button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button>
    </div>

    <div style="font-size: 14px; color: var(--color-text-muted);">
      ยอดค่าใช้จ่ายจริง: <b style="color: var(--color-primary-strong); font-size: 17px;">฿${formatMoney(totalAmount)}</b>
      <div style="font-size: 12px; margin-top: 2px;">
        * กฎการหาร: เศษสตางค์จะถูกปัดขึ้นเป็นจำนวนเต็มบาทให้ผู้สำรองจ่ายตามกติกา
      </div>
    </div>

    <div style="margin: 12px 0;">
      <label class="form-label">เลือกสมาชิกที่ร่วมหาร:</label>
      <div style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 10px; background: var(--color-surface); border-radius: var(--radius-md); border: 1px solid var(--color-border);">
        ${state.friends.map(f => `
          <label style="display: flex; align-items: center; gap: 10px; font-size: 14px; cursor: pointer;">
            <input type="checkbox" class="split-checkbox" value="${escapeHtml(f.f_id)}" checked />
            <span>${escapeHtml(f.name)} ${f.f_id === state.user.f_id ? '(ผู้จ่าย)' : ''}</span>
          </label>
        `).join('')}
      </div>
    </div>

    <div id="split-calc-preview" style="background: var(--color-primary-soft); padding: 10px; border-radius: var(--radius-md); font-size: 13px; color: var(--color-primary-strong);"></div>

    <div id="split-error" class="form-error" style="display: none; margin-bottom: 12px;"></div>

    <button type="button" id="split-submit-btn" class="btn btn-filled btn-block" style="margin-top: 10px;">
      <span>ยืนยันการแบ่งค่าใช้จ่าย</span>
    </button>
  `);

  function updatePreview() {
    const checked = Array.from(document.querySelectorAll('.split-checkbox:checked')).map(cb => cb.value);
    const n = checked.length;
    const preview = document.getElementById('split-calc-preview');
    if (n === 0) {
      preview.innerHTML = 'กรุณาเลือกสมาชิกอย่างน้อย 1 คน';
      return;
    }
    const rawShare = totalAmount / n;
    const ceilShare = Math.ceil(rawShare);
    preview.innerHTML = `
      หาร ${n} คน • ยอดรับผิดชอบคนละ: <b>${ceilShare} บาท</b> 
      ${ceilShare * n > totalAmount ? `<span style="font-size: 11px;">(ส่วนต่างจากการปัดขึ้น ${ceilShare * n - totalAmount} บาท เป็นของผู้จ่าย)</span>` : ''}
    `;
  }

  document.querySelectorAll('.split-checkbox').forEach(cb => {
    cb.addEventListener('change', updatePreview);
  });
  updatePreview();

  document.getElementById('split-submit-btn').addEventListener('click', async () => {
    const checked = Array.from(document.querySelectorAll('.split-checkbox:checked')).map(cb => cb.value);
    const errBox = document.getElementById('split-error');
    const btn = document.getElementById('split-submit-btn');

    if (checked.length === 0) {
      errBox.textContent = 'กรุณาเลือกสมาชิกที่ร่วมหารอย่างน้อย 1 คนนะ';
      errBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span>กำลังบันทึกหนี้...</span>`;

    try {
      await api('/finance/expenses/split', {
        method: 'POST',
        body: JSON.stringify({
          expenses_id: expensesId,
          split_mode: 'equal',
          participants: checked
        })
      });

      closeModal();
      showToast('แบ่งค่าใช้จ่ายและบันทึกหนี้เรียบร้อยแล้ว 🎉', 'success');
      if (state.activeTab === 'finance') {
        renderFinanceSubContent();
      } else {
        renderContent();
      }
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = `<span>ยืนยันการแบ่งค่าใช้จ่าย</span>`;
    }
  });
}

// 4. Pay Debt / Settlement Modal
function openSettlementModal(debtorId, creditorId, creditorName, totalDebt) {
  openModal(`
    <div class="modal-header">
      <h3>ชำระหนี้ทั้งหมด 🎉</h3>
      <button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button>
    </div>

    <div style="font-size: 14px; color: var(--color-text-muted);">
      โอนให้: <b style="color: var(--color-primary-strong);">${escapeHtml(creditorName)}</b><br />
      ยอดรวมที่ต้องชำระ: <b style="color: var(--color-accent); font-size: 18px;">฿${formatMoney(totalDebt)}</b>
      <div style="font-size: 12px; margin-top: 2px;">
        * กฎการชำระ: ต้องชำระเต็มยอดรวมทั้งหมด และแนบสลิปโอนเงิน
      </div>
    </div>

    <form id="settlement-form" style="margin-top: 12px;">
      <div class="form-group">
        <label class="form-label">วันที่โอน</label>
        <input type="date" id="st-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required />
      </div>

      <div class="form-group">
        <label class="form-label">คำอธิบายเพิ่มเติม (ถ้ามี)</label>
        <input type="text" id="st-desc" class="form-input" placeholder="เช่น โอนคืนค่าข้าวและตั๋วเรือแล้วนะ" />
      </div>

      <div class="form-group">
        <label class="form-label">แนบสลิปโอนเงิน (จำเป็น)</label>
        <input type="file" id="st-slip" class="form-input" accept="image/jpeg,image/png,application/pdf" required />
      </div>

      <div id="st-error" class="form-error" style="display: none; margin-bottom: 12px;"></div>

      <button type="submit" id="st-submit-btn" class="btn btn-filled btn-block">
        <span>ยืนยันการชำระเงิน</span>
      </button>
    </form>
  `);

  document.getElementById('settlement-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('st-date').value;
    const description = document.getElementById('st-desc').value;
    const fileInput = document.getElementById('st-slip');
    const errBox = document.getElementById('st-error');
    const btn = document.getElementById('st-submit-btn');

    if (!fileInput.files || fileInput.files.length === 0) {
      errBox.textContent = 'กรุณาแนบสลิปโอนเงินด้วยนะ';
      errBox.style.display = 'block';
      return;
    }

    const file = fileInput.files[0];
    if (file.size > 5 * 1024 * 1024) {
      errBox.textContent = 'ขนาดไฟล์ใหญ่เกิน 5 MB นะ';
      errBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span>กำลังบันทึกและส่งสลิป...</span>`;

    try {
      const base64 = await fileToBase64(file);
      await api('/finance/settlement', {
        method: 'POST',
        body: JSON.stringify({
          debtor_id: debtorId,
          creditor_id: creditorId,
          date,
          description,
          slip_file: base64,
          original_filename: file.name,
          mime_type: file.type
        })
      });

      closeModal();
      showToast('ชำระหนี้เรียบร้อยแล้ว เคลียร์หนี้สำเร็จ 🎉', 'success');
      if (state.activeTab === 'finance') {
        renderFinanceSubContent();
      } else {
        renderContent();
      }
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = `<span>ยืนยันการชำระเงิน</span>`;
    }
  });
}

// 5. Void Modal
function openVoidModal(entityType, entityId) {
  openModal(`
    <div class="modal-header">
      <h3 style="color: var(--color-error);">ยกเลิกรายการ ⚠️</h3>
      <button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button>
    </div>

    <p style="font-size: 14px; color: var(--color-text-muted);">
      การยกเลิกจะไม่ลบข้อมูลถาวร แต่จะปรับยอดให้ไม่ถูกนำไปคำนวณ และบันทึกประวัติไว้
    </p>

    <form id="void-form" style="margin-top: 10px;">
      <div class="form-group">
        <label class="form-label">ระบุเหตุผลในการยกเลิก (จำเป็น)</label>
        <textarea id="void-reason" class="form-textarea" placeholder="เช่น โอนผิดยอด, บันทึกซ้ำ..." required></textarea>
      </div>

      <div id="void-error" class="form-error" style="display: none; margin-bottom: 12px;"></div>

      <button type="submit" id="void-submit-btn" class="btn btn-danger btn-block">
        <span>ยืนยันการยกเลิก</span>
      </button>
    </form>
  `);

  document.getElementById('void-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const reason = document.getElementById('void-reason').value;
    const errBox = document.getElementById('void-error');
    const btn = document.getElementById('void-submit-btn');

    btn.disabled = true;
    btn.innerHTML = `<span>กำลังดำเนินการ...</span>`;

    let endpoint = '';
    let payload = { reason };

    if (entityType === 'central_fund') {
      endpoint = '/finance/central-fund/void';
      payload.slips_id = entityId;
    } else if (entityType === 'expense') {
      endpoint = '/finance/expenses/void';
      payload.expenses_id = entityId;
    } else if (entityType === 'settlement') {
      endpoint = '/finance/settlement/void';
      payload.settlement_id = entityId;
    }

    try {
      await api(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      closeModal();
      showToast('ยกเลิกรายการเรียบร้อยแล้ว', 'info');
      if (state.activeTab === 'finance') {
        renderFinanceSubContent();
      } else {
        renderContent();
      }
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = `<span>ยืนยันการยกเลิก</span>`;
    }
  });
}

// 6. View Slip Modal
function viewSlip(url, title = 'หลักฐานสลิป') {
  const isPdf = url.includes('.pdf');
  openModal(`
    <div class="modal-header">
      <h3>${escapeHtml(title)}</h3>
      <button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button>
    </div>

    <div style="text-align: center; margin-top: 10px;">
      ${isPdf ? `
        <embed src="${escapeHtml(url)}" type="application/pdf" width="100%" height="450px" style="border-radius: var(--radius-md);" />
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary" style="margin-top: 8px;">เปิดในหน้าต่างใหม่</a>
      ` : `
        <img src="${escapeHtml(url)}" alt="สลิป" style="max-width: 100%; max-height: 500px; border-radius: var(--radius-md); object-fit: contain; box-shadow: var(--shadow-md);" />
      `}
    </div>
  `);
}

// 7. Notifications Drawer/Modal
async function openNotificationsModal() {
  const data = await api('/notifications');
  state.notifications = data.notifications || [];
  state.unreadNotifsCount = data.unreadCount || 0;

  openModal(`
    <div class="modal-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <h3>การแจ้งเตือน 🔔</h3>
        ${state.unreadNotifsCount > 0 ? `<span class="badge badge-accent">${state.unreadNotifsCount} ใหม่</span>` : ''}
      </div>
      <button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button>
    </div>

    <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
      <button class="btn btn-sm btn-secondary" onclick="markAllNotifsRead()">
        <span>อ่านทั้งหมดแล้ว</span>
      </button>
    </div>

    ${state.notifications.length === 0 ? `
      <div class="empty-state" style="padding: 24px;">
        <p>ไม่มีการแจ้งเตือนใหม่ในตอนนี้</p>
      </div>
    ` : `
      <div style="display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto;">
        ${state.notifications.map(n => `
          <div class="glass" style="padding: 12px; border-radius: var(--radius-md); ${n.is_read ? 'opacity: 0.7;' : 'border-left: 3px solid var(--color-primary);'}; cursor: pointer;"
               onclick="handleNotificationClick('${escapeHtml(n.action_link || '')}')">
            <div style="font-weight: 600; font-size: 14px;">${escapeHtml(n.title)}</div>
            <p style="font-size: 13px; color: var(--color-text-muted); margin-top: 2px;">${escapeHtml(n.message)}</p>
            <span style="font-size: 11px; color: var(--color-text-muted); margin-top: 4px; display: block;">
              ${formatDateTimeBE(n.created_at)}
            </span>
          </div>
        `).join('')}
      </div>
    `}
  `);
}

async function markAllNotifsRead() {
  try {
    await api('/notifications/read', { method: 'POST', body: JSON.stringify({}) });
    state.unreadNotifsCount = 0;
    const badge = document.querySelector('.notif-badge');
    if (badge) badge.remove();
    openNotificationsModal();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleNotificationClick(link) {
  closeModal();
  if (link.startsWith('#finance/')) {
    const sub = link.replace('#finance/', '');
    state.activeTab = 'finance';
    state.financeSubTab = sub;
    renderApp();
  } else if (link.startsWith('#')) {
    switchTab(link.replace('#', ''));
  }
}

// 8. Audit Logs Modal
async function openAuditLogsModal() {
  const data = await api('/audit-logs');
  const logs = data.logs || [];

  openModal(`
    <div class="modal-header">
      <h3>ประวัติการเปลี่ยนแปลง (Audit Logs) 📋</h3>
      <button class="icon-btn" onclick="closeModal()"><i data-lucide="x"></i></button>
    </div>

    <div style="font-size: 13px; color: var(--color-text-muted); margin-bottom: 8px;">
      บันทึกการกระทำทั้งหมด เรียงลำดับจากล่าสุด
    </div>

    ${logs.length === 0 ? `
      <div class="empty-state" style="padding: 24px;">
        <p>ยังไม่มีประวัติการเปลี่ยนแปลง</p>
      </div>
    ` : `
      <div style="display: flex; flex-direction: column; gap: 8px; max-height: 450px; overflow-y: auto;">
        ${logs.map(log => `
          <div class="glass" style="padding: 10px 14px; border-radius: var(--radius-md); font-size: 13px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span class="badge ${log.event_type === 'void' ? 'badge-danger' : log.event_type === 'create' ? 'badge-success' : 'badge-primary'}">
                ${escapeHtml(log.event_type.toUpperCase())} • ${escapeHtml(log.entity_type)}
              </span>
              <span style="font-size: 11px; color: var(--color-text-muted);">${formatDateTimeBE(log.created_at)}</span>
            </div>
            
            <div style="margin-top: 4px; font-weight: 500;">
              ผู้ทำรายการ: <b>${escapeHtml(log.actor_name || log.actor_f_id)}</b>
            </div>

            ${log.reason ? `
              <div style="margin-top: 2px; color: var(--color-text-muted);">
                เหตุผล: ${escapeHtml(log.reason)}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `}
  `);
}

// Start app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initApp);
