// ========================
// CẤU HÌNH API (Gateway)
// ========================
const API_BASE = 'http://localhost:4000/api';
const EVENTS_BASE = `${API_BASE}/events`;

// ====== RATE LIMIT & CACHE ======
const SHOWS_CACHE = new Map();     // eventId -> shows[]
const SEATMAP_CACHE = new Map();   // showId -> seatmap JSON

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** fetch + retry khi bị 429 (Too Many Requests) hoặc 503 */
async function fetchWithRetry(url, opts = {}, { retries = 3, baseDelay = 400 } = {}) {
  let attempt = 0;
  while (true) {
    const r = await fetch(url, opts);
    if (r.status !== 429 && r.status !== 503) return r;

    // 429/503 → backoff
    if (attempt >= retries) return r;
    // ưu tiên header Retry-After (giây) nếu có
    const ra = +(r.headers.get('Retry-After') || 0);
    const wait = ra > 0 ? ra * 1000 : baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 150);
    await sleep(wait);
    attempt++;
  }
}

/** Chạy map với concurrency giới hạn */
async function limitedMap(items, limit, worker) {
  const ret = new Array(items.length);
  let i = 0, active = 0, done = 0;

  return new Promise((resolve) => {
    const next = () => {
      if (done === items.length) return resolve(ret);
      while (active < limit && i < items.length) {
        const idx = i++, val = items[idx];
        active++;
        Promise.resolve(worker(val, idx))
          .then(res => { ret[idx] = res; })
          .catch(() => { ret[idx] = undefined; })
          .finally(() => { active--; done++; next(); });
      }
    };
    next();
  });
}
/** Lấy show đầu tiên của event, ưu tiên dùng cache từ SHOWS_CACHE */
async function getFirstShowIdForEvent(eventId) {
  // Nếu SHOWS_CACHE đã có danh sách shows thì lấy luôn tại client
  let shows = SHOWS_CACHE.get(eventId);
  if (!shows) {
    // gọi nhẹ: chỉ lấy ít bản ghi; BE có thể hỗ trợ pageSize/sort nếu có
    const r = await fetchWithRetry(`${EVENTS_BASE}/${eventId}/shows?pageSize=1`, { method: 'GET' }, { retries: 2, baseDelay: 500 });
    if (!r.ok) return null;
    const js = await r.json();
    // API của bạn có thể trả mảng hoặc {items:[]}
    if (Array.isArray(js)) shows = js;
    else if (Array.isArray(js.items)) shows = js.items;
    else shows = [];
    // Lưu cache để lần sau đỡ gọi
    if (!SHOWS_CACHE.has(eventId)) SHOWS_CACHE.set(eventId, shows);
  }

  if (!shows || shows.length === 0) return null;

  // Lấy show sớm nhất (nếu cache có nhiều suất)
  const first = [...shows].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0];
  return first?.id || null;
}

/** Điều hướng thông minh: có showId => seatmap, không có => showList */
async function goSeatmap(eventId) {
  const firstShowId = await getFirstShowIdForEvent(eventId);
  const url = firstShowId
    ? `/frontend/seatmapUI/seatmapUI.html?eventId=${encodeURIComponent(eventId)}&showId=${encodeURIComponent(firstShowId)}`
    : `/frontend/shows/showList.html?eventId=${encodeURIComponent(eventId)}`;
  window.location.href = url;
}


