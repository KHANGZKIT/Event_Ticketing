// ========================
// CẤU HÌNH API (Gateway) - Auto-detect production/local
// ========================
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:4000/api'
  : 'https://gateway-production-6a61.up.railway.app/api';
const EVENTS_BASE = `${API_BASE}/events`;

// ====== RATE LIMIT & CACHE ======
// (Cache này không còn cần thiết cho giá, nhưng có thể giữ lại cho các logic khác)
const SHOWS_CACHE = new Map();
const SEATMAP_CACHE = new Map();
const PATHS = {
  myTickets: '/frontend/my_ticket/source/my_ticket.html',
  login: '/frontend/LoginUI/LogRegUI.html?tab=login',
  register: '/frontend/LoginUI/LogRegUI.html?tab=register',
};
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** fetch + retry khi bị 429 (Too Many Requests) hoặc 503 */
async function fetchWithRetry(url, opts = {}, { retries = 3, baseDelay = 400 } = {}) {
  let attempt = 0;
  while (true) {
    const r = await fetch(url, opts);
    if (r.status !== 429 && r.status !== 503) return r;
    if (attempt >= retries) return r;
    const ra = +(r.headers.get('Retry-After') || 0);
    const wait = ra > 0 ? ra * 1000 : baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 150);
    await sleep(wait);
    attempt++;
  }
}

/** * Điều hướng khi click event:
* - Mở trang chi tiết sự kiện để xem info và chọn suất (event-details).
*/
function goSmartEvent(event) {
  const eventId = event.id;
  window.location.href = `/frontend/Ticketbox/code/event-details.html?eventId=${encodeURIComponent(eventId)}`;
}


// ========================
// DANH SÁCH FALLBACK IMAGES
// ========================
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1600",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600",
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1600",
  // ... (giữ nguyên danh sách ảnh của bạn) ...
  "https://images.pexels.com/photos/1763080/pexels-photo-1763080.jpeg?auto=compress&cs=tinysrgb&w=1600",
];

/**
 * Làm sạch chuỗi HTML để chống XSS.
 * Chuyển các ký tự <, >, &, ", ' thành các thực thể HTML.
 */
function sanitizeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;' // hoặc &apos;
    }[m];
  });
}
/* --------------------------------------------------
 * LOAD & DISPLAY EVENTS (ĐÃ TỐI ƯU)
 * -------------------------------------------------- */
async function loadEvents() {
  try {
    // 1. Gọi API 1 LẦN DUY NHẤT
    // API này (GET /api/events) đã trả về thông tin giá (price)
    const res = await fetch(`${EVENTS_BASE}?pageSize=20`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const eventsWithPrice = data?.items || []; // <-- Đã có giá
    if (eventsWithPrice.length === 0) return;

    // 2. Render các section
    const sections = document.querySelectorAll('.event-section');
    const MAX_EVENTS_PER_SECTION = 5;
    sections.forEach((_, i) => {
      const start = i * MAX_EVENTS_PER_SECTION;
      const slice = eventsWithPrice.slice(start, start + MAX_EVENTS_PER_SECTION);
      if (slice.length) renderEventsToSection(slice, i);
    });

    // 3. Slider lấy từ 3 event đầu
    updateSliderWithEvents(eventsWithPrice.slice(0, 3));
  } catch (err) {
    console.error('[events] error:', err);
  }
}

/* * HÀM loadEventPrice() ĐÃ BỊ XÓA (Không còn cần thiết)
 */

/* --------------------------------------------------
 * FORMAT PRICE VND
 * -------------------------------------------------- */
function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
}

/* --------------------------------------------------
 * FORMAT DATE
 * -------------------------------------------------- */
