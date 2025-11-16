// ========================
// CẤU HÌNH API
// ========================
const API_BASE = "http://localhost:4000/api";
const EVENTS_BASE = `${API_BASE}/events`;

// ========================
// AUTH HELPERS
// ========================
function getAuthToken() {
  // Thử lấy từ auth object trước
  const authStr = localStorage.getItem('auth') || sessionStorage.getItem('auth');
  if (authStr) {
    try {
      const auth = JSON.parse(authStr);
      if (auth?.token) {
        console.log('[getAuthToken] Found token in auth object');
        return auth.token;
      }
    } catch (e) {
      console.warn('[getAuthToken] Failed to parse auth:', e);
    }
  }
  
  // Fallback: lấy từ accessToken
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  if (token) {
    console.log('[getAuthToken] Found token in accessToken');
    return token;
  }
  
  console.warn('[getAuthToken] No token found in storage');
  return null;
}

function isAuthenticated() {
  return !!getAuthToken();
}

// ------------------------
// Helpers
// ------------------------
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const qs = new URLSearchParams(location.search);
const eventIdParam = qs.get("eventId") || "";
let currentShowId = qs.get("showId") || null;

function vnd(n) { return new Intl.NumberFormat("vi-VN").format(n) + "đ"; }
function fmtDate(s) {
  if (!s) return "Chưa có ngày";
  const d = new Date(s); if (isNaN(d)) return "Chưa có ngày";
  return String(d.getDate()).padStart(2, '0') + "/" + String(d.getMonth() + 1).padStart(2, '0') + "/" + d.getFullYear();
}

// ------------------------
// State
// ------------------------
let seatTemplate = null;
let priceTiers = {};
let seats = [];
let selected = new Map();
let purchasing = new Set();
let currentHoldId = null; // Lưu holdId khi tạo hold
const PRICE_DEFAULT = { vip: 150000, normal: 100000 };

// ------------------------
// DOM targets
// ------------------------
const seatMapEl = $("#seatMap");
const showSelect = $("#showSelect");
const eventTitle = $("#eventTitle");
const eventDate = $("#eventDate");
const eventPlace = $("#eventPlace");
const modal = $("#checkoutModal");
const modalEvent = $("#modalEvent");
const modalDate = $("#modalDate");
const modalPlace = $("#modalPlace");
const modalSeats = $("#modalSeats");
const modalTotal = $("#modalTotal");
const modalPay = $("#modalPay");
const modalClose = $("#modalClose");
const checkoutBtn = $("#checkoutBtn");

