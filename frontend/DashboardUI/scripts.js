// scripts.js — SPA: Overview + Events + Tickets + Users
document.addEventListener("DOMContentLoaded", () => {
  // ====== Config ======
  const timeFilter = document.getElementById("time-filter");
  const headerTitle = document.querySelector(".header h2");
  const navLinks = document.querySelectorAll(".nav a[data-page]");

  // Ưu tiên dùng biến global nếu có (tiện khi build/gateway)
  const BASE_URL =
    window.DASHBOARD_BASE_URL ||
    document.body?.dataset?.baseUrl ||
    "http://localhost:4000";

  // Nếu các route cần auth thì set token tại đây (hoặc lấy localStorage)
  const AUTH_TOKEN = window.DASHBOARD_TOKEN || null;

  // ====== Fetch helper (kèm Authorization nếu có) ======
  async function apiFetch(url, options) {
    const opts = options ? { ...options } : {};
    opts.headers = opts.headers ? { ...opts.headers } : {};
    if (AUTH_TOKEN) {
      opts.headers.Authorization = "Bearer " + AUTH_TOKEN;
    }
    const res = await fetch(url, opts);
    return res;
  }

  // ====== Utils ======
  const fmtVND = (n) => (Number(n || 0)).toLocaleString("vi-VN");
  const fmtDate = (s) => (s ? new Date(s).toLocaleString("vi-VN") : "-");
  const round1 = (x) =>
    Math.round((Number(x || 0) + Number.EPSILON) * 10) / 10;

  function safeArray(x) {
    return Array.isArray(x) ? x : [];
  }

  function computeTotalPages(total, size) {
    const t = Number(total || 0);
    const s = Number(size || 1);
    const pages = Math.max(1, Math.ceil(t / s));
    return pages;
  }

  // ====== OVERVIEW ======
  function renderKPIs({ totalRevenue, totalOrders, ticketsSold, successRate }) {
    const kpis = document.getElementById("kpis");
    const sr = typeof successRate === "number" ? successRate : 0;
    kpis.innerHTML = `
      <div class="kpi k1">
        <div class="icon">₫</div>
        <h4>Tổng doanh thu</h4>
        <p>${fmtVND(totalRevenue)} VND</p>
        <a href="#" data-page="tickets" class="jump">Xem đơn hàng →</a>
      </div>
      <div class="kpi k2">
        <div class="icon">🛒</div>
        <h4>Tổng đơn hàng</h4>
        <p>${fmtVND(totalOrders)}</p>
        <a href="#" data-page="tickets" class="jump">Xem vé →</a>
      </div>
      <div class="kpi k3">
        <div class="icon">🎟️</div>
        <h4>Vé đã bán</h4>
        <p>${fmtVND(ticketsSold)}</p>
        <a href="#" data-page="tickets" class="jump">Xem vé →</a>
      </div>
      <div class="kpi k4">
        <div class="icon">✅</div>
        <h4>Tỉ lệ thanh toán thành công</h4>
        <p>${round1(sr)}%</p>
        <a href="#" data-page="overview" class="jump">Xem thanh toán →</a>
      </div>
    `;
    kpis.querySelectorAll("a.jump").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        showPage(a.getAttribute("data-page"));
      });
    });
  }

  let revenueChart;
  let paymentChart;

  function renderRevenueChart(series) {
    const el = document.getElementById("revenue-chart");
    if (!el || typeof Chart === "undefined") return;

    const ctx = el.getContext("2d");
    if (revenueChart) revenueChart.destroy();

    const arr = safeArray(series);
    const labels = arr.map((x) => x.date);
    const data = arr.map((x) => Number(x.amount || 0));

    revenueChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{ label: "Doanh thu", data, tension: 0.4 }],
      },
      options: { scales: { y: { beginAtZero: true } } },
    });
  }

  function renderPaymentChart(ratios) {
    const el = document.getElementById("payment-chart");
    if (!el || typeof Chart === "undefined") return;

    const ctx = el.getContext("2d");
    if (paymentChart) paymentChart.destroy();

    const rs = ratios || {};
    const labels = Object.keys(rs);
    const data = labels.map((k) => Math.round(Number(rs[k] || 0)));

    paymentChart = new Chart(ctx, {
      type: "doughnut",
      data: { labels, datasets: [{ data }] },
    });
  }

  function renderTopEvents(rows) {
    const tbody = document.querySelector("#top-events-table tbody");
    if (!tbody) return;
    const arr = safeArray(rows);
    if (!arr.length) {
      tbody.innerHTML = `<tr><td colspan="2">Không có dữ liệu</td></tr>`;
      return;
    }
    tbody.innerHTML = arr
      .map(
        (r) => `
      <tr>
        <td>${r.name}</td>
        <td>${fmtVND(r.revenue)} VND</td>
      </tr>
    `
      )
      .join("");
  }

  async function loadOverview(period) {
    const p = period || "all";

    const [kRes, rRes, tRes] = await Promise.all([
      apiFetch(
        BASE_URL + "/api/dashboard/kpis?period=" + encodeURIComponent(p)
      ),
      apiFetch(
        BASE_URL + "/api/dashboard/revenue?period=" + encodeURIComponent(p)
      ),
      apiFetch(
        BASE_URL + "/api/dashboard/top-events?period=" + encodeURIComponent(p)
      ),
    ]);

    if (!kRes.ok || !rRes.ok || !tRes.ok) {
      console.error("kpis", kRes.status, await kRes.text().catch(() => ""));
      console.error(
        "revenue",
        rRes.status,
        await rRes.text().catch(() => "")
      );
      console.error(
        "top-events",
        tRes.status,
        await tRes.text().catch(() => "")
      );
      throw new Error("Dashboard API error");
    }

    const kpis = await kRes.json();
    const revenueSeries = await rRes.json();
    const topEvents = await tRes.json();

    renderKPIs(kpis || {});
    renderRevenueChart(revenueSeries || []);
    renderPaymentChart((kpis && kpis.paymentRatios) || {});
    renderTopEvents(topEvents || []);
  }

  // ====== EVENTS ======
  function chipStatus(s) {
    if (!s) return '<span class="chip">N/A</span>';
    const cls = s === "published" ? "ok" : s === "draft" ? "warn" : "danger";
    return '<span class="chip ' + cls + '">' + s + "</span>";
  }

  function renderEvents(list) {
    const tb = document.querySelector("#events-table tbody");
    if (!tb) return;

    const arr = safeArray(list);
    if (!arr.length) {
      tb.innerHTML = `<tr><td colspan="4">Không có dữ liệu</td></tr>`;
      return;
    }
    tb.innerHTML = arr
      .map(
        (ev) => `
      <tr>
        <td>${ev.name || "N/A"}</td>
        <td>${Number(ev.showsCount || 0)}</td>
        <td>${chipStatus(ev.status || "published")}</td>
        <td>${fmtDate(ev.createdAt)}</td>
      </tr>
    `
      )
      .join("");
  }

  async function loadEvents() {
    const res = await apiFetch(BASE_URL + "/api/events?limit=20&order=desc");
    if (!res.ok) {
      console.error("Events API error", res.status, await res.text().catch(() => ""));
      throw new Error("Events API error");
    }
    const data = await res.json();
    const arr = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data)
      ? data
      : [];
    const items = arr.map((x) => ({
      name: x.name,
      showsCount:
        x.showsCount != null
          ? x.showsCount
          : x._count && x._count.shows
          ? x._count.shows
          : 0,
      status: x.status || "published",
      createdAt: x.createdAt,
    }));
    renderEvents(items);
  }

  // ====== TICKETS ======
  let ticketsPage = 1;
  const TICKETS_PAGE_SIZE = 20;

  function renderTickets(list) {
    const tb = document.querySelector("#tickets-table tbody");
    if (!tb) return;

    const arr = safeArray(list);
    if (!arr.length) {
      tb.innerHTML = `<tr><td colspan="6">Không có dữ liệu</td></tr>`;
      return;
    }

    tb.innerHTML = arr
      .map(
        (t) => `
      <tr>
        <td>${t.id || "N/A"}</td>
        <td>${t.eventName || "N/A"} / ${t.showId || "-"}</td>
        <td>${t.seatId || "-"}</td>
        <td><span class="chip">${t.status || "issued"}</span></td>
        <td>${t.checkedInAt ? "✅ " + fmtDate(t.checkedInAt) : "—"}</td>
        <td>${fmtDate(t.createdAt)}</td>
      </tr>
    `
      )
      .join("");
  }

  function renderTicketsPager(page, totalPages) {
    const host = document.getElementById("tickets-pager");
    if (!host) return;
    const p = Number(page || 1);
    const tp = Math.max(1, Number(totalPages || 1));
    host.innerHTML = `
      <button id="tk-prev" ${p <= 1 ? "disabled" : ""}>Prev</button>
      <span>Page ${p} / ${tp}</span>
      <button id="tk-next" ${p >= tp ? "disabled" : ""}>Next</button>
    `;
    const prev = document.getElementById("tk-prev");
    const next = document.getElementById("tk-next");
    if (prev) {
      prev.addEventListener("click", () => {
        if (ticketsPage > 1) {
          ticketsPage -= 1;
          loadTickets();
        }
      });
    }
    if (next) {
      next.addEventListener("click", () => {
        ticketsPage += 1;
        loadTickets();
      });
    }
  }

  async function loadTickets() {
    const url =
      BASE_URL +
      "/api/dashboard/tickets?page=" +
      ticketsPage +
      "&size=" +
      TICKETS_PAGE_SIZE +
      "&order=desc";

    const res = await apiFetch(url);
    if (!res.ok) {
      console.error("Tickets API error", res.status, await res.text().catch(() => ""));
      throw new Error("Tickets API error");
    }

    const data = await res.json();
    const arr = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data)
      ? data
      : [];
    const items = arr.map((x) => ({
      id: x.id,
      seatId: x.seatId,
      showId: x.showId,
      createdAt: x.createdAt,
      checkedInAt: x.checkedInAt,
      status: x.status || (x.orderId ? "sold" : "issued"),
      eventName: x.event?.name || x.eventName || null,
    }));

    renderTickets(items);

    // Tính totalPages: ưu tiên backend, nếu không có thì tính từ total
    let page = Number(data?.page || ticketsPage);
    const size = Number(data?.pageSize || TICKETS_PAGE_SIZE);
    let totalPages = Number(data?.totalPages || 0);
    if (!totalPages) {
      const total = Number(data?.total || 0);
      totalPages = computeTotalPages(total, size);
    }
    renderTicketsPager(page, totalPages);
  }

  // ====== USERS ======
  let usersPage = 1;
  const USERS_PAGE_SIZE = 20;

  function renderUsers(list) {
    const tb = document.querySelector("#users-table tbody");
    if (!tb) return;
    const arr = safeArray(list);
    if (!arr.length) {
      tb.innerHTML = `<tr><td colspan="4">Không có dữ liệu</td></tr>`;
      return;
    }
    tb.innerHTML = arr
      .map(
        (u) => `
      <tr>
        <td>${u.email || "-"}</td>
        <td>${u.fullName || "-"}</td>
        <td>${Number(
          u.ordersCount != null
            ? u.ordersCount
            : u._count && u._count.orders
            ? u._count.orders
            : 0
        )}</td>
        <td>${fmtDate(u.createdAt)}</td>
      </tr>
    `
      )
      .join("");
  }

  function renderUsersPager(page, totalPages) {
    const host = document.getElementById("users-pager");
    if (!host) return;
    const p = Number(page || 1);
    const tp = Math.max(1, Number(totalPages || 1));
    host.innerHTML = `
      <button id="us-prev" ${p <= 1 ? "disabled" : ""}>Prev</button>
      <span>Page ${p} / ${tp}</span>
      <button id="us-next" ${p >= tp ? "disabled" : ""}>Next</button>
    `;
    const prev = document.getElementById("us-prev");
    const next = document.getElementById("us-next");
    if (prev) {
      prev.addEventListener("click", () => {
        if (usersPage > 1) {
          usersPage -= 1;
          loadUsers();
        }
      });
    }
    if (next) {
      next.addEventListener("click", () => {
        usersPage += 1;
        loadUsers();
      });
    }
  }

  async function loadUsers() {
    const url =
      BASE_URL +
      "/api/dashboard/users?page=" +
      usersPage +
      "&size=" +
      USERS_PAGE_SIZE +
      "&order=desc";

    const res = await apiFetch(url);
    if (!res.ok) {
      console.error("Users API error", res.status, await res.text().catch(() => ""));
      throw new Error("Users API error");
    }
    const data = await res.json();
    const arr = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data)
      ? data
      : [];

    const items = arr.map((x) => ({
      email: x.email,
      fullName: x.fullName,
      ordersCount:
        x._count && x._count.orders != null
          ? x._count.orders
          : x.ordersCount || 0,
      createdAt: x.createdAt,
    }));

    renderUsers(items);

    let page = Number(data?.page || usersPage);
    const size = Number(data?.pageSize || USERS_PAGE_SIZE);
    let totalPages = Number(data?.totalPages || 0);
    if (!totalPages) {
      const total = Number(data?.total || 0);
      totalPages = computeTotalPages(total, size);
    }
    renderUsersPager(page, totalPages);
  }

  // ====== Page Router ======
  function showPage(page) {
    // toggle nav active
    navLinks.forEach((a) =>
      a.classList.toggle("active", a.getAttribute("data-page") === page)
    );

    // toggle sections
    ["page-overview", "page-events", "page-tickets", "page-users"].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const p = el.getAttribute("data-page");
        el.classList.toggle("hidden", p !== page);
      }
    );

    // header
    const titleMap = {
      overview: "🎨 Dashboard",
      events: "🗂️ Events",
      tickets: "🎟️ Tickets",
      users: "👤 Users",
    };
    if (headerTitle) headerTitle.textContent = titleMap[page] || "Dashboard";
    if (timeFilter) timeFilter.style.display = page === "overview" ? "" : "none";

    (async () => {
      try {
        if (page === "overview") {
          const value = timeFilter ? timeFilter.value : "all";
          await loadOverview(value || "all");
        } else if (page === "events") {
          await loadEvents();
        } else if (page === "tickets") {
          ticketsPage = 1;
          await loadTickets();
        } else if (page === "users") {
          usersPage = 1;
          await loadUsers();
        }
      } catch (e) {
        console.error(e);
        alert("Không tải được dữ liệu cho trang " + page);
      }
    })();
  }

  // Gắn hành vi
  navLinks.forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const p = a.getAttribute("data-page");
      if (p) showPage(p);
    });
  });

  const evRefresh = document.getElementById("ev-refresh");
  if (evRefresh) evRefresh.addEventListener("click", () => loadEvents());

  const tkRefresh = document.getElementById("tk-refresh");
  if (tkRefresh) tkRefresh.addEventListener("click", () => loadTickets());

  const usRefresh = document.getElementById("us-refresh");
  if (usRefresh) usRefresh.addEventListener("click", () => loadUsers());

  if (timeFilter) {
    timeFilter.addEventListener("change", (e) => loadOverview(e.target.value));
  }

  // start
  showPage("overview");
});