// ========================
// DANH SÁCH FALLBACK IMAGES (URL từ các website - Unsplash & Pexels)
// ========================
const FALLBACK_IMAGES = [
  // Unsplash - Concert & Music Events
  "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1600",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600",
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1600",
  "https://images.unsplash.com/photo-1515165562835-c3b8c2e5d43d?w=1600",
  "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=1600",
  "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1600",
  "https://images.unsplash.com/photo-1558980664-10ea8d6c1040?w=1600",
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1600",
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600",
  "https://images.unsplash.com/photo-1464362350603-30e6de19a68e?w=1600",
  "https://images.unsplash.com/photo-1501281668745-f7f57925c5b4?w=1600",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600",
  "https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?w=1600",
  "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=1600",
  "https://images.unsplash.com/photo-1478147427282-58a87a120781?w=1600",
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1600",
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600",
  "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=1600",
  "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1600",
  "https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=1600",
  "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1600",
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600",

  // Pexels - Concert & Events
  "https://images.pexels.com/photos/167491/pexels-photo-167491.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/1763076/pexels-photo-1763076.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/154147/pexels-photo-154147.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/270366/pexels-photo-270366.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/167446/pexels-photo-167446.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/1591373/pexels-photo-1591373.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/1763077/pexels-photo-1763077.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/1763078/pexels-photo-1763078.jpeg?auto=compress&cs=tinysrgb&w=1600",

  // Pexels - Stage & Theater
  "https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/2747450/pexels-photo-2747450.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/2747451/pexels-photo-2747451.jpeg?auto=compress&cs=tinysrgb&w=1600",

  // Pexels - Festival Events
  "https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=1600",

  // Pexels - Jazz & Music
  "https://images.pexels.com/photos/1763079/pexels-photo-1763079.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/1763080/pexels-photo-1763080.jpeg?auto=compress&cs=tinysrgb&w=1600",
];

/* --------------------------------------------------
 *  LOAD & DISPLAY EVENTS
 * -------------------------------------------------- */
async function loadEvents() {
  try {
    // Lấy nhiều 1 chút, nhưng chỉ render tối đa 20 cái
    const res = await fetch(`${EVENTS_BASE}?pageSize=50`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const allEvents = data?.items || [];
    if (allEvents.length === 0) return;

    const MAX_EVENTS_TOTAL = 20; // <- đủ 4 section * 5 items
    const events = allEvents.slice(0, MAX_EVENTS_TOTAL);

    // Tính giá cho từng event – concurrency = 4 để tránh 429
    const eventsWithPrice = await limitedMap(events, 4, async (event) => {
      const price = await loadEventPrice(event.id);
      return { ...event, price };
    });

    // Render các section (mỗi section tối đa 5 item)
    const sections = document.querySelectorAll('.event-section');
    const MAX_EVENTS_PER_SECTION = 5;
    sections.forEach((_, i) => {
      const start = i * MAX_EVENTS_PER_SECTION;
      const slice = eventsWithPrice.slice(start, start + MAX_EVENTS_PER_SECTION);
      if (slice.length) renderEventsToSection(slice, i);
    });

    // Slider lấy từ 3 event đầu
    updateSliderWithEvents(eventsWithPrice.slice(0, 3));
  } catch (err) {
    console.error('[events] error:', err);
  }
}

/* --------------------------------------------------
 *  LOAD PRICE CHO TỪNG EVENT
 * -------------------------------------------------- */

/* --------------------------------------------------
 *  FORMAT PRICE VND
 * -------------------------------------------------- */
function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
}

/* --------------------------------------------------
 *  FORMAT DATE
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
 *  RENDER EVENTS VÀO SECTION
 * -------------------------------------------------- */
