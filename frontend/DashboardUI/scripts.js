// scripts.js — SPA: Overview + Events + Tickets + Users (READ-ONLY)
document.addEventListener("DOMContentLoaded", () => {
    // ====== Config ======
    const headerTitle = document.querySelector(".header h2");
    const navLinks = document.querySelectorAll(".nav a[data-page]");

    const BASE_URL =
        window.DASHBOARD_BASE_URL ||
        document.body?.dataset?.baseUrl ||
        "http://localhost:4000";

    console.log("Dashboard BASE_URL:", BASE_URL);

    // Lấy token từ storage
    function getAuthToken() {
        const authStr = localStorage.getItem('auth') || sessionStorage.getItem('auth');
        if (authStr) {
            try {
                const auth = JSON.parse(authStr);
                if (auth?.token) return auth.token;
            } catch (e) { }
        }
        return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || null;
    }

    function getUserInfo() {
        try {
            const userStr = localStorage.getItem('user') || sessionStorage.getItem('user') ||
                localStorage.getItem('profile') || sessionStorage.getItem('profile') ||
                localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
            if (userStr) {
                return JSON.parse(userStr);
            }
        } catch (e) {
            console.error("Error parsing user info:", e);
        }
        return null;
    }

    const AUTH_TOKEN = getAuthToken();

    // ====== Theme handling ======
    const THEME_KEY = 'dashboardTheme';
    const themeToggleBtn = document.getElementById('theme-toggle');

    function applyTheme(theme) {
        const isDark = theme === 'dark';
        document.body.classList.toggle('dark-mode', isDark);
        if (themeToggleBtn) {
            const icon = themeToggleBtn.querySelector('i');
            if (icon) {
                icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            }
            themeToggleBtn.setAttribute(
                'aria-label',
                isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'
            );
        }
    }

    applyTheme(localStorage.getItem(THEME_KEY) || 'light');

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
            localStorage.setItem(THEME_KEY, nextTheme);
            applyTheme(nextTheme);
        });
    }

    // Lưu trữ bộ lọc overview
    let overviewPeriod = localStorage.getItem('dashboardOverviewPeriod') || '30';
    let overviewGroup = localStorage.getItem('dashboardOverviewGroup') || 'day';

    const periodSelect = document.getElementById('overview-period');
    const groupSelect = document.getElementById('overview-group');
    const overviewRefreshBtn = document.getElementById('overview-refresh');

    if (periodSelect) {
        periodSelect.value = overviewPeriod;
        periodSelect.addEventListener('change', () => {
            overviewPeriod = periodSelect.value || 'all';
            localStorage.setItem('dashboardOverviewPeriod', overviewPeriod);
            loadOverview();
        });
    }

    if (groupSelect) {
        groupSelect.value = overviewGroup;
        groupSelect.addEventListener('change', () => {
            overviewGroup = groupSelect.value || 'day';
            localStorage.setItem('dashboardOverviewGroup', overviewGroup);
            loadOverview();
        });
    }

    if (overviewRefreshBtn) {
        overviewRefreshBtn.addEventListener('click', () => loadOverview());
    }

    // ====== Fetch helper ======
    async function apiFetch(url, options) {
        try {
            const opts = options ? { ...options } : {};
            opts.headers = opts.headers ? { ...opts.headers } : {};
            if (AUTH_TOKEN) {
                opts.headers.Authorization = "Bearer " + AUTH_TOKEN;
            }
            const res = await fetch(url, opts);
            return res;
        } catch (e) {
            console.error("apiFetch error for", url, ":", e);
            return {
                ok: false,
                status: 0,
                statusText: "Network Error",
                json: async () => ({}),
                text: async () => e.message
            };
        }
    }

    // Wrapper for CRUD operations with Content-Type header
    async function fetchWithAuth(url, options = {}) {
        const opts = { ...options };
        opts.headers = opts.headers || {};
        opts.headers['Content-Type'] = 'application/json';
        if (AUTH_TOKEN) {
            opts.headers.Authorization = "Bearer " + AUTH_TOKEN;
        }
        return await fetch(BASE_URL + url, opts);
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
        return Math.max(1, Math.ceil(t / s));
    }

    // ====== Skeleton Loading Helpers ======
    function generateSkeletonRows(count, columns) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `<tr class="skeleton-row">`;
            columns.forEach(col => {
                html += `<td><div class="skeleton-bone ${col}"></div></td>`;
            });
            html += `</tr>`;
        }
        return html;
    }

    // Pre-defined skeleton templates for each table
    const skeletonTemplates = {
        recentOrders: () => generateSkeletonRows(5, ['small', 'large', 'chip']),
        topEvents: () => generateSkeletonRows(5, ['large', 'price']),
        upcomingShows: () => generateSkeletonRows(5, ['large', 'chip'])
    };

    // ====== OVERVIEW ======
    function renderKPIs({ totalRevenue, totalOrders, ticketsSold, successRate, upcomingToday, attendeesToday }) {
        const kpiTickets = document.getElementById("kpi-tickets-sold");
        const kpiRevenue = document.getElementById("kpi-total-revenue");
        const kpiOrders = document.getElementById("kpi-total-orders");
        const kpiSuccess = document.getElementById("kpi-success-rate");
        const kpiUpcoming = document.querySelector('#kpis .kpi:nth-child(5) p');
        const kpiAttendees = document.querySelector('#kpis .kpi:nth-child(6) p');

        if (kpiTickets) kpiTickets.textContent = fmtVND(ticketsSold);
        if (kpiRevenue) kpiRevenue.textContent = fmtVND(totalRevenue) + ' VND';
        if (kpiOrders) kpiOrders.textContent = fmtVND(totalOrders);
        if (kpiSuccess) kpiSuccess.textContent = round1(successRate || 0) + '%';
        if (kpiUpcoming) kpiUpcoming.textContent = fmtVND(upcomingToday || 0);
        if (kpiAttendees) kpiAttendees.textContent = fmtVND(attendeesToday || 0);
    }

    let revenueChart;
    let paymentChart;
    let ticketSalesChart;

    function getGroupLabel(group) {
        if (group === 'week') return 'tuần';
        if (group === 'month') return 'tháng';
        return 'ngày';
    }

    function renderRevenueChart(series, group) {
        const el = document.getElementById("revenue-chart");
        if (!el || typeof Chart === "undefined") return;

        if (revenueChart) {
            try {
                revenueChart.destroy();
            } catch (e) {
                console.warn("Error destroying revenueChart:", e);
            }
            revenueChart = null;
        }

        const ctx = el.getContext("2d");
        const gradient = ctx.createLinearGradient(0, 0, 0, 240);
        gradient.addColorStop(0, 'rgba(124, 93, 250, 0.45)');
        gradient.addColorStop(1, 'rgba(124, 93, 250, 0.05)');

        const arr = safeArray(series);
        const labels = arr.map((x) => x.date);
        const data = arr.map((x) => Number(x.amount || 0));
        const labelUnit = getGroupLabel(group);

        try {
            revenueChart = new Chart(ctx, {
                type: "line",
                data: {
                    labels,
                    datasets: [{
                        label: "Doanh thu theo " + labelUnit,
                        data,
                        tension: 0.35,
                        borderWidth: 2,
                        pointRadius: 3,
                        borderColor: '#7C5DFA',
                        backgroundColor: gradient,
                        fill: true,
                    }]
                },
                options: {
                    scales: { y: { beginAtZero: true } },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: (ctx) => {
                                    const v = Number(ctx.parsed.y || 0).toLocaleString("vi-VN");
                                    return "Doanh thu (" + labelUnit + "): " + v + " đ";
                                }
                            }
                        }
                    }
                },
            });
        } catch (e) {
            console.error("Error creating revenueChart:", e);
        }
    }

    function renderPaymentChart(ratios) {
        const el = document.getElementById("payment-chart");
        if (!el || typeof Chart === "undefined") return;

        if (paymentChart) {
            try {
                paymentChart.destroy();
            } catch (e) {
                console.warn("Error destroying paymentChart:", e);
            }
            paymentChart = null;
        }

        const ctx = el.getContext("2d");
        let rs = ratios || {};

        // Demo data nếu không có dữ liệu thực
        const hasData = Object.values(rs).some(v => Number(v) > 0);
        if (!hasData) {
            rs = {
                'Thành công': 85,
                'Thất bại': 10,
                'Hoàn tiền': 5
            };
        }

        const labels = Object.keys(rs);
        const data = labels.map((k) => Math.round(Number(rs[k] || 0)));

        try {
            paymentChart = new Chart(ctx, {
                type: "doughnut",
                data: {
                    labels,
                    datasets: [{
                        data,
                        backgroundColor: ['#36B37E', '#F26A8D', '#FFAB00', '#7C5DFA'],
                    }]
                },
                options: {
                    plugins: {
                        legend: { position: 'right' }
                    }
                }
            });
        } catch (e) {
            console.error("Error creating paymentChart:", e);
        }
    }

    function renderTicketSalesChart(series, group) {
        const el = document.getElementById("ticket-sales-chart");
        if (!el || typeof Chart === "undefined") return;

        if (ticketSalesChart) {
            try {
                ticketSalesChart.destroy();
            } catch (e) {
                console.warn("Error destroying ticketSalesChart:", e);
            }
            ticketSalesChart = null;
        }

        const ctx = el.getContext("2d");
        let arr = safeArray(series);

        // Sử dụng demo data nếu không đủ dữ liệu thực
        if (arr.length < 3) {
            const today = new Date();
            arr = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                // Random số vé từ 30-150
                arr.push({ date: dateStr, count: Math.floor(Math.random() * 120) + 30 });
            }
        }

        const labels = arr.map((x) => x.date);
        const data = arr.map((x) => Number(x.count || 0));
        const unit = getGroupLabel(group);

        try {
            ticketSalesChart = new Chart(ctx, {
                type: "bar",
                data: {
                    labels,
                    datasets: [{
                        label: "Số vé bán theo " + unit,
                        data,
                        backgroundColor: 'rgba(124, 93, 250, 0.65)',
                        borderColor: '#7C5DFA',
                        borderWidth: 1,
                        borderRadius: 6,
                    }]
                },
                options: {
                    scales: { y: { beginAtZero: true } },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: (ctx) => {
                                    const v = Number(ctx.parsed.y || 0).toLocaleString("vi-VN");
                                    return "Số vé (" + unit + "): " + v;
                                }
                            }
                        }
                    }
                },
            });
        } catch (e) {
            console.error("Error creating ticketSalesChart:", e);
        }
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

    async function loadUpcomingShows() {
        const tbody = document.querySelector("#upcoming-shows-table tbody");
        if (!tbody) return;
        tbody.innerHTML = skeletonTemplates.upcomingShows();

        try {
            const url = BASE_URL + "/api/dashboard/upcoming-shows?limit=5";
            const res = await apiFetch(url);
            if (!res || !res.ok) throw new Error(res?.statusText || 'API error');

            const data = await res.json();
            const arr = safeArray(data);

            if (!arr.length) {
                tbody.innerHTML = `<tr><td colspan="2">Không có sự kiện sắp tới</td></tr>`;
                return;
            }

            tbody.innerHTML = arr.map(x => {
                const dateStr = x.showDate ? new Date(x.showDate).toLocaleDateString('vi-VN') : '';
                const statusClass = x.ticketsStatus === 'Paid' ? 'green' : 'warn';
                const statusText = x.ticketsStatus === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán';
                return `
          <tr>
            <td>${dateStr} - ${x.eventName}</td>
            <td><span class="chip ${statusClass}">${statusText}</span></td>
          </tr>
        `;
            }).join("");
        } catch (e) {
            console.error("loadUpcomingShows error:", e);
            tbody.innerHTML = `<tr><td colspan="2">Lỗi tải dữ liệu</td></tr>`;
        }
    }

    async function loadRecentOrders() {
        const tbody = document.querySelector("#recent-orders-table tbody");
        if (!tbody) return;
        tbody.innerHTML = skeletonTemplates.recentOrders();

        try {
            const url = BASE_URL + "/api/dashboard/tickets?page=1&size=5&order=desc";
            const res = await apiFetch(url);
            if (!res || !res.ok) throw new Error(res?.statusText || 'API error');

            const data = await res.json();
            const arr = safeArray(data?.items);

            if (!arr.length) {
                tbody.innerHTML = `<tr><td colspan="3">Không có đơn hàng nào</td></tr>`;
                return;
            }

            tbody.innerHTML = arr.map((x, index) => {
                const statusText = x.status === 'paid' || x.status === 'sold' ? 'Đã thanh toán' : 'Đã phát hành';
                return `
        <tr>
          <td>${index + 1}</td>
          <td>${x.event?.name || x.eventName || "N/A"}</td>
          <td><span class="chip ${x.status === 'paid' || x.status === 'sold' ? 'green' : 'warn'}">${statusText}</span></td>
        </tr>
      `;
            }).join("");
        } catch (e) {
            console.error("loadRecentOrders error:", e);
            tbody.innerHTML = `<tr><td colspan="3">Lỗi tải đơn hàng</td></tr>`;
        }
    }

    async function loadOverview() {
        const p = overviewPeriod || "all";
        const revGroup = overviewGroup || "day";

        try {
            const [kRes, rRes, tRes, tsRes] = await Promise.all([
                apiFetch(BASE_URL + "/api/dashboard/kpis?period=" + encodeURIComponent(p)),
                apiFetch(BASE_URL + "/api/dashboard/revenue?period=" + encodeURIComponent(p) + "&group=" + encodeURIComponent(revGroup)),
                apiFetch(BASE_URL + "/api/dashboard/top-events?period=" + encodeURIComponent(p)),
                apiFetch(BASE_URL + "/api/dashboard/ticket-sales?period=" + encodeURIComponent(p) + "&group=" + encodeURIComponent(revGroup)),
            ]);

            Promise.all([
                loadRecentOrders().catch(e => console.error("loadRecentOrders error:", e)),
                loadUpcomingShows().catch(e => console.error("loadUpcomingShows error:", e)),
            ]).catch(() => { });

            let kpis = {};
            let revenueSeries = [];
            let topEvents = [];
            let ticketSalesSeries = [];

            if (kRes && kRes.ok) {
                try {
                    kpis = await kRes.json();
                } catch (e) {
                    console.error("Error parsing KPIs:", e);
                }
            }

            if (rRes && rRes.ok) {
                try {
                    revenueSeries = await rRes.json();
                } catch (e) {
                    console.error("Error parsing revenue:", e);
                }
            }

            if (tRes && tRes.ok) {
                try {
                    topEvents = await tRes.json();
                } catch (e) {
                    console.error("Error parsing top events:", e);
                }
            }

            if (tsRes && tsRes.ok) {
                try {
                    ticketSalesSeries = await tsRes.json();
                } catch (e) {
                    console.error("Error parsing ticket sales:", e);
                }
            }

            renderKPIs(kpis || {});
            renderRevenueChart(revenueSeries || [], revGroup);
            renderPaymentChart((kpis && kpis.paymentRatios) || {});
            renderTopEvents(topEvents || []);
            renderTicketSalesChart(ticketSalesSeries || [], revGroup);
        } catch (e) {
            console.error("loadOverview error:", e);
            renderKPIs({});
            renderRevenueChart([], overviewGroup);
            renderPaymentChart({});
            renderTopEvents([]);
            renderTicketSalesChart([], overviewGroup);
        }
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
            tb.innerHTML = `<tr><td colspan="5">Không có dữ liệu</td></tr>`;
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
      <td>
        <button class="btn btn-sm" onclick="openAddShowModal('${ev.id}')" 
                title="Thêm suất chiếu">
          <i class="fa-solid fa-calendar-plus"></i> Thêm show
        </button>
      </td>
    </tr>
  `
            )
            .join("");
    }
    async function loadEvents() {
        const res = await apiFetch(BASE_URL + "/api/events?limit=20&order=desc");
        if (!res.ok) {
            console.error("Events API error", res.status);
            return;
        }
        const data = await res.json();
        const arr = Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data)
                ? data
                : [];
        const items = arr.map((x) => ({
            id: x.id,
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
            console.error("Tickets API error", res.status);
            return;
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
    let usersSearchTerm = '';
    let usersSearchTimeout = null;

    function renderUsers(list) {
        const tb = document.querySelector("#users-table tbody");
        if (!tb) return;
        const arr = safeArray(list);
        if (!arr.length) {
            tb.innerHTML = `<tr><td colspan="5">Không có dữ liệu</td></tr>`;
            return;
        }
        tb.innerHTML = arr
            .map(
                (u) => `
    <tr>
      <td>${u.email || "-"}</td>
      <td>${u.fullName || "-"}</td>
      <td>${Number(u.ordersCount || 0)}</td>
      <td>${fmtDate(u.createdAt)}</td>
      <td>
        <button class="btn btn-sm" onclick="editUser('${u.id}')" title="Sửa">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')" title="Xóa">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
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
        const searchParam = usersSearchTerm ? "&search=" + encodeURIComponent(usersSearchTerm) : "";
        const url =
            BASE_URL +
            "/api/dashboard/users?page=" +
            usersPage +
            "&size=" +
            USERS_PAGE_SIZE +
            "&order=desc" +
            searchParam;

        const res = await apiFetch(url);
        if (!res.ok) {
            console.error("Users API error", res.status);
            return;
        }
        const data = await res.json();
        const arr = Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data)
                ? data
                : [];

        const items = arr.map((x) => ({
            id: x.id,
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
    // ============================================
    // PHẦN CRUD - MODAL VÀ XỬ LÝ
    // ============================================
    // --- Hàm Mở/Đóng Modal ---
    function openModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
    }
    function closeModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    }
    // Đóng modal khi click nút X hoặc nút Hủy
    document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-modal') || btn.closest('.modal').id;
            closeModal(modalId);
        });
    });
    // Đóng modal khi click ra ngoài
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    // --- CRUD USERS (Khách hàng) ---
    document.getElementById('btn-add-user').addEventListener('click', () => {
        document.getElementById('user-form').reset();
        document.getElementById('user-id').value = '';
        document.getElementById('user-modal-title').innerText = 'Thêm Khách hàng';
        openModal('user-modal');
    });
    document.getElementById('user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('user-id').value;
        const email = document.getElementById('user-email').value;
        const fullName = document.getElementById('user-fullname').value;
        const password = document.getElementById('user-password').value;
        const url = id ? `/api/auth/users/${id}` : `/api/auth/register`;
        const method = id ? 'PATCH' : 'POST';
        const body = { email, fullName };
        if (password) body.password = password;
        try {
            const res = await fetchWithAuth(url, { method, body: JSON.stringify(body) });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Lỗi lưu khách hàng');
            }
            alert('✅ Lưu thành công!');
            closeModal('user-modal');
            loadUsers();
        } catch (err) {
            alert('❌ ' + err.message);
        }
    });
    window.editUser = async function (id) {
        document.getElementById('user-form').reset();
        document.getElementById('user-id').value = id;
        document.getElementById('user-modal-title').innerText = 'Sửa Khách hàng';
        openModal('user-modal');
    }
    window.deleteUser = async function (id) {
        if (!confirm('❓ Bạn có chắc muốn xóa khách hàng này?')) return;
        try {
            const res = await fetchWithAuth(`/api/auth/users/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Lỗi xóa khách hàng');
            alert('✅ Đã xóa thành công!');
            loadUsers();
        } catch (e) {
            alert('❌ ' + e.message);
        }
    }
    // --- CRUD EVENTS (Sự kiện) ---
    document.getElementById('btn-add-event').addEventListener('click', () => {
        document.getElementById('event-form').reset();
        document.getElementById('event-id').value = '';
        document.getElementById('event-modal-title').innerText = 'Thêm Sự kiện';
        openModal('event-modal');
    });
    document.getElementById('event-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('event-id').value;
        const name = document.getElementById('event-name').value;
        const city = document.getElementById('event-city').value;
        const startsAt = new Date(document.getElementById('event-startsAt').value).toISOString();
        const cover = document.getElementById('event-cover').value;
        if (id) {
            alert('⚠️ Chức năng sửa sự kiện chưa được hỗ trợ bởi API backend');
            return;
        }
        try {
            const res = await fetchWithAuth('/api/events', {
                method: 'POST',
                body: JSON.stringify({ name, city, startsAt, cover })
            });
            if (!res.ok) throw new Error('Lỗi tạo sự kiện');
            alert('✅ Tạo sự kiện thành công!');
            closeModal('event-modal');
            loadEvents();
        } catch (e) {
            alert('❌ ' + e.message);
        }
    });
    // --- SHOWS (Suất chiếu) ---
    window.openAddShowModal = function (eventId) {
        document.getElementById('show-form').reset();
        document.getElementById('show-event-id').value = eventId;
        loadSeatmapsSelect();
        openModal('show-modal');
    }
    document.getElementById('show-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const eventId = document.getElementById('show-event-id').value;
        const startsAt = new Date(document.getElementById('show-startsAt').value).toISOString();
        const venue = document.getElementById('show-venue').value;
        const seatMapId = document.getElementById('show-seatmap').value;
        try {
            const res = await fetchWithAuth('/api/shows', {
                method: 'POST',
                body: JSON.stringify({ eventId, startsAt, venue, seatMapId })
            });
            if (!res.ok) throw new Error('Lỗi tạo suất chiếu');
            alert('✅ Tạo suất chiếu thành công!');
            closeModal('show-modal');
            loadEvents(); // Reload để cập nhật số suất chiếu
        } catch (e) {
            alert('❌ ' + e.message);
        }
    });
    // --- COUPONS (Mã giảm giá) ---
    async function loadCoupons() {
        try {
            const res = await fetchWithAuth('/api/coupons');
            if (!res.ok) return;
            const data = await res.json();
            const tbody = document.querySelector('#coupons-table tbody');
            tbody.innerHTML = '';

            const list = data.items || [];
            if (!list.length) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 40px;">📋 Chưa có mã giảm giá nào</td></tr>';
                return;
            }

            list.forEach(c => {
                const tr = document.createElement('tr');
                const typeText = c.discountType === 'percent' ? '%' : 'VNĐ';
                const expiresText = c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('vi-VN') : 'Không giới hạn';

                tr.innerHTML = `
        <td><strong>${c.code}</strong></td>
        <td>${typeText}</td>
        <td>${c.discountValue}</td>
        <td>${c.usageLimit || '∞'}</td>
        <td>${c.usedCount || 0}</td>
        <td>${expiresText}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="deleteCoupon('${c.id}')" 
                  title="Xóa mã giảm giá">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error('Lỗi load coupons:', e);
        }
    }
    document.getElementById('btn-add-coupon').addEventListener('click', () => {
        document.getElementById('coupon-form').reset();
        openModal('coupon-modal');
    });
    document.getElementById('coupon-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('coupon-code').value.toUpperCase();
        const discountType = document.getElementById('coupon-type').value;
        const discountValue = Number(document.getElementById('coupon-value').value);
        const usageLimit = document.getElementById('coupon-limit').value
            ? Number(document.getElementById('coupon-limit').value)
            : undefined;
        const expiresAt = document.getElementById('coupon-expires').value
            ? new Date(document.getElementById('coupon-expires').value).toISOString()
            : undefined;
        try {
            const res = await fetchWithAuth('/api/coupons', {
                method: 'POST',
                body: JSON.stringify({ code, discountType, discountValue, usageLimit, expiresAt })
            });
            if (!res.ok) throw new Error('Lỗi tạo mã giảm giá');
            alert('✅ Tạo mã giảm giá thành công!');
            closeModal('coupon-modal');
            loadCoupons();
        } catch (e) {
            alert('❌ ' + e.message);
        }
    });
    window.deleteCoupon = async function (id) {
        if (!confirm('❓ Xóa mã giảm giá này?')) return;
        try {
            const res = await fetchWithAuth(`/api/coupons/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Lỗi xóa mã giảm giá');
            alert('✅ Đã xóa mã giảm giá!');
            loadCoupons();
        } catch (e) {
            alert('❌ ' + e.message);
        }
    }
    // --- SEATMAPS (Sơ đồ ghế) ---
    document.getElementById('btn-add-seatmap').addEventListener('click', () => {
        openModal('seatmap-modal');
    });
    document.getElementById('seatmap-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('seatmap-name').value;

        try {
            const schema = JSON.parse(document.getElementById('seatmap-json').value);
            const res = await fetchWithAuth('/api/seatmaps', {
                method: 'POST',
                body: JSON.stringify({ name, schema })
            });
            if (!res.ok) throw new Error('Lỗi tạo sơ đồ ghế');
            alert('✅ Tạo sơ đồ ghế thành công!');
            closeModal('seatmap-modal');
            loadSeatmapsSelect();
        } catch (e) {
            alert('❌ ' + e.message + ' (Kiểm tra JSON có đúng định dạng không)');
        }
    });
    async function loadSeatmapsSelect() {
        try {
            const res = await fetchWithAuth('/api/seatmaps');
            if (!res.ok) return;
            const data = await res.json();
            const sel = document.getElementById('show-seatmap');
            sel.innerHTML = '<option value="">-- Chọn sơ đồ ghế --</option>';
            (data.items || []).forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.innerText = s.name;
                sel.appendChild(opt);
            });
        } catch (e) {
            console.error('Lỗi load seatmaps:', e);
        }
    }
    function showPage(page) {
        if (page !== 'holds' && typeof window.cleanupHoldsMonitor === 'function') {
            window.cleanupHoldsMonitor();
        }
        navLinks.forEach((a) =>
            a.classList.toggle("active", a.getAttribute("data-page") === page)
        );

        [
            "page-overview",
            "page-events",
            "page-tickets",
            "page-users",
            "page-reports",
            "page-settings",
            "page-holds",
            "page-coupons"
        ].forEach(
            (id) => {
                const el = document.getElementById(id);
                if (!el) return;
                const p = el.getAttribute("data-page");
                el.classList.toggle("hidden", p !== page);
            }
        );

        const titleMap = {
            overview: "Bảng điều khiển",
            events: "Sự kiện",
            tickets: "Đơn hàng",
            users: "Khách hàng",
            holds: "Giữ ghế",
            reports: "Báo cáo",
            settings: "Cài đặt",
            coupons: "Mã giảm giá"
        };
        if (headerTitle) headerTitle.textContent = titleMap[page] || "Dashboard";

        (async () => {
            try {
                if (page === "overview") {
                    await loadOverview();
                } else if (page === "events") {
                    await loadEvents();
                } else if (page === "tickets") {
                    ticketsPage = 1;
                    await loadTickets();
                } else if (page === "users") {
                    usersPage = 1;
                    await loadUsers();
                } else if (page === "holds") {
                    if (typeof window.setupHoldsMonitor === 'function') {
                        window.setupHoldsMonitor();
                    } else {
                        console.warn("setupHoldsMonitor chưa sẵn sàng.");
                    }
                } else if (page === "coupons") {
                    await loadCoupons();
                }
            } catch (e) {
                console.error("Error loading page:", page, e);
            }
        })();
    }

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
    if (usRefresh) usRefresh.addEventListener("click", () => {
        usersPage = 1;
        loadUsers();
    });

    const usersSearch = document.getElementById("users-search");
    if (usersSearch) {
        usersSearch.addEventListener("input", (e) => {
            usersSearchTerm = e.target.value.trim();
            usersPage = 1;

            if (usersSearchTimeout) {
                clearTimeout(usersSearchTimeout);
            }
            usersSearchTimeout = setTimeout(() => {
                loadUsers();
            }, 500);
        });
    }

    // ====== User Profile Functions ======
    function loadUserProfile() {
        const userInfo = getUserInfo();
        if (!userInfo) return;

        const headerAvatar = document.getElementById("header-avatar");
        const dropdownAvatar = document.getElementById("dropdown-avatar");
        const profileAvatarPreview = document.getElementById("profile-avatar-preview");
        const avatarUrl = userInfo.avatar || userInfo.avatarUrl || userInfo.photoURL || "./logo.jpg";

        if (headerAvatar) headerAvatar.src = avatarUrl;
        if (dropdownAvatar) dropdownAvatar.src = avatarUrl;
        if (profileAvatarPreview) profileAvatarPreview.src = avatarUrl;

        const profileName = document.getElementById("profile-name");
        const profileEmail = document.getElementById("profile-email");
        const profileFullname = document.getElementById("profile-fullname");
        const profileEmailInput = document.getElementById("profile-email-input");
        const profileId = document.getElementById("profile-id");
        const profileRole = document.getElementById("profile-role");

        const displayName = userInfo.fullName || userInfo.name || userInfo.displayName || userInfo.username || "Admin";
        const email = userInfo.email || "admin@example.com";
        const id = userInfo.id || "N/A";
        const roles = userInfo.roles || [];
        const roleText = roles.includes("admin") || roles.includes("ADMIN") ? "Quản trị viên" : "Người dùng";

        if (profileName) profileName.textContent = displayName;
        if (profileEmail) profileEmail.textContent = email;
        if (profileFullname) profileFullname.value = displayName;
        if (profileEmailInput) profileEmailInput.value = email;
        if (profileId) profileId.value = id;
        if (profileRole) profileRole.value = roleText;
    }

    function logout() {
        const keys = ['auth', 'accessToken', 'token', 'user', 'profile', 'currentUser'];
        keys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        window.location.href = '/frontend/LoginUI/LogRegUI.html?tab=login';
    }

    const userProfileDropdown = document.getElementById("user-profile-dropdown");
    const profileDropdown = document.getElementById("profile-dropdown");

    if (userProfileDropdown && profileDropdown) {
        userProfileDropdown.addEventListener("click", (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle("active");
        });

        document.addEventListener("click", (e) => {
            if (!userProfileDropdown.contains(e.target)) {
                profileDropdown.classList.remove("active");
            }
        });
    }

    const profileModal = document.getElementById("profile-modal");
    const profileMenuItem = document.getElementById("profile-menu-item");
    const profileModalClose = document.getElementById("profile-modal-close");
    const profileCancelBtn = document.getElementById("profile-cancel-btn");
    const profileForm = document.getElementById("profile-form");
    const avatarUpload = document.getElementById("avatar-upload");

    function openProfileModal() {
        if (profileModal) {
            profileModal.classList.add("active");
            profileDropdown.classList.remove("active");
            loadUserProfile();
        }
    }

    function closeProfileModal() {
        if (profileModal) {
            profileModal.classList.remove("active");
        }
    }

    if (profileMenuItem) {
        profileMenuItem.addEventListener("click", (e) => {
            e.preventDefault();
            openProfileModal();
        });
    }

    if (profileModalClose) {
        profileModalClose.addEventListener("click", closeProfileModal);
    }

    if (profileCancelBtn) {
        profileCancelBtn.addEventListener("click", closeProfileModal);
    }

    if (profileModal) {
        profileModal.addEventListener("click", (e) => {
            if (e.target === profileModal) {
                closeProfileModal();
            }
        });
    }

    if (avatarUpload) {
        avatarUpload.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!file.type.startsWith("image/")) {
                alert("Vui lòng chọn file ảnh!");
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const imageUrl = event.target.result;
                const profileAvatarPreview = document.getElementById("profile-avatar-preview");
                if (profileAvatarPreview) {
                    profileAvatarPreview.src = imageUrl;
                }
            };
            reader.readAsDataURL(file);
        });
    }

    if (profileForm) {
        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const fullname = document.getElementById("profile-fullname")?.value || "";
            const avatarPreview = document.getElementById("profile-avatar-preview")?.src || "";

            const userInfo = getUserInfo();
            if (userInfo) {
                const updatedUser = {
                    ...userInfo,
                    fullName: fullname,
                    name: fullname,
                    avatar: avatarPreview,
                    avatarUrl: avatarPreview,
                    photoURL: avatarPreview
                };

                const authStr = localStorage.getItem('auth') || sessionStorage.getItem('auth');
                if (authStr) {
                    try {
                        const auth = JSON.parse(authStr);
                        auth.user = { ...auth.user, ...updatedUser };
                        (localStorage.getItem('auth') ? localStorage : sessionStorage).setItem('auth', JSON.stringify(auth));
                    } catch (e) { }
                }

                localStorage.setItem('user', JSON.stringify(updatedUser));
                sessionStorage.setItem('user', JSON.stringify(updatedUser));
                localStorage.setItem('profile', JSON.stringify(updatedUser));
                sessionStorage.setItem('profile', JSON.stringify(updatedUser));

                loadUserProfile();
                closeProfileModal();
                alert("Cập nhật hồ sơ thành công!");
            }
        });
    }

    const logoutMenuItem = document.getElementById("logout-menu-item");
    const sidebarLogout = document.getElementById("sidebar-logout");

    if (logoutMenuItem) {
        logoutMenuItem.addEventListener("click", (e) => {
            e.preventDefault();
            if (confirm("Bạn có chắc muốn đăng xuất?")) {
                logout();
            }
        });
    }

    if (sidebarLogout) {
        sidebarLogout.addEventListener("click", (e) => {
            e.preventDefault();
            if (confirm("Bạn có chắc muốn đăng xuất?")) {
                logout();
            }
        });
    }

    loadUserProfile();

    window.addEventListener("storage", (e) => {
        if (e.key === "user" || e.key === "profile" || e.key === "auth") {
            loadUserProfile();
        }
    });

    // Start
    showPage("overview");
});