function formatDate(dateString) {
  if (!dateString) return 'Chưa có ngày';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Chưa có ngày';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/* --------------------------------------------------
 * RENDER EVENTS VÀO SECTION
 * -------------------------------------------------- */
function renderEventsToSection(events, sectionIndex = 0) {
  const sections = document.querySelectorAll('.event-section');
  if (!sections || sections.length === 0) return;

  const targetSection = sections[sectionIndex];
  if (!targetSection) return;

  const eventGrid = targetSection.querySelector('.event-grid');
  if (!eventGrid) return;

  // Xóa các skeleton-card
  eventGrid.innerHTML = '';

  // Render events
  events.forEach(event => {
    let image = event.cover && event.cover.trim() !== ''
      ? event.cover
      : FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];

    // Ưu tiên venue từ show, sau đó mới đến city
    const location = event.venue || event.city || 'Chưa có địa điểm';

    // Dùng thông tin giá từ API đã tối ưu
    const price = event.price?.display || 'Liên hệ';
    const date = formatDate(event.startsAt || event.minStartsAt || event.price?.firstStartsAt);

    // FIX: Đổi thẻ <a> thành <div> và dùng click listener
    const eventCard = document.createElement('div'); // <-- Đổi thành <div>
    eventCard.className = 'event-card';
    eventCard.setAttribute('data-event-id', event.id);
    eventCard.style.cursor = 'pointer'; // Thêm cursor

    // Gắn sự kiện click để điều hướng thông minh
    eventCard.addEventListener('click', () => goSmartEvent(event));

    // Tạo img element riêng để xử lý error tốt hơn
    const imgElement = document.createElement('img');
    imgElement.src = image;
    imgElement.alt = event.name; // alt an toàn, không cần sanitize
    imgElement.loading = 'lazy';

    imgElement.dataset.fallbackAttempts = '0';
    const maxFallbackAttempts = 3;
    const triedUrls = new Set([image]);

    imgElement.onerror = function () {
      const attempts = parseInt(this.dataset.fallbackAttempts || '0');
      if (attempts >= maxFallbackAttempts) {
        const placeholder = document.createElement('div');
        placeholder.style.cssText = 'width: 100%; height: 180px; background: linear-gradient(135deg, #2DC275 0%, #1f8a53 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 48px; font-weight: bold;';

        // SỬA 2: Xử lý tên rỗng, dùng 'E' (Event) làm fallback
        placeholder.textContent = (event.name || 'E').charAt(0).toUpperCase();

        this.parentNode.replaceChild(placeholder, this);
        return;
      }
      let randomFallback;
      let retries = 0;
      do {
        randomFallback = FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
        retries++;
      } while (triedUrls.has(randomFallback) && retries < 10);

      triedUrls.add(randomFallback);
      this.src = randomFallback;
      this.dataset.fallbackAttempts = String(attempts + 1);
    };

    eventCard.appendChild(imgElement);

    // SỬA 1: Dùng hàm sanitizeHTML cho tất cả dữ liệu động
    const safeName = sanitizeHTML(event.name);
    const safePrice = sanitizeHTML(price);
    const safeLocation = sanitizeHTML(location);
    // 'date' an toàn vì nó được tạo bởi hàm formatDate của bạn

    // Tạo event info
    const eventInfo = document.createElement('div');
    eventInfo.className = 'event-info';
    eventInfo.innerHTML = `
      <p class="event-name">${safeName}</p>
      <p class="event-price">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
          <path d="M12 17.5v-11" />
        </svg>
        ${safePrice}
      </p>
      <p class="event-date">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
        </svg>
        ${date} 
      </p>
      <p class="event-location" style="margin-top: 4px; font-size: 13px; color: #bdc3c7;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 4px;">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        ${safeLocation}
      </p>
    `;

    eventCard.appendChild(eventInfo);
    eventGrid.appendChild(eventCard);

  });
}

/* --------------------------------------------------
 * UPDATE SLIDER VỚI EVENTS TỪ DB
 * -------------------------------------------------- */