function openModal() {
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// ------------------------
// Fetchors
// ------------------------
async function fetchJSON(url, opts = {}, tries = 2) {
  try {
    const r = await fetch(url, opts);
    let data = null; 
    try { 
      data = await r.json(); 
    } catch (e) {
      // Nếu không parse được JSON, lấy text
      const text = await r.text();
      console.error('[fetchJSON] Response not JSON:', text);
    }
    
    if (!r.ok) {
      const msg = data?.error?.message || data?.message || `HTTP ${r.status}`;
      console.error('[fetchJSON] Error response:', { status: r.status, statusText: r.statusText, data });
      
      // backoff nhẹ khi 429
      if (r.status === 429 && tries > 0) {
        await new Promise(res => setTimeout(res, 600));
        return fetchJSON(url, opts, tries - 1);
      }
      
      // Thêm status code vào error message
      const error = new Error(msg);
      error.status = r.status;
      error.data = data;
      throw error;
    }
    return data;
  } catch (e) {
    if (/Failed to fetch/i.test(String(e))) {
      e = new Error("Không kết nối được máy chủ.");
    }
    throw e;
  }
}

// ------------------------
// Event + Shows
// ------------------------
async function loadEventInfoByEventId(eventId) {
  // /events/:id có thể lỗi → không chặn
  const [ev, shows] = await Promise.all([
    fetchJSON(`${EVENTS_BASE}/${eventId}`).catch(() => null),
    fetchJSON(`${EVENTS_BASE}/${eventId}/shows`)
  ]);

  // render info cơ bản
  if (ev) {
    eventTitle.textContent = ev.name || "Sự kiện";
    eventPlace.textContent = ev.city || ev.venue || "Địa điểm cập nhật";
  } else {
    eventTitle.textContent = "Sự kiện";
    eventPlace.textContent = "Địa điểm cập nhật";
  }

  // build show selector
  showSelect.innerHTML = "";
  const sorted = [...shows].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  sorted.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${fmtDate(s.startsAt)} • ${s.venue || "N/A"}`;
    showSelect.appendChild(opt);
  });

  // chọn showId
  if (!currentShowId) currentShowId = sorted[0]?.id || null;
  if (currentShowId) showSelect.value = currentShowId;

  const curShow = sorted.find(s => s.id === currentShowId);
  eventDate.textContent = curShow ? fmtDate(curShow.startsAt) : "Chưa có ngày";

  if (currentShowId) await loadSeatMap(currentShowId);

  showSelect.addEventListener("change", async () => {
    currentShowId = showSelect.value;
    const s = sorted.find(x => x.id === currentShowId);
    eventDate.textContent = s ? fmtDate(s.startsAt) : "Chưa có ngày";
    await loadSeatMap(currentShowId);
  });
}

/** Trường hợp không có eventId nhưng có showId trên URL */
async function loadByShowIdOnly(showId) {
  // Lấy show để hiển thị tối thiểu
  const show = await fetchJSON(`${API_BASE}/shows/${showId}`).catch(() => null);
  if (show) {
    eventTitle.textContent = show?.name || "Chọn ghế";
    eventPlace.textContent = show?.venue || " ";
    eventDate.textContent = fmtDate(show?.startsAt);
  } else {
    eventTitle.textContent = "Chọn ghế";
    eventPlace.textContent = " ";
    eventDate.textContent = " ";
  }

  // ẩn selector vì chỉ 1 suất
  if (showSelect) showSelect.style.display = "none";

  await loadSeatMap(showId);
}

// ------------------------
// Seatmap
// ------------------------
async function loadSeatMap(showId) {
  if (!showId) { alert("Thiếu showId"); return; }

  seatMapEl.innerHTML = "Đang tải sơ đồ ghế...";
  selected.clear();

  let data;
  try {
    // Sử dụng fetchJSON để có lỗi thân thiện + retry cho 429
    data = await fetchJSON(`${API_BASE}/shows/${encodeURIComponent(showId)}/seatmap`, {}, 2);
    console.log('[seatmap]', data);
    window.__SEATMAP = data;

  } catch (e) {
    console.error('[seatmap] loadSeatMap error:', e);
    // Nếu server trả 404 => thông báo rõ ràng
    const msg = e?.message || String(e);
    if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      seatMapEl.innerHTML = "Show này chưa gắn seatmap. Vui lòng chọn suất khác.";
    } else if (msg.toLowerCase().includes('không kết nối')) {
      seatMapEl.innerHTML = "Không kết nối được máy chủ. Kiểm tra backend (http://localhost:4000).";
    } else {
      seatMapEl.innerHTML = "Không tải được seatmap. Xem console để biết chi tiết.";
    }
    return;
  }

  const tmpl = data?.template || {};
  priceTiers = tmpl.priceTiers || {};
  updateLegendPrices();
  const held = new Set(data?.held || []);
  const booked = new Set(data?.booked || []);

  // ƯU TIÊN: seats do BE trả về
  // ===== Build seats with row/col =====
  const rxSeat = /^([A-Za-z]+)(\d+)$/;

  // 0) seats ở top-level
  if (Array.isArray(data?.seats) && data.seats.length) {
    seats = data.seats.map(s => {
      const label = s.seatId || s.label || s.id;
      const tier = (s.tier || s.priceTier || s.zone || "normal").toString();
      let row = null, col = null;
      const m = label && rxSeat.exec(label);
      if (m) {
        row = m[1].toUpperCase().charCodeAt(0) - 65; // A->0, B->1...
        col = parseInt(m[2], 10) - 1;                 // 1-based -> 0-based
      }
      return { label, tier, row, col, x: s.x ?? null, y: s.y ?? null };
    });
  }
  // 1) seats nằm trong template
  else if (Array.isArray(tmpl?.seats) && tmpl.seats.length) {
    seats = tmpl.seats.map(s => {
      const label = s.label || s.id || s.seatId;
      const tier = (s.tier || s.priceTier || s.zone || "normal").toString();
      let row = null, col = null;
      const m = label && rxSeat.exec(label);
      if (m) {
        row = m[1].toUpperCase().charCodeAt(0) - 65;
        col = parseInt(m[2], 10) - 1;
      }
      return { label, tier, row, col, x: s.x ?? null, y: s.y ?? null };
    });
  }
  // 2) Sinh ghế từ zones/rows/from/to (format: ROW_NUM)
  else if (Array.isArray(tmpl.zones) && tmpl.zones.length) {
    seats = [];
    let rowIdx = 0;
    for (const z of tmpl.zones) {
      const tier = (z.id || z.name || "normal").toString();
      for (const r of (z.rows || [])) {
        const rowLetter = (r.id || "A").toString().toUpperCase();
        const from = Number(r.from ?? 1);
        const to = Number(r.to ?? from);
        for (let i = from; i <= to; i++) {
          seats.push({
            label: `${rowLetter}${i}`,
            tier: tier,
            row: rowLetter.charCodeAt(0) - 65,
            col: i - 1
          });
        }
        rowIdx++;
      }
    }
  }
  // 3) Fallback mặc định - giảm số ghế để tránh tràn
  else {
    seats = [];
    const ROWS = 8, COLS = 12;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        seats.push({
          label: String.fromCharCode(65 + r) + (c + 1),
          tier: (r < Math.ceil(ROWS / 2)) ? "VIP" : "normal",
          row: r, col: c
        });
      }
    }
  }

  console.log("[seatmap] built seats:", seats.length);


  renderSeatMap(seats, held, booked);
}

function tierClass(t) {
  const k = String(t || '').trim().toLowerCase();
  if (k === 'vip') return 'tier-vip';
  if (k === 'a') return 'tier-a';
  if (k === 'b') return 'tier-b';
  return 'tier-normal';
}
// ------------------------
// Render seats
// ------------------------
function renderSeatMap(seatList, heldSet, bookedSet) {
  if (!seatMapEl) return;
  seatMapEl.innerHTML = "";

  const hasXY = seatList.some(s => s.x != null && s.y != null);

  if (hasXY) {
    seatMapEl.style.position = "relative";
    seatMapEl.style.display = "block";
    seatList.forEach(s => {
      const price = getPriceForTier(s.tier);
      const btn = document.createElement("button");
      btn.className = 'seat ' + tierClass(s.tier);
      btn.textContent = s.label;
      btn.style.position = "absolute";
      btn.style.left = (s.x || 0) + "px";
      btn.style.top = (s.y || 0) + "px";
      applyStatus(btn, s.label, heldSet, bookedSet);
      btn.addEventListener("click", () => toggleSelect(btn, s.label, s.tier, price));
      seatMapEl.appendChild(btn);
    });
  } else {
    seatMapEl.style.display = "grid";
    const maxCol = Math.max(...seatList.map(s => Number(s.col ?? 0))) + 1 || 14;
    // Grid không có cột label, chỉ có ghế - layout compact hơn
    seatMapEl.style.gridTemplateColumns = `repeat(${maxCol}, var(--seat-size))`;
    seatMapEl.style.gap = "var(--seat-gap)";
    seatMapEl.style.justifyContent = "center";
    seatMapEl.style.alignItems = "center";
    seatMapEl.style.width = "100%";
    seatMapEl.style.maxWidth = "100%";

    const sorted = [...seatList].sort((a, b) => {
      const ra = a.row ?? 9999, rb = b.row ?? 9999;
      if (ra !== rb) return ra - rb;
      const ca = a.col ?? 9999, cb = b.col ?? 9999;
      if (ca !== cb) return ca - cb;
      return String(a.label).localeCompare(String(b.label), "vi");
    });

    // Render ghế không có nhãn hàng/cột riêng - hiển thị đầy đủ label trên ghế
    sorted.forEach(s => {
      const price = getPriceForTier(s.tier);
      const btn = document.createElement("button");
      btn.className = 'seat ' + tierClass(s.tier);
      // Hiển thị đầy đủ label ghế (ví dụ: A1, B2, C3...)
      btn.textContent = s.label;
      btn.setAttribute('aria-label', `Ghế ${s.label}`);
      btn.setAttribute('title', `Ghế ${s.label} - ${s.tier}`);
      applyStatus(btn, s.label, heldSet, bookedSet);
      btn.addEventListener("click", () => toggleSelect(btn, s.label, s.tier, price));
      seatMapEl.appendChild(btn);
    });
  }
}
function applyStatus(el, label, heldSet, bookedSet) {
  if (bookedSet.has(label)) { el.classList.add("booked"); el.disabled = true; }
  else if (heldSet.has(label)) { el.classList.add("held"); el.disabled = true; }
}

async function toggleSelect(btn, label, tier, price) {
  if (btn.classList.contains("booked") || btn.classList.contains("held")) return;
  
  const isOn = btn.classList.toggle("selected");
  if (isOn) {
    selected.set(label, { tier, price });
    // Nếu đã có hold cũ, có thể cần cập nhật (tùy chọn)
  } else {
    selected.delete(label);
  }
  renderCart();
}

/* Cập nhật “giỏ” bên trái, KHÔNG mở billPanel */
function renderCart() {
  const tbody = document.querySelector('#cartTable tbody');
  const totalEl = document.querySelector('#cartTotal');
  if (!tbody || !totalEl) return;

  tbody.innerHTML = '';
  let total = 0;
  [...selected.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'vi'))
    .forEach(([label, { tier, price }]) => {
      total += price;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${label}</td>
        <td>${tier}</td>
        <td>${vnd(price)}</td>
        <td><button class="btn-remove" data-seat="${label}">Xóa</button></td>
      `;
      tbody.appendChild(tr);
    });

  totalEl.textContent = vnd(total);

  // nút Xóa trong bảng
  tbody.querySelectorAll('button.btn-remove').forEach(btn => {
    btn.onclick = () => {
      const seat = btn.getAttribute('data-seat');
      selected.delete(seat);
      // bỏ highlight ở map
      const el = [...document.querySelectorAll('.seat')].find(x => x.textContent === seat);
      if (el) el.classList.remove('selected');
      renderCart();
    };
  });
}

