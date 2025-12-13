// ===== Config - Auto-detect production/local =====
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? "http://localhost:4000/api"
    : "https://gateway-production-6a61.up.railway.app/api";
const EVENTS_API = `${API_BASE}/events`;

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function fmtDateTime(v) {
    const d = new Date(v);
    if (isNaN(d)) return "Chưa có thời gian";
    return d.toLocaleString("vi-VN", {
        weekday: "short",
        hour: "2-digit", minute: "2-digit",
        day: "2-digit", month: "2-digit", year: "numeric"
    }).replace(",", "");
}
function dayKey(v) {
    const d = new Date(v); if (isNaN(d)) return "Khác";
    return d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}
const fmtVenue = (obj, fb) => obj?.venue || obj?.city || fb || "Chưa có địa điểm";

// Render a day group with show rows
function renderGroup(title, items, eventId) {
    const wrap = document.createElement("section");
    wrap.className = "group";
    const h = document.createElement("h3");
    h.textContent = title;
    wrap.appendChild(h);

    const list = document.createElement("div");
    list.className = "list";
    items.forEach(s => {
        const row = document.createElement("div");
        row.className = "show";

        const left = document.createElement("div");
        left.className = "left";
        left.innerHTML = `
      <span class="pill"><b>🕒 ${fmtDateTime(s.startsAt)}</b></span>
      <span class="pill venue">📍 ${fmtVenue(s)}</span>
      ${s.status ? `<span class="pill status">⚙️ ${s.status}</span>` : ""}
      ${s.priceMin ? `<span class="pill price">💸 từ ${new Intl.NumberFormat('vi-VN').format(s.priceMin)}đ</span>` : ""}
      ${s.soldOut ? `<span class="pill sold">Hết chỗ</span>` : ""}
    `;

        const right = document.createElement("div");
        right.className = "right";
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.textContent = "Chọn ghế";
        btn.onclick = () => {
            const url = `../seatmapUI/seatmapUI.html?eventId=${encodeURIComponent(eventId)}&showId=${encodeURIComponent(s.id)}`;
            window.location.href = url;
        };
        right.appendChild(btn);

        row.appendChild(left);
        row.appendChild(right);
        list.appendChild(row);
    });

    wrap.appendChild(list);
    return wrap;
}

function renderEmpty() {
    $("#root").innerHTML = `
    <div class="empty">
      <div>😿 Sự kiện này hiện chưa có suất chiếu.</div>
      <p>Quay lại trang chủ để chọn sự kiện khác.</p>
    </div>
  `;
}

async function fetchJSON(url) {
    const r = await fetch(url);
    let data = null; try { data = await r.json(); } catch { }
    if (!r.ok) throw new Error((data && data.message) || `HTTP ${r.status}`);
    return data;
}

async function loadEvent(eventId) {
    try {
        const ev = await fetchJSON(`${EVENTS_API}/${eventId}`);
        $("#eventName").textContent = ev?.name || "Sự kiện";
        $("#eventMeta").textContent = fmtVenue(ev);
    } catch {
        $("#eventName").textContent = "Sự kiện";
        $("#eventMeta").textContent = "";
    }
}

function groupByDate(shows) {
    const groups = {};
    shows.forEach(s => {
        const k = dayKey(s.startsAt);
        if (!groups[k]) groups[k] = [];
        groups[k].push(s);
    });
    return groups;
}

async function loadShows(eventId) {
    const sortMode = ($("#sort")?.value === "desc") ? "desc" : "asc";

    // gọi API và bắt lỗi
    let data;
    try {
        data = await fetchJSON(`${EVENTS_API}/${encodeURIComponent(eventId)}/shows`);
    } catch (e) {
        console.error(e);
        renderEmpty("Không tải được danh sách suất chiếu.");
        return;
    }

    // hỗ trợ cả 2 dạng: mảng trực tiếp hoặc { items: [...] }
    const shows = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);

    if (shows.length === 0) {
        renderEmpty("Sự kiện này chưa có suất chiếu.");
        return;
    }

    // sắp xếp theo thời gian
    shows.sort((a, b) => {
        const da = new Date(a.startsAt || 0).getTime();
        const db = new Date(b.startsAt || 0).getTime();
        return sortMode === "asc" ? (da - db) : (db - da);
    });

    // group theo ngày & render
    const byDay = groupByDate(shows);
    const root = $("#root");
    root.innerHTML = "";
    for (const [dateTitle, items] of Object.entries(byDay)) {
        root.appendChild(renderGroup(dateTitle, items, eventId));
    }
}


async function main() {
    const qp = new URLSearchParams(location.search);
    const eventId = qp.get("eventId");
    if (!eventId) {
        $("#root").innerHTML = `<div class="empty">Thiếu <code>eventId</code> trên URL.</div>`;
        return;
    }

    await loadEvent(eventId);
    await loadShows(eventId);

    $("#sort")?.addEventListener("change", () => loadShows(eventId));
    $("#refresh")?.addEventListener("click", () => loadShows(eventId));
}

document.addEventListener("DOMContentLoaded", main);