function updateSliderWithEvents(events) {
  if (!events || events.length === 0) return;

  const slider = document.querySelector('.slider');
  const dotsContainer = document.querySelector('.dots');
  if (!slider || !dotsContainer) return;

  slider.innerHTML = '';
  dotsContainer.innerHTML = '';

  // Hiển thị 2 banner trên mỗi slide (giống ảnh mẫu)
  const sliderEvents = events.slice(0, 6); // tối đa 3 trang * 2 items
  const pages = [];
  for (let i = 0; i < sliderEvents.length; i += 2) {
    const pair = sliderEvents.slice(i, i + 2);
    // Nếu trang cuối chỉ có 1 event → nhân đôi (hoặc mượn event đầu) để luôn đủ 2 ô
    if (pair.length === 1) {
      // Ưu tiên mượn phần tử đầu danh sách để tránh trùng hình ngay trước đó
      const filler = sliderEvents[0] && sliderEvents[0].id !== pair[0].id ? sliderEvents[0] : pair[0];
      pair.push(filler);
    }
    pages.push(pair);
  }

  const makeTile = (event) => {
    const image = event.cover || FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
    const tile = document.createElement('div');
    tile.style.position = 'relative';
    tile.style.flex = '1 1 0';
    tile.style.borderRadius = '16px';
    tile.style.overflow = 'hidden';
    tile.style.backgroundImage = `url('${image}')`;
    tile.style.backgroundSize = 'cover';
    tile.style.backgroundPosition = 'center';
    tile.style.cursor = 'pointer';
    tile.addEventListener('click', () => goSmartEvent(event));

    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.background = 'linear-gradient(180deg, rgba(0,0,0,0.00) 40%, rgba(0,0,0,0.55) 100%)';
    tile.appendChild(overlay);

    const cta = document.createElement('button');
    cta.type = 'button';
    cta.textContent = 'Xem chi tiết';
    cta.style.position = 'absolute';
    cta.style.left = '24px';
    cta.style.bottom = '24px';
    cta.style.padding = '8px 17px';
    cta.style.border = 'none';
    cta.style.borderRadius = '5px';
    cta.style.background = '#1f8a53';
    cta.style.color = '#fff';
    cta.style.fontWeight = '700';
    cta.style.boxShadow = '0 20px 30px rgba(46,204,113,0.35)';
    cta.style.cursor = 'pointer';
    cta.addEventListener('click', (e) => { e.stopPropagation(); goSmartEvent(event); });
    tile.appendChild(cta);

    const testImg = new Image();
    testImg.onerror = () => {
      tile.style.background = 'linear-gradient(135deg, #2DC275 0%, #1f8a53 100%)';
      overlay.style.background = 'none';
      const label = document.createElement('div');
      label.textContent = (event.name || 'E').charAt(0).toUpperCase();
      label.style.position = 'absolute';
      label.style.inset = '0';
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.justifyContent = 'center';
      label.style.color = '#fff';
      label.style.fontSize = '72px';
      label.style.fontWeight = 'bold';
      tile.appendChild(label);
    };
    testImg.src = image;
    return tile;
  };

  pages.forEach((pair, pageIndex) => {
    const slide = document.createElement('div');
    slide.className = `slide ${pageIndex === 0 ? 'active' : ''}`;
    slide.style.display = 'flex';
    slide.style.gap = '24px';
    slide.style.alignItems = 'stretch';
    slide.style.justifyContent = 'space-between';

    pair.forEach(ev => slide.appendChild(makeTile(ev)));
    slider.appendChild(slide);

    const dot = document.createElement('span');
    dot.className = `dot ${pageIndex === 0 ? 'active' : ''}`;
    dotsContainer.appendChild(dot);
  });

  // Re-init slider functionality
  setTimeout(() => {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    if (slides.length === 0) return; // Không có slide thì không làm gì
    let slideIndex = 0;

    function showSlide(index) {
      slides.forEach((s, i) => s.classList.toggle('active', i === index));
      dots.forEach((d, i) => d.classList.toggle('active', i === index));
    }

    const nextBtn = document.querySelector('.next');
    const prevBtn = document.querySelector('.prev');

    if (nextBtn) {
      nextBtn.onclick = () => {
        slideIndex = (slideIndex + 1) % slides.length;
        showSlide(slideIndex);
      };
    }

    if (prevBtn) {
      prevBtn.onclick = () => {
        slideIndex = (slideIndex - 1 + slides.length) % slides.length;
        showSlide(slideIndex);
      };
    }

    // gắn click cho dots (đã render theo số trang)
    document.querySelectorAll('.dot').forEach((dot, i) => {
      dot.onclick = () => { slideIndex = i; showSlide(slideIndex); };
    });

    if (window.sliderInterval) {
      clearInterval(window.sliderInterval);
    }
    window.sliderInterval = setInterval(() => {
      slideIndex = (slideIndex + 1) % slides.length;
      showSlide(slideIndex);
    }, 5000);

    // Khởi động
    showSlide(0);
  }, 100);
}