function renderEventsToSection(events, sectionIndex = 0) {
  const sections = document.querySelectorAll('.event-section');
  if (!sections || sections.length === 0) return;

  const targetSection = sections[sectionIndex];
  if (!targetSection) return;

  const eventGrid = targetSection.querySelector('.event-grid');
  if (!eventGrid) return;

  // Xóa nội dung cũ (giữ lại các event-card tĩnh nếu không có events)
  if (events.length === 0) {
    return; // Giữ lại các event cards tĩnh nếu không có dữ liệu
  }

  eventGrid.innerHTML = '';

  // Render events
  events.forEach(event => {
    // Đảm bảo luôn có hình ảnh - ưu tiên cover, nếu không có hoặc rỗng thì dùng URL từ danh sách fallback
    let image = event.cover && event.cover.trim() !== ''
      ? event.cover
      : FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];

    const location = event.city || 'Chưa có địa điểm';
    const price = event.price?.display || 'Liên hệ';

    const date = formatDate(event.startsAt || event.minStartsAt || event.price?.firstStartsAt);
    // const firstShowId = event.price?.firstShowId || '';
    // const url = `/frontend/seatmapUI/seatmapUI.html?eventId=${encodeURIComponent(event.id)}${firstShowId ? `&showId=${encodeURIComponent(firstShowId)}` : ''}`;

    // ...
    eventCard = document.createElement('a');
    // đường dẫn từ TrangChu.html (frontend/HomePage/source) → shows/showList.html
    eventCard.href = '../../shows/showList.html?eventId=' + encodeURIComponent(event.id);
    eventCard.className = 'event-card';
    eventCard.setAttribute('data-event-id', event.id);

    // Tạo img element riêng để xử lý error tốt hơn
    const imgElement = document.createElement('img');
    imgElement.src = image;
    imgElement.alt = event.name;
    imgElement.loading = 'lazy'; // Lazy loading để tối ưu

    // Track số lần thử fallback (lưu trực tiếp trên element để tránh closure issue)
    imgElement.dataset.fallbackAttempts = '0';
    const maxFallbackAttempts = 3; // Thử tối đa 3 URL khác
    const triedUrls = new Set([image]); // Track các URL đã thử để tránh lặp lại

    // Error handling với nhiều fallback URLs
    imgElement.onerror = function () {
      const attempts = parseInt(this.dataset.fallbackAttempts || '0');

      // Nếu đã thử hết fallback images, mới dùng placeholder
      if (attempts >= maxFallbackAttempts) {
        // Tạo placeholder với chữ cái đầu
        const placeholder = document.createElement('div');
        placeholder.style.cssText = 'width: 100%; height: 180px; background: linear-gradient(135deg, #2DC275 0%, #1f8a53 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 48px; font-weight: bold;';
        placeholder.textContent = event.name.charAt(0).toUpperCase();
        this.parentNode.replaceChild(placeholder, this);
        return;
      }

      // Thử URL khác từ danh sách fallback (tránh trùng lặp)
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

    // Thêm vào card
    eventCard.appendChild(imgElement);

    // Tạo event info
    const eventInfo = document.createElement('div');
    eventInfo.className = 'event-info';
    eventInfo.innerHTML = `
      <p class="event-name">${event.name}</p>
      <p class="event-price">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
          <path d="M12 17.5v-11" />
        </svg>
        ${price}
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
      <p class="event-location" style="margin-top: 4px; font-size: 13px; color: #666;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        ${location}
      </p>
    `;

    eventCard.appendChild(eventInfo);
    eventGrid.appendChild(eventCard);

  });
}

/* --------------------------------------------------
 *  UPDATE SLIDER VỚI EVENTS TỪ DB
 * -------------------------------------------------- */
function updateSliderWithEvents(events) {
  if (!events || events.length === 0) return;

  const slider = document.querySelector('.slider');
  const dotsContainer = document.querySelector('.dots');
  if (!slider || !dotsContainer) return;

  // Xóa slides cũ
  slider.innerHTML = '';
  dotsContainer.innerHTML = '';

  // Lấy tối đa 3 events cho slider
  const sliderEvents = events.slice(0, 3);

  // Tạo slides mới từ events
  sliderEvents.forEach((event, index) => {
    let image = event.cover || FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
    const img = document.createElement('img');
    img.src = image;
    img.className = `slide ${index === 0 ? 'active' : ''}`;
    img.alt = event.name;
    img.loading = 'lazy';
    img.addEventListener('click', () => goSeatmap(event.id));
    // Track fallback attempts cho slider
    let sliderFallbackAttempts = 0;
    const maxSliderFallbacks = 3;

    img.onerror = function () {
      if (sliderFallbackAttempts >= maxSliderFallbacks) {
        // Nếu đã thử hết, dùng gradient placeholder
        const placeholder = document.createElement('div');
        placeholder.className = `slide ${index === 0 ? 'active' : ''}`;
        placeholder.style.cssText = 'width: 100%; height: 100%; background: linear-gradient(135deg, #2DC275 0%, #1f8a53 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 72px; font-weight: bold;';
        placeholder.textContent = event.name.charAt(0).toUpperCase();
        this.parentNode.replaceChild(placeholder, this);
        return;
      }

      // Thử URL khác
      const randomFallback = FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
      this.src = randomFallback;
      sliderFallbackAttempts++;
    };

    slider.appendChild(img);

    // Tạo dots
    const dot = document.createElement('span');
    dot.className = `dot ${index === 0 ? 'active' : ''}`;
    dotsContainer.appendChild(dot);
  });

  // Re-init slider functionality sau khi DOM đã update
  setTimeout(() => {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    let slideIndex = 0;

    function showSlide(index) {
      slides.forEach((s, i) => s.classList.toggle('active', i === index));
      dots.forEach((d, i) => d.classList.toggle('active', i === index));
    }

    // Re-attach event listeners
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

    // Dots click handlers
    dots.forEach((dot, i) => {
      dot.onclick = () => {
        slideIndex = i;
        showSlide(slideIndex);
      };
    });

    // Auto-slide mỗi 5 giây
    if (window.sliderInterval) {
      clearInterval(window.sliderInterval);
    }
    window.sliderInterval = setInterval(() => {
      slideIndex = (slideIndex + 1) % slides.length;
      showSlide(slideIndex);
    }, 5000);
  }, 100);
}