/* Chỉ khi bấm Đặt vé mới mở panel */
function openCheckoutModal() {
  if (selected.size === 0) { alert('Bạn chưa chọn ghế nào.'); return; }

  // đổ dữ liệu vào modal
  modalEvent.textContent = eventTitle.textContent || 'Sự kiện';
  modalPlace.textContent = eventPlace.textContent || '';
  modalDate.textContent = eventDate.textContent || '';

  const labels = [...selected.keys()].sort((a, b) => a.localeCompare(b, 'vi'));
  const total = [...selected.values()].reduce((s, x) => s + x.price, 0);

  modalSeats.textContent = 'Ghế: ' + labels.join(', ');
  modalTotal.textContent = vnd(total);

  openModal();
}



modalClose?.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('show')) closeModal(); });

// Trạng thái để tránh click nhiều lần
let isCreatingHold = false;

modalPay?.addEventListener('click', async () => {
  // Tránh click nhiều lần
  if (isCreatingHold) {
    console.log('Hold đang được tạo, vui lòng đợi...');
    return;
  }

  if (!isAuthenticated()) {
    alert('Vui lòng đăng nhập để đặt vé.');
    const redirectTo = encodeURIComponent(location.href);
    window.location.href = `/frontend/LoginUI/LogRegUI.html?tab=login&redirect=${redirectTo}`;
    return;
  }

  if (!currentShowId || selected.size === 0) {
    alert('Vui lòng chọn ghế trước khi đặt vé.');
    return;
  }

  const token = getAuthToken();
  
  // Kiểm tra token trước khi gửi request
  if (!token) {
    alert('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.');
    const redirectTo = encodeURIComponent(location.href);
    window.location.href = `/frontend/LoginUI/LogRegUI.html?tab=login&redirect=${redirectTo}`;
    return;
  }
  
  console.log('[seatmap] Token found:', token.substring(0, 20) + '...');
  
  const seatLabels = [...selected.keys()];
  
  // Tạo idempotency key để tránh duplicate requests (dùng crypto.randomUUID nếu có, hoặc timestamp + random)
  const idempotencyKey = `${currentShowId}-${seatLabels.sort().join(',')}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  
  // Disable button và set trạng thái
  isCreatingHold = true;
  if (modalPay) {
    modalPay.disabled = true;
    const originalText = modalPay.textContent;
    modalPay.textContent = 'Đang xử lý...';
    
    try {
      // Tạo hold với API
      console.log('[seatmap] Creating hold with:', { showId: currentShowId, seats: seatLabels, tokenLength: token.length });
      const holdResponse = await fetchJSON(`${API_BASE}/holds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          showId: currentShowId,
          seats: seatLabels,
          ttlSec: 900 // 15 phút
        })
      });

      if (holdResponse && holdResponse.ok && holdResponse.holdId) {
        currentHoldId = holdResponse.holdId;
        
        // Chuyển đến trang thanh toán với dữ liệu
        const purchaseParams = new URLSearchParams({
          showId: currentShowId,
          holdId: holdResponse.holdId,
          seats: seatLabels.join(','),
          eventId: eventIdParam || ''
        });
        
        // Lưu thông tin vào sessionStorage để purchaseUI có thể dùng
        sessionStorage.setItem('purchaseData', JSON.stringify({
          showId: currentShowId,
          holdId: holdResponse.holdId,
          eventId: eventIdParam || '',
          seats: seatLabels,
          selectedSeats: Object.fromEntries(selected),
          expiresAt: holdResponse.expiresAt
        }));

        window.location.href = `/frontend/PurchaseUI/thanhToan.html?${purchaseParams.toString()}`;
      } else {
        // Xử lý lỗi conflict rõ ràng hơn
        let errorMessage = 'Không thể đặt ghế. Vui lòng thử lại.';
        if (holdResponse?.reason === 'conflict' || holdResponse?.conflicts) {
          const conflicts = holdResponse.conflicts || [];
          errorMessage = `Ghế ${conflicts.join(', ')} đã được người khác chọn. Vui lòng chọn ghế khác.`;
        } else if (holdResponse?.reason) {
          errorMessage = `Lỗi: ${holdResponse.reason}`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error creating hold:', error);
      console.error('Error details:', { 
        message: error.message, 
        status: error.status, 
        data: error.data 
      });
      
      // Xử lý lỗi HTTP 401 Unauthorized
      let errorMessage = 'Không thể đặt ghế. Vui lòng thử lại.';
      
      if (error.status === 401 || error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        // Redirect đến trang login
        const redirectTo = encodeURIComponent(location.href);
        alert(errorMessage);
        window.location.href = `/frontend/LoginUI/LogRegUI.html?tab=login&redirect=${redirectTo}`;
        return;
      } else if (error.status === 409 || error.message?.includes('409')) {
        errorMessage = 'Ghế đã được người khác chọn hoặc đang được giữ. Vui lòng chọn ghế khác.';
      } else if (error.message && error.message.includes('already held')) {
        errorMessage = error.message;
      } else if (error.data?.error?.message) {
        errorMessage = error.data.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Lỗi: ${errorMessage}`);
      
      // Reset button
      modalPay.disabled = false;
      modalPay.textContent = originalText;
      isCreatingHold = false;
    }
  } else {
    isCreatingHold = false;
  }
});


// ------------------------
// Init
// ------------------------
// ------------------------
// Init
// ------------------------
document.addEventListener('DOMContentLoaded', async () => {
  const qs = new URLSearchParams(location.search);
  const eventId = qs.get('eventId');
  const showId = qs.get('showId');

  try {
    // Có eventId: build dropdown suất chiếu + tự chọn showId (nếu đã truyền)
    if (eventId) {
      currentShowId = showId || null;             // ưu tiên showId trên URL
      await loadEventInfoByEventId(eventId);      // sẽ gọi loadSeatMap(currentShowId)
      return;
    }

    // Không có eventId nhưng có showId: tải thẳng seatmap của show đó
    if (showId) {
      await loadByShowIdOnly(showId);
      return;
    }

    // Không có gì -> về Trang chủ
    alert('Thiếu eventId/showId.');
    window.location.replace('/frontend/HomePage/source/TrangChu.html');
  } catch (e) {
    console.error(e);
    alert('Không tải được dữ liệu sự kiện.');
  }
});

checkoutBtn?.addEventListener('click', openCheckoutModal);

function getPriceForTier(tier) {
  const t = String(tier || '').trim();
  const n =
    Number(priceTiers?.[t]) ??
    Number(priceTiers?.[t.toUpperCase()]) ??
    Number(priceTiers?.[t.toLowerCase()]);
  if (!isNaN(n)) return n;
  return PRICE_DEFAULT[t.toLowerCase()] || PRICE_DEFAULT.normal;
}
function updateLegendPrices() {
  const vip = document.querySelector('#priceVip');
  const norm = document.querySelector('#priceNormal');
  if (vip) vip.textContent = vnd(getPriceForTier('VIP'));
  if (norm) norm.textContent = vnd(getPriceForTier('A') || getPriceForTier('normal'));

  const legVip = document.querySelector('#legendVipPrice');
  const legNorm = document.querySelector('#legendNormalPrice');
  if (legVip) legVip.textContent = vnd(getPriceForTier('VIP'));
  if (legNorm) legNorm.textContent = vnd(getPriceForTier('A') || getPriceForTier('normal'));
}