// Load events khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
  loadEvents();
  initSearchBar();
});

/* --------------------------------------------------
 * AUTH: Lấy token/profile từ localStorage & render UI
 * (Giữ nguyên phần Auth của bạn)
 * -------------------------------------------------- */
function getStoredAuth() {
  try {
    const authStr =
      localStorage.getItem('auth') || sessionStorage.getItem('auth');
    if (authStr) {
      const auth = JSON.parse(authStr);
      if (auth?.token && auth?.user) return { token: auth.token, user: auth.user };
    }
    const token =
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('accessToken') ||
      sessionStorage.getItem('token') ||
      null;
    const profileRaw =
      localStorage.getItem('user') ||
      localStorage.getItem('profile') ||
      localStorage.getItem('currentUser') ||
      sessionStorage.getItem('user') ||
      sessionStorage.getItem('profile') ||
      sessionStorage.getItem('currentUser') ||
      null;
    const profile = profileRaw ? JSON.parse(profileRaw) : null;
    if (token && profile) return { token, user: profile };
    return null;
  } catch {
    return null;
  }
}

function buildLoggedOutHTML() {
  return `
    <a href="../../LoginUI/LogRegUI.html?tab=login" class="auth-link">Đăng nhập</a>
    <span class="auth-divider">|</span>
    <a href="../../LoginUI/LogRegUI.html?tab=register" class="auth-link">Đăng ký</a>
  `;
}

function buildLoggedInHTML(displayName, avatarUrl, initials = 'U', bg = '#f07167') {
  return `
    <div class="user-menu">
      <button class="user-btn" type="button" aria-haspopup="true" aria-expanded="false">
        <img src="${avatarUrl || ''}" alt="" class="avatar"
             onerror="this.style.display='none';" />
        <div class="avatar-fallback" title="${displayName}" style="background:${bg};">
          ${initials}
        </div>
        <span class="user-name">Tài khoản</span>
        <svg class="caret" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div class="user-dropdown" hidden>
        <a href="#" class="dropdown-item" id="gotoMyTickets">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
            <path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>
          </svg>
          Vé của tôi
        </a>
        <a href="../../Ticketbox/code/my-events.html" class="dropdown-item">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          Sự kiện của tôi
        </a>
        <a href="../../my_ticket/source/my_ticket.html" class="dropdown-item">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="5"/>
            <path d="M20 21a8 8 0 0 0-16 0"/>
          </svg>
          Tài khoản của tôi
        </a>
        <a href="#" class="dropdown-item logout" id="logoutBtn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
          </svg>
          Đăng xuất
        </a>
      </div>
    </div>
  `;
}