// Load events khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
  loadEvents();
});

/* --------------------------------------------------
 *  AUTH: Lấy token/profile từ localStorage & render UI
 * -------------------------------------------------- */
function getStoredAuth() {
  try {
    // 1) Nếu có object 'auth' { token, user } thì ưu tiên
    const authStr =
      localStorage.getItem('auth') || sessionStorage.getItem('auth');
    if (authStr) {
      const auth = JSON.parse(authStr);
      if (auth?.token && auth?.user) return { token: auth.token, user: auth.user };
    }

    // 2) Đọc token ở cả localStorage & sessionStorage
    const token =
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('accessToken') ||
      sessionStorage.getItem('token') ||
      null;

    // 3) Đọc profile với đủ các key phổ biến: user | profile | currentUser
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
    <div class="login">
      <a href="../../LoginUI/LogRegUI.html?tab=login" class="btn-login btn-link" aria-label="Đăng nhập">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m10 17 5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        </svg>
        Đăng nhập
      </a>
      <a href="../../LoginUI/LogRegUI.html?tab=register" class="btn-register btn-link" aria-label="Đăng ký">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" x2="19" y1="8" y2="14" />
          <line x1="22" x2="16" y1="11" y2="11" />
        </svg>
        Đăng ký
      </a>
    </div>
  `;
}

function buildLoggedInHTML(displayName, avatarUrl, initials = 'U', bg = '#e5e7eb') {
  return `
    <div class="user-menu">
      <button class="user-btn" type="button" aria-haspopup="true" aria-expanded="false">
        <img src="${avatarUrl || ''}" alt="" class="avatar"
             onerror="this.style.display='none';" />
        <div class="avatar-fallback" title="${displayName}" style="background:${bg};">
          ${initials}
        </div>
        <span class="user-name">${displayName}</span>
        <svg class="caret" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div class="user-dropdown" hidden>
        <a href="#" class="dropdown-item" id="gotoMyTickets">Vé của tôi</a>
        <a href="#" class="dropdown-item" id="logoutBtn">Đăng xuất</a>
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
    // gắn chặn "Vé của tôi" luôn khi đang logged out
    guardMyTicketsNavigation();
    return;
  }

  const u = auth.user || {};  // <-- THÊM DÒNG NÀY
  const name = u.fullName || u.name || u.username || u.displayName || 'User';
  const avatar = u.avatar || u.avatarUrl || u.photoURL || '';
  const initials = getInitials(name);
  const bg = pastelFromString(name);
  host.innerHTML = buildLoggedInHTML(name, avatar, initials, bg);

  // Ẩn nút .my-ticket rời vì đã có trong dropdown
  const mt = document.querySelector('.my-ticket');
  if (mt) mt.style.display = 'none';

  // Toggle dropdown
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

  // "Vé của tôi" có guard sẵn trong guardMyTicketsNavigation()
  guardMyTicketsNavigation();

  // Logout
  host.querySelector('#logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    clearAuthStorage();
    renderAuthUI();             // <-- render lại để hiện 2 nút Đăng nhập/Đăng ký
    guardMyTicketsNavigation(); // <-- gắn lại guard cho nút rời
  });
}

// --- AUTH HELPERS ---
function isAuthenticated() {
  return !!getStoredAuth();
}
// Tạo màu pastel ổn định theo tên (hash -> HSL)
function pastelFromString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0; // hash
  }
  // Hue 0..360, giữ S/L để ra pastel
  const hue = h % 360;
  const sat = 65;  // %
  const lig = 72;  // %
  return `hsl(${hue} ${sat}% ${lig}%)`;
}

// Lấy 1-2 initials từ tên
function getInitials(name = 'U') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}


