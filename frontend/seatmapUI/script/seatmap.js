// ========================
// CẤU HÌNH API
// ========================
const API_BASE = "http://localhost:4000/api";
const EVENTS_BASE = `${API_BASE}/events`;

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
    let data = null; try { data = await r.json(); } catch { }
    if (!r.ok) {
      const msg = data?.message || `HTTP ${r.status}`;
      // backoff nhẹ khi 429
      if (r.status === 429 && tries > 0) {
        await new Promise(res => setTimeout(res, 600));
        return fetchJSON(url, opts, tries - 1);
      }
      throw new Error(msg);
    }
    return data;
  } catch (e) {
    if (/Failed to fetch/i.test(String(e))) e = new Error("Không kết nối được máy chủ.");
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
  // 3) Fallback mặc định
  else {
    seats = [];
    const ROWS = 10, COLS = 14;
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
    seatMapEl.style.gridTemplateColumns = `repeat(${maxCol}, minmax(36px, 1fr))`;
    seatMapEl.style.gap = "6px";

    const sorted = [...seatList].sort((a, b) => {
      const ra = a.row ?? 9999, rb = b.row ?? 9999;
      if (ra !== rb) return ra - rb;
      const ca = a.col ?? 9999, cb = b.col ?? 9999;
      if (ca !== cb) return ca - cb;
      return String(a.label).localeCompare(String(b.label), "vi");
    });

    sorted.forEach(s => {
      const price = getPriceForTier(s.tier);
      const btn = document.createElement("button");
      btn.className = 'seat ' + tierClass(s.tier);
      btn.textContent = s.label;
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

function toggleSelect(btn, label, tier, price) {
  if (btn.classList.contains("booked") || btn.classList.contains("held")) return;
  const isOn = btn.classList.toggle("selected");
  if (isOn) selected.set(label, { tier, price });
  else selected.delete(label);
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

modalPay?.addEventListener('click', () => {
  // demo: đánh dấu booked + reset giỏ
  document.querySelectorAll('.seat.selected').forEach(el => {
    el.classList.remove('selected');
    el.classList.add('booked');
    el.disabled = true;
  });
  selected.clear();
  renderCart();
  closeModal();
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
}