function renderAuthUI() {
  const host = document.querySelector('#authArea');
  if (!host) return;

  const auth = getStoredAuth();
  if (!auth) {
    host.innerHTML = buildLoggedOutHTML();
    const mt = document.querySelector('.my-ticket');
    if (mt) mt.style.display = '';
    guardMyTicketsNavigation();
    return;
  }

  const u = auth.user || {};
  const name = u.fullName || u.name || u.username || u.displayName || 'User';
  const avatar = u.avatar || u.avatarUrl || u.photoURL || '';
  const initials = getInitials(name);
  const bg = pastelFromString(name);
  host.innerHTML = buildLoggedInHTML(name, avatar, initials, bg);

  const mt = document.querySelector('.my-ticket');
  if (mt) mt.style.display = 'none';

  const btn = host.querySelector('.user-btn');
  const dd = host.querySelector('.user-dropdown');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = dd.hasAttribute('hidden');
    if (willOpen) dd.removeAttribute('hidden'); else dd.setAttribute('hidden', '');
    btn.setAttribute('aria-expanded', String(willOpen));
  });
  document.addEventListener('click', (e) => {
    if (!host.contains(e.target)) dd.setAttribute('hidden', '');
  });

  guardMyTicketsNavigation();

  host.querySelector('#logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    clearAuthStorage();
    renderAuthUI();
    guardMyTicketsNavigation();
  });
}

// Lắng nghe storage event để cập nhật avatar khi có thay đổi từ trang khác
window.addEventListener('storage', (e) => {
  if (e.key === 'avatarUpdated' || e.key === 'auth' || e.key === 'user') {
    // Re-render auth UI để cập nhật avatar
    renderAuthUI();
  }
});

// Lắng nghe custom event từ cùng tab (khi cập nhật trong cùng window)
window.addEventListener('avatarUpdated', () => {
  renderAuthUI();
});
(function fixMyTicketLinks() {
  const p = location.pathname;
  const i = p.indexOf('/frontend/');
  if (i === -1) return;
  const FRONT_ROOT = p.slice(0, i + '/frontend/'.length);
  const MY_TICKET = FRONT_ROOT + 'my_ticket/source/my_ticket.html';

  document.querySelectorAll('#menuMyTickets, .my-ticket a, [data-link="my-ticket"]')
    .forEach(a => a.setAttribute('href', MY_TICKET));
})();

// --- AUTH HELPERS ---
function isAuthenticated() {
  return !!getStoredAuth();
}
function pastelFromString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  const sat = 65;
  const lig = 72;
  return `hsl(${hue} ${sat}% ${lig}%)`;
}
function getInitials(name = 'U') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function guardMyTicketsNavigation() {
  const goto = document.querySelector('#gotoMyTickets');
  if (goto) {
    goto.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isAuthenticated()) {
        const redirectTo = '/frontend/my_ticket/source/my_ticket.html';
        window.location.href = '/frontend/LoginUI/LogRegUI.html?tab=login&redirect=' + encodeURIComponent(redirectTo);
        return;
      }
      window.location.href = '/frontend/my_ticket/source/my_ticket.html';
    });
  }

  const loose = document.querySelector('.my-ticket a');
  if (loose) {
    loose.addEventListener('click', (e) => {
      e.preventDefault();
      const redirectTo = '/frontend/my_ticket/source/my_ticket.html';
      if (!isAuthenticated()) {
        window.location.href = '/frontend/LoginUI/LogRegUI.html?tab=login&redirect=' + encodeURIComponent(redirectTo);
      } else {
        window.location.href = redirectTo;
      }
    });
  }
}

function enforceAuthOnPage() {
  if (!isAuthenticated()) {
    window.location.href = '../../LoginUI/LogRegUI.html?tab=login&redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
  }
}

(function initAuthArea() {
  if (typeof renderAuthUI !== 'function') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAuthUI, { once: true });
  } else {
    renderAuthUI();
    guardMyTicketsNavigation();
  }
})();