// Chặn click "Vé của tôi" nếu chưa login (cả trong dropdown và nút rời .my-ticket)
function guardMyTicketsNavigation() {
  // Trong dropdown khi đã login
  const goto = document.querySelector('#gotoMyTickets');
  if (goto) {
    goto.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isAuthenticated()) {
        // chưa login -> sang trang login
        window.location.href = '../../LoginUI/LogRegUI.html?tab=login&redirect=' + encodeURIComponent('../MyTickets/index.html');
        return;
      }
      // đã login -> đi tiếp
      window.location.href = '../MyTickets/index.html';
    });
  }

  // Nút rời ở header (khi chưa login mới hiện)
  const loose = document.querySelector('.my-ticket a');
  if (loose) {
    loose.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isAuthenticated()) {
        window.location.href = '../../LoginUI/LogRegUI.html?tab=login&redirect=' + encodeURIComponent('../MyTickets/index.html');
      } else {
        window.location.href = '../MyTickets/index.html';
      }
    });
  }
}

// Dùng trên trang MyTickets để bắt buộc login (nếu bạn có file MyTickets/index.html)
function enforceAuthOnPage() {
  if (!isAuthenticated()) {
    window.location.href = '../../LoginUI/LogRegUI.html?tab=login&redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
  }
}

// === Khởi chạy an toàn cho Auth UI ===
(function initAuthArea() {
  if (typeof renderAuthUI !== 'function') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAuthUI, { once: true });
  } else {
    // DOM đã sẵn sàng
    renderAuthUI();
    guardMyTicketsNavigation();
  }
})();

// Xoá toàn bộ dấu vết đăng nhập ở cả localStorage + sessionStorage
function clearAuthStorage() {
  const keys = ['auth', 'accessToken', 'token', 'user', 'profile', 'currentUser'];
  keys.forEach(k => {
    try { localStorage.removeItem(k); } catch { }
    try { sessionStorage.removeItem(k); } catch { }
  });
}

// trong loadEventPrice(eventId)
async function loadEventPrice(eventId) {
  try {
    // 1) Lấy shows có cache
    let shows = SHOWS_CACHE.get(eventId);
    if (!shows) {
      const showsRes = await fetchWithRetry(`${EVENTS_BASE}/${eventId}/shows`, { method: 'GET' }, { retries: 2, baseDelay: 500 });
      if (!showsRes.ok) return null;
      shows = await showsRes.json();
      SHOWS_CACHE.set(eventId, shows || []);
    }
    if (!shows || shows.length === 0) return null;

    // 2) Lấy show sớm nhất có seatmap
    const sorted = [...shows].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
    const firstShow = sorted.find(s => s.seatMapId) || sorted[0];
    if (!firstShow?.id) return null;

    // 3) Seatmap có cache
    let seatmap = SEATMAP_CACHE.get(firstShow.id);
    if (!seatmap) {
      const seatmapRes = await fetchWithRetry(`${API_BASE}/shows/${firstShow.id}/seatmap`, { method: 'GET' }, { retries: 2, baseDelay: 600 });
      if (!seatmapRes.ok) return null;
      seatmap = await seatmapRes.json();
      SEATMAP_CACHE.set(firstShow.id, seatmap);
    }

    const priceTiers = seatmap?.template?.priceTiers || {};
    const prices = Object.values(priceTiers).map(Number).filter(n => !isNaN(n));
    if (prices.length === 0) {
      return { firstShowId: firstShow.id, firstStartsAt: firstShow.startsAt, display: 'Liên hệ' };
    }
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    return {
      firstShowId: firstShow.id,
      firstStartsAt: firstShow.startsAt,
      min: minPrice,
      max: maxPrice,
      display: minPrice === maxPrice ? formatPrice(minPrice) : `Từ ${formatPrice(minPrice)}`
    };
  } catch (err) {
    console.error(`[events] price of ${eventId}:`, err);
    return null;
  }
}

function goSmartEvent(event) {
  const eventId = event.id;
  const firstShowId = event?.price?.firstShowId; // do loadEventPrice() gắn vào
  const url = firstShowId
    ? `/frontend/seatmapUI/seatmapUI.html?eventId=${encodeURIComponent(eventId)}&showId=${encodeURIComponent(firstShowId)}`
    : `/frontend/shows/showList.html?eventId=${encodeURIComponent(eventId)}`;
  window.location.href = url;
}