// --------------------------------------------------
// SEARCH AUTOCOMPLETE (Trang chủ)
// --------------------------------------------------
function initSearchBar() {
  const form = document.querySelector('.search-bar');
  if (!form) return;
  const input = form.querySelector('input[name="q"]');
  if (!input) return;

  // Container gợi ý
  const suggestBox = document.createElement('div');
  suggestBox.className = 'search-suggest';
  suggestBox.setAttribute('role', 'listbox');
  suggestBox.style.position = 'absolute';
  suggestBox.style.left = '0';
  suggestBox.style.right = '0';
  suggestBox.style.top = '100%';
  suggestBox.style.zIndex = '1000';
  suggestBox.style.background = '#1F2937';
  suggestBox.style.border = '1px solid rgba(255,255,255,0.15)';
  suggestBox.style.borderTop = 'none';
  suggestBox.style.borderRadius = '0 0 10px 10px';
  suggestBox.style.display = 'none';
  suggestBox.style.maxHeight = '280px';
  suggestBox.style.overflowY = 'auto';
  suggestBox.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';

  // Bọc form để position:relative
  form.style.position = 'relative';
  form.appendChild(suggestBox);

  let debounceId = null;
  async function fetchSuggestions(q) {
    const url = `${EVENTS_BASE}?` + new URLSearchParams({ q, pageSize: '5' }).toString();
    const res = await fetchWithRetry(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.items || [];
  }

  function renderSuggestions(items) {
    if (!items || items.length === 0) {
      suggestBox.style.display = 'none';
      suggestBox.innerHTML = '';
      return;
    }
    suggestBox.innerHTML = '';
    items.forEach((ev, idx) => {
      const row = document.createElement('div');
      row.setAttribute('role', 'option');
      row.tabIndex = 0;
      row.style.display = 'flex';
      row.style.gap = '10px';
      row.style.alignItems = 'center';
      row.style.padding = '10px 12px';
      row.style.cursor = 'pointer';
      row.style.borderTop = '1px solid rgba(255,255,255,0.08)';
      row.addEventListener('mouseover', () => row.style.background = 'rgba(255,255,255,0.06)');
      row.addEventListener('mouseout', () => row.style.background = 'transparent');
      row.addEventListener('click', () => {
        window.location.href = `/frontend/Ticketbox/code/event-details.html?eventId=${encodeURIComponent(ev.id)}`;
      });

      const img = document.createElement('img');
      img.src = ev.cover || FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
      img.alt = '';
      img.width = 40;
      img.height = 28;
      img.style.objectFit = 'cover';
      img.style.borderRadius = '6px';

      const info = document.createElement('div');
      info.style.display = 'flex';
      info.style.flexDirection = 'column';
      info.style.gap = '2px';
      info.innerHTML = `
        <div style="font-weight:600; font-size:13px; color:#fff;">${sanitizeHTML(ev.name)}</div>
        <div style="font-size:12px; color:#a1a1aa;">${sanitizeHTML(ev.city || '')}</div>
      `;

      row.appendChild(img);
      row.appendChild(info);
      suggestBox.appendChild(row);
    });
    suggestBox.style.display = 'block';
  }

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(debounceId);
    if (!q) {
      renderSuggestions([]);
      return;
    }
    debounceId = setTimeout(async () => {
      try {
        const items = await fetchSuggestions(q);
        renderSuggestions(items);
      } catch {
        renderSuggestions([]);
      }
    }, 250);
  });

  // Ẩn box khi blur/click ngoài
  document.addEventListener('click', (e) => {
    if (!form.contains(e.target)) {
      renderSuggestions([]);
    }
  });
}

function clearAuthStorage() {
  const keys = ['auth', 'accessToken', 'token', 'user', 'profile', 'currentUser'];
  keys.forEach(k => {
    try { localStorage.removeItem(k); } catch { }
    try { sessionStorage.removeItem(k); } catch { }
  });
}