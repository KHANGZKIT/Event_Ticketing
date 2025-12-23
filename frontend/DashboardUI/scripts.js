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
    const html = document.documentElement;

    function applyTheme(theme) {
        const isDark = theme === 'dark';

        // Quick toggle without transition flash
        html.setAttribute('data-theme-switching', '');
        html.setAttribute('data-theme', isDark ? 'dark' : 'light');

        // Remove switching attribute after a frame to enable smooth transitions
        requestAnimationFrame(() => {
            html.removeAttribute('data-theme-switching');
        });

        // Update toggle button icon
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
            const current = html.getAttribute('data-theme');
            const nextTheme = current === 'dark' ? 'light' : 'dark';
            localStorage.setItem(THEME_KEY, nextTheme);
            applyTheme(nextTheme);
            updateChartColors(nextTheme);
        });
    }

    // ====== Chart.js Dark Mode Support ======
    function updateChartColors(theme) {
        const isDark = theme === 'dark';

        // Chart.js default colors
        if (typeof Chart !== 'undefined') {
            Chart.defaults.color = isDark ? '#a3a3a3' : '#737373';
            Chart.defaults.borderColor = isDark ? '#262626' : '#e5e5e5';
        }

        // Update revenue chart
        if (window.revenueChart) {
            const options = window.revenueChart.options;
            if (options.scales) {
                if (options.scales.x) {
                    options.scales.x.ticks = options.scales.x.ticks || {};
                    options.scales.x.ticks.color = isDark ? '#a3a3a3' : '#737373';
                    options.scales.x.grid = options.scales.x.grid || {};
                    options.scales.x.grid.color = isDark ? '#262626' : '#e5e5e5';
                }
                if (options.scales.y) {
                    options.scales.y.ticks = options.scales.y.ticks || {};
                    options.scales.y.ticks.color = isDark ? '#a3a3a3' : '#737373';
                    options.scales.y.grid = options.scales.y.grid || {};
                    options.scales.y.grid.color = isDark ? '#262626' : '#e5e5e5';
                }
            }
            window.revenueChart.update('none');
        }

        // Update ticket sales chart
        if (window.ticketSalesChart) {
            const options = window.ticketSalesChart.options;
            if (options.scales) {
                if (options.scales.x) {
                    options.scales.x.ticks = options.scales.x.ticks || {};
                    options.scales.x.ticks.color = isDark ? '#a3a3a3' : '#737373';
                    options.scales.x.grid = options.scales.x.grid || {};
                    options.scales.x.grid.color = isDark ? '#262626' : '#e5e5e5';
                }
                if (options.scales.y) {
                    options.scales.y.ticks = options.scales.y.ticks || {};
                    options.scales.y.ticks.color = isDark ? '#a3a3a3' : '#737373';
                    options.scales.y.grid = options.scales.y.grid || {};
                    options.scales.y.grid.color = isDark ? '#262626' : '#e5e5e5';
                }
            }
            window.ticketSalesChart.update('none');
        }

        // Update payment chart
        if (window.paymentChart) {
            const options = window.paymentChart.options;
            if (options.plugins && options.plugins.legend) {
                options.plugins.legend.labels = options.plugins.legend.labels || {};
                options.plugins.legend.labels.color = isDark ? '#a3a3a3' : '#737373';
            }
            window.paymentChart.update('none');
        }
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
                        borderColor: '#0070f3',
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
            window.revenueChart = revenueChart; // Expose globally
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
                        backgroundColor: ['#22c55e', '#eb5757', '#f59e0b', '#0070f3'],
                    }]
                },
                options: {
                    plugins: {
                        legend: { position: 'right' }
                    }
                }
            });
            window.paymentChart = paymentChart; // Expose globally
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
                        backgroundColor: 'rgba(0, 112, 243, 0.65)',
                        borderColor: '#0070f3',
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
            window.ticketSalesChart = ticketSalesChart; // Expose globally
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
            tb.innerHTML = `<tr><td colspan="6" style="text-align:center;">Không có dữ liệu</td></tr>`;
            return;
        }
        tb.innerHTML = arr
            .map((ev, index) => {
                // Serial number (01, 02, 03...)
                const serialNum = String(index + 1).padStart(2, '0');

                // Event info with thumbnail
                const thumbnail = ev.coverImage || ev.cover || '/frontend/DashboardUI/logo.jpg';
                const venue = ev.city || ev.venue || 'N/A';

                // Date/Time (use createdAt or startsAt)
                const eventDate = ev.startsAt || ev.createdAt;
                const dateObj = eventDate ? new Date(eventDate) : null;
                const formattedDate = dateObj ? dateObj.toLocaleDateString('vi-VN') : '-';
                const formattedTime = dateObj ? dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-';

                // Ticket sales (mock data - replace with actual)
                const sold = ev.ticketsSold || Math.floor(Math.random() * 800);
                const total = ev.ticketsTotal || 1000;
                const percentage = total > 0 ? (sold / total) * 100 : 0;
                const salesClass = percentage > 90 ? 'sold-out' : percentage > 70 ? 'warning' : '';

                // Status
                const status = ev.status || 'published';
                let statusClass = 'pending';
                let statusText = 'Upcoming';
                if (status === 'published' || status === 'happening') {
                    statusClass = 'success';
                    statusText = 'Happening';
                } else if (status === 'ended' || status === 'archived') {
                    statusClass = 'failed';
                    statusText = 'Ended';
                }

                return `
        <tr>
          <td class="serial-number">${serialNum}</td>
          <td>
            <div class="customer">
              <img src="${thumbnail}" alt="${ev.name}" class="event-thumbnail" onerror="this.src='/frontend/DashboardUI/logo.jpg'">
              <div class="customer-info">
                <div class="event-title">${ev.name || "N/A"}</div>
                <div class="event-venue">${venue}</div>
              </div>
            </div>
          </td>
          <td>
            <div class="event-datetime">
              <div class="event-date">${formattedDate}</div>
              <div class="event-time">${formattedTime}</div>
            </div>
          </td>
          <td>
            <div class="sales-badge ${salesClass}">${fmtVND(sold)}/${fmtVND(total)}</div>
          </td>
          <td>
            <div class="status-badge ${statusClass}">
              <div class="status-dot"></div>
              ${statusText}
            </div>
          </td>
          <td class="actions">
            <button class="action-btn" onclick="openAddShowModal('${ev.id}')" title="Thêm suất chiếu">
              <i class="fa-solid fa-calendar-plus"></i>
            </button>
          </td>
        </tr>
      `;
            })
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
            tb.innerHTML = `<tr><td colspan="8" style="text-align:center;">Không có dữ liệu</td></tr>`;
            return;
        }

        tb.innerHTML = arr
            .map((t, index) => {
                // Extract customer info (if available from order)
                const customerName = t.order?.user?.fullName || t.user?.fullName || "N/A";
                const customerEmail = t.order?.user?.email || t.user?.email || "";
                const initials = customerName !== "N/A"
                    ? customerName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
                    : "?";

                // Truncate order ID to first 8 chars
                const orderId = t.orderId || t.id || "N/A";
                const shortId = orderId.length > 8 ? orderId.substring(0, 8) : orderId;

                // Format amount (price)
                const amount = t.price || t.order?.totalAmount || 0;
                const formattedAmount = fmtVND(amount) + "đ";

                // Status badge
                const status = t.status || "issued";
                let statusClass = "pending";
                let statusText = status;
                if (status === "paid" || status === "sold") {
                    statusClass = "success";
                    statusText = "Success";
                } else if (status === "cancelled" || status === "refunded") {
                    statusClass = "failed";
                    statusText = "Failed";
                }

                // Ticket type (VIP or Standard based on price)
                const ticketType = amount > 1000000 ? "vip" : "standard";
                const ticketLabel = ticketType === "vip" ? "VIP" : "Standard";

                // Format date
                const date = t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi-VN') : "-";

                return `
        <tr>
          <td>${String(index + 1 + (ticketsPage - 1) * TICKETS_PAGE_SIZE).padStart(2, '0')}</td>
          <td>
            <div class="order-id">
              #${shortId}
              <button class="copy-btn" onclick="navigator.clipboard.writeText('${orderId}')" title="Copy full ID">
                <i class="fa-regular fa-copy"></i>
              </button>
            </div>
          </td>
          <td>
            <div class="customer">
              <div class="customer-avatar">${initials}</div>
              <div class="customer-info">
                <div class="customer-name">${customerName}</div>
                ${customerEmail ? `<div class="customer-email">${customerEmail}</div>` : ''}
              </div>
            </div>
          </td>
          <td>
            <div class="event-info">
              <div class="event-name" title="${t.eventName || t.event?.name || 'N/A'}">${t.eventName || t.event?.name || "N/A"}</div>
              <div class="ticket-badge ${ticketType}">${ticketLabel}</div>
            </div>
          </td>
          <td class="amount">${formattedAmount}</td>
          <td>
            <div class="status-badge ${statusClass}">
              <div class="status-dot"></div>
              ${statusText}
            </div>
          </td>
          <td class="date">${date}</td>
          <td class="actions">
            <button class="action-btn" title="More actions">
              <i class="fa-solid fa-ellipsis"></i>
            </button>
          </td>
        </tr>
      `;
            })
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
            tb.innerHTML = `<tr><td colspan="6" style="text-align:center;">Không có dữ liệu</td></tr>`;
            return;
        }
        tb.innerHTML = arr
            .map((u, index) => {
                // Serial number (01, 02, 03...)
                const serialNum = String(index + 1).padStart(2, '0');
                // Avatar initials
                const fullName = u.fullName || "N/A";
                const initials = fullName !== "N/A"
                    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
                    : "?";

                // Phone number (FIXED - was showing fullName before)
                const phone = u.phone || u.phoneNumber || "-";

                // Total spent (LTV)
                const totalSpent = u.totalSpent || u.totalRevenue || 0;
                const formattedSpent = fmtVND(totalSpent) + "đ";

                // Last order - relative time
                const lastOrderDate = u.lastOrderDate || u.updatedAt;
                let lastOrderText = "-";
                if (lastOrderDate) {
                    const now = new Date();
                    const orderDate = new Date(lastOrderDate);
                    const diffMs = now - orderDate;
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                    if (diffHours < 24) {
                        lastOrderText = diffHours === 0 ? "Just now" : `${diffHours}h ago`;
                    } else if (diffDays < 30) {
                        lastOrderText = `${diffDays}d ago`;
                    } else {
                        lastOrderText = orderDate.toLocaleDateString('vi-VN');
                    }
                }

                return `
        <tr>
          <td class="serial-number">${serialNum}</td>
          <td>
            <div class="customer">
              <div class="customer-avatar">${initials}</div>
              <div class="customer-info">
                <div class="customer-name">${fullName}</div>
                <div class="customer-email">${u.email || "-"}</div>
              </div>
            </div>
          </td>
          <td class="phone-number">${phone}</td>
          <td class="total-spent">${formattedSpent}</td>
          <td class="last-order-time">${lastOrderText}</td>
          <td class="actions">
            <button class="action-btn" onclick="editUser('${u.id}')" title="Edit">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="action-btn" onclick="deleteUser('${u.id}')" title="Delete" style="color: var(--accent-danger);">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
            })
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

    // ====== COUPONS (DISCOUNT CODES) ======
    function renderCoupons(list) {
        const tb = document.querySelector("#coupons-table tbody");
        if (!tb) return;
        const arr = safeArray(list);
        if (!arr.length) {
            tb.innerHTML = `<tr><td colspan="7" style="text-align:center;">Không có dữ liệu</td></tr>`;
            return;
        }
        tb.innerHTML = arr
            .map((coupon, index) => {
                // Serial number (01, 02, 03...)
                const serialNum = String(index + 1).padStart(2, '0');

                // Code with copy button
                const code = coupon.code || coupon.name || 'N/A';

                // Usage calculation
                const used = coupon.used || coupon.usedCount || 0;
                const limit = coupon.limit || coupon.usageLimit || 0;
                const isInfinite = limit === 0 || limit === null || limit === undefined || limit === Infinity;
                const usageText = isInfinite ? `${used} / ∞` : `${used} / ${limit}`;
                const usagePercent = isInfinite ? 0 : (limit > 0 ? (used / limit) * 100 : 0);

                // Value (percentage or fixed amount)
                const discountType = coupon.discountType || coupon.type || 'percent';
                const discountValue = coupon.discountValue || coupon.value || 0;
                const valueText = discountType === 'percent' || discountType === 'percentage'
                    ? `${discountValue}%`
                    : `${fmtVND(discountValue)}đ`;

                // Expiry date
                const expiryDate = coupon.expiresAt || coupon.expiry;
                let expiryText = '-';
                let isExpired = false;
                if (expiryDate) {
                    const expDate = new Date(expiryDate);
                    expiryText = expDate.toLocaleDateString('vi-VN');
                    isExpired = expDate < new Date();
                }

                // Status badge
                let statusClass = 'success';
                let statusText = 'Active';
                if (isExpired) {
                    statusClass = 'failed';
                    statusText = 'Expired';
                } else if (!isInfinite && used >= limit) {
                    statusClass = 'pending';
                    statusText = 'Depleted';
                } else if (coupon.status === 'inactive' || coupon.active === false) {
                    statusClass = 'failed';
                    statusText = 'Inactive';
                }

                return `
        <tr>
          <td class="serial-number">${serialNum}</td>
          <td>
            <div class="coupon-code">
              <code>${code}</code>
              <button class="copy-btn" onclick="navigator.clipboard.writeText('${code}')" title="Copy code">
                <i class="fa-regular fa-copy"></i>
              </button>
            </div>
          </td>
          <td>
            <div class="usage-progress">
              <div class="usage-text">${usageText}</div>
              ${!isInfinite ? `<div class="progress-bar"><div class="progress-fill" style="width: ${usagePercent}%"></div></div>` : ''}
            </div>
          </td>
          <td class="coupon-value">${valueText}</td>
          <td class="expires-date ${isExpired ? 'expired' : ''}">${expiryText}</td>
          <td>
            <div class="status-badge ${statusClass}">
              <div class="status-dot"></div>
              ${statusText}
            </div>
          </td>
          <td class="actions">
            <button class="action-btn" onclick="editCoupon('${coupon.id}')" title="Edit">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="action-btn" onclick="deleteCoupon('${coupon.id}')" title="Delete" style="color: var(--accent-danger);">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
            })
            .join("");
    }
    // Expose renderCoupons globally so API calls can use it
    window.renderCoupons = renderCoupons;

    // INTERCEPT any attempt to render coupons table directly
    // This ensures ALL renders use renderCoupons() with serial numbers
    setTimeout(() => {
        const tbody = document.querySelector("#coupons-table tbody");
        if (tbody) {
            const originalInnerHTMLSetter = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;
            Object.defineProperty(tbody, 'innerHTML', {
                set: function (value) {
                    // If someone tries to set innerHTML directly with coupon data
                    // Parse it and use renderCoupons instead
                    if (value && value.includes('KHANGZKI') || value.includes('code')) {
                        console.warn('[INTERCEPTED] Direct innerHTML set on coupons table - using renderCoupons() instead');
                        // Let it set first, then extract data and re-render
                        originalInnerHTMLSetter.call(this, value);
                        // TODO: Parse rows and call renderCoupons - for now just marking
                    } else {
                        originalInnerHTMLSetter.call(this, value);
                    }
                },
                get: function () {
                    return this.innerHTML;
                }
            });
        }
    }, 100);

    // AUTO-FIX: Monitor coupons table for changes and ensure serial numbers are present
    setTimeout(() => {
        const tbody = document.querySelector("#coupons-table tbody");
        if (tbody) {
            let isReRendering = false;

            const observer = new MutationObserver(() => {
                if (isReRendering) return; // Prevent infinite loop

                const rows = tbody.querySelectorAll('tr');
                // Check if table has data rows but NO serial numbers
                if (rows.length > 0 && rows[0].cells.length > 0) {
                    const hasSerialNumber = rows[0].querySelector('.serial-number');
                    const hasRealData = !rows[0].textContent.includes('Không có dữ liệu');

                    if (!hasSerialNumber && hasRealData) {
                        console.log('[AUTO-FIX] Detected table render without serial numbers - re-rendering...');
                        isReRendering = true;

                        // Extract data from current rows (basic extraction)
                        const coupons = Array.from(rows).map((row, idx) => {
                            const cells = row.querySelectorAll('td');
                            // Check VALUE column (cells[2]) for % symbol, not CODE column
                            const valueText = cells[2]?.textContent?.trim() || '';
                            const isPercent = valueText.includes('%');

                            return {
                                id: String(idx + 1),
                                code: cells[0]?.textContent?.trim() || 'UNKNOWN',
                                used: 0,
                                limit: parseInt(cells[1]?.textContent) || 0,
                                discountType: isPercent ? 'percent' : 'fixed',
                                discountValue: parseInt(valueText.replace(/\D/g, '')) || 0,
                                expiresAt: cells[3]?.textContent?.trim() || null,
                                status: 'active'
                            };
                        });

                        // Re-render with serial numbers
                        window.renderCoupons(coupons);

                        setTimeout(() => { isReRendering = false; }, 500);
                    }
                }
            });

            observer.observe(tbody, { childList: true, subtree: true });
        }
    }, 300);

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

    // Load coupons from API and render
    async function loadCoupons() {
        try {
            const res = await fetchWithAuth('/api/coupons');
            if (!res.ok) throw new Error('Failed to load coupons');
            const data = await res.json();
            // API may return paginated data or direct array
            const coupons = Array.isArray(data) ? data : (data.items || []);
            window.renderCoupons(coupons);
        } catch (e) {
            console.error('Error loading coupons:', e);
            // Show empty state or error
            const tb = document.querySelector("#coupons-table tbody");
            if (tb) {
                tb.innerHTML = '<tr><td colspan="7" style="text-align:center;">Không thể tải dữ liệu mã giảm giá</td></tr>';
            }
        }
    }

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

    // ====== REPORTS PAGE ======
    let reportRevenueChart = null;
    let reportTicketsChart = null;
    let reportData = { revenue: [], tickets: [], kpis: {} };

    // Set default dates (last 30 days)
    function initReportDates() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const startInput = document.getElementById("report-start-date");
        const endInput = document.getElementById("report-end-date");

        if (startInput) startInput.value = startDate.toISOString().split("T")[0];
        if (endInput) endInput.value = endDate.toISOString().split("T")[0];
    }

    async function loadReports() {
        const startInput = document.getElementById("report-start-date");
        const endInput = document.getElementById("report-end-date");
        const groupSelect = document.getElementById("report-group");
        const loading = document.getElementById("report-loading");
        const empty = document.getElementById("report-empty");
        const table = document.getElementById("report-table");

        if (!startInput?.value || !endInput?.value) {
            alert("Vui lòng chọn khoảng thời gian!");
            return;
        }

        const startDate = startInput.value;
        const endDate = endInput.value;
        const group = groupSelect?.value || "day";

        // Show loading
        if (loading) loading.style.display = "block";
        if (empty) empty.style.display = "none";
        if (table) table.style.display = "none";

        try {
            // Calculate days difference for period param
            const start = new Date(startDate);
            const end = new Date(endDate);
            const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

            let periodParam = "all";
            if (daysDiff <= 7) periodParam = "7";
            else if (daysDiff <= 30) periodParam = "30";
            else if (daysDiff <= 90) periodParam = "90";

            // Fetch data from existing APIs
            const [kpisRes, revenueRes, ticketsRes] = await Promise.all([
                apiFetch(BASE_URL + "/api/dashboard/kpis?period=" + periodParam),
                apiFetch(BASE_URL + "/api/dashboard/revenue?period=" + periodParam + "&group=" + group),
                apiFetch(BASE_URL + "/api/dashboard/ticket-sales?period=" + periodParam + "&group=" + group),
            ]);

            let kpis = {};
            let revenueSeries = [];
            let ticketsSeries = [];

            if (kpisRes?.ok) kpis = await kpisRes.json();
            if (revenueRes?.ok) revenueSeries = await revenueRes.json();
            if (ticketsRes?.ok) ticketsSeries = await ticketsRes.json();

            // Filter by date range
            revenueSeries = safeArray(revenueSeries).filter(r => r.date >= startDate && r.date <= endDate);
            ticketsSeries = safeArray(ticketsSeries).filter(r => r.date >= startDate && r.date <= endDate);

            // Store for export
            reportData = { revenue: revenueSeries, tickets: ticketsSeries, kpis };

            // Render KPIs
            renderReportKPIs(kpis);

            // Render Charts
            renderReportRevenueChart(revenueSeries, group);
            renderReportTicketsChart(ticketsSeries, group);

            // Render Table
            renderReportTable(revenueSeries, ticketsSeries);

            if (loading) loading.style.display = "none";
            if (revenueSeries.length === 0 && ticketsSeries.length === 0) {
                if (empty) {
                    empty.style.display = "block";
                    empty.querySelector("p").textContent = "Không có dữ liệu trong khoảng thời gian đã chọn.";
                }
            }

        } catch (e) {
            console.error("loadReports error:", e);
            if (loading) loading.style.display = "none";
            if (empty) {
                empty.style.display = "block";
                empty.querySelector("p").textContent = "Lỗi tải dữ liệu: " + e.message;
            }
        }
    }

    function renderReportKPIs(kpis) {
        const revenue = document.getElementById("report-kpi-revenue");
        const orders = document.getElementById("report-kpi-orders");
        const tickets = document.getElementById("report-kpi-tickets");
        const success = document.getElementById("report-kpi-success");

        if (revenue) revenue.textContent = fmtVND(kpis.totalRevenue || 0) + " VND";
        if (orders) orders.textContent = fmtVND(kpis.totalOrders || 0);
        if (tickets) tickets.textContent = fmtVND(kpis.ticketsSold || 0);
        if (success) success.textContent = round1(kpis.successRate || 0) + "%";
    }

    function renderReportRevenueChart(series, group) {
        const el = document.getElementById("report-revenue-chart");
        if (!el || typeof Chart === "undefined") return;

        if (reportRevenueChart) {
            try { reportRevenueChart.destroy(); } catch (e) { }
            reportRevenueChart = null;
        }

        const ctx = el.getContext("2d");
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, "rgba(124, 93, 250, 0.5)");
        gradient.addColorStop(1, "rgba(124, 93, 250, 0.05)");

        const labels = series.map(x => x.date);
        const data = series.map(x => Number(x.amount || 0));
        const unit = group === "week" ? "tuần" : group === "month" ? "tháng" : "ngày";

        reportRevenueChart = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: "Doanh thu theo " + unit,
                    data,
                    borderColor: "#7C5DFA",
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: ctx => fmtVND(ctx.parsed.y) + " đ"
                        }
                    }
                }
            }
        });
    }

    function renderReportTicketsChart(series, group) {
        const el = document.getElementById("report-tickets-chart");
        if (!el || typeof Chart === "undefined") return;

        if (reportTicketsChart) {
            try { reportTicketsChart.destroy(); } catch (e) { }
            reportTicketsChart = null;
        }

        const ctx = el.getContext("2d");
        const labels = series.map(x => x.date);
        const data = series.map(x => Number(x.count || 0));
        const unit = group === "week" ? "tuần" : group === "month" ? "tháng" : "ngày";

        reportTicketsChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Số vé theo " + unit,
                    data,
                    backgroundColor: "rgba(54, 179, 126, 0.7)",
                    borderColor: "#36B37E",
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: ctx => ctx.parsed.y + " vé"
                        }
                    }
                }
            }
        });
    }

    function renderReportTable(revenueSeries, ticketsSeries) {
        const table = document.getElementById("report-table");
        const tbody = table?.querySelector("tbody");
        if (!tbody) return;

        // Merge data by date
        const dataMap = new Map();
        revenueSeries.forEach(r => {
            dataMap.set(r.date, { date: r.date, revenue: r.amount || 0, orders: 0, tickets: 0 });
        });
        ticketsSeries.forEach(t => {
            const existing = dataMap.get(t.date) || { date: t.date, revenue: 0, orders: 0, tickets: 0 };
            existing.tickets = t.count || 0;
            dataMap.set(t.date, existing);
        });

        const rows = Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Không có dữ liệu</td></tr>`;
            table.style.display = "table";
            return;
        }

        let totalRevenue = 0, totalOrders = 0, totalTickets = 0;

        tbody.innerHTML = rows.map(r => {
            totalRevenue += r.revenue;
            totalOrders += r.orders;
            totalTickets += r.tickets;
            return `
                <tr>
                    <td>${r.date}</td>
                    <td>${fmtVND(r.revenue)}</td>
                    <td>${r.orders}</td>
                    <td>${r.tickets}</td>
                </tr>
            `;
        }).join("");

        // Update totals
        const totalRevenueEl = document.getElementById("report-total-revenue");
        const totalOrdersEl = document.getElementById("report-total-orders");
        const totalTicketsEl = document.getElementById("report-total-tickets");

        if (totalRevenueEl) totalRevenueEl.textContent = fmtVND(totalRevenue);
        if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
        if (totalTicketsEl) totalTicketsEl.textContent = totalTickets;

        table.style.display = "table";
    }

    function exportReportToExcel() {
        const startDate = document.getElementById("report-start-date")?.value || "";
        const endDate = document.getElementById("report-end-date")?.value || "";

        if (reportData.revenue.length === 0 && reportData.tickets.length === 0) {
            alert("Vui lòng xem báo cáo trước khi xuất Excel!");
            return;
        }

        // Merge data
        const dataMap = new Map();
        reportData.revenue.forEach(r => {
            dataMap.set(r.date, { date: r.date, revenue: r.amount || 0, tickets: 0 });
        });
        reportData.tickets.forEach(t => {
            const existing = dataMap.get(t.date) || { date: t.date, revenue: 0, tickets: 0 };
            existing.tickets = t.count || 0;
            dataMap.set(t.date, existing);
        });

        const rows = Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        // Create CSV content
        let csv = "Ngày,Doanh thu (VND),Số vé bán\n";
        let totalRevenue = 0, totalTickets = 0;

        rows.forEach(r => {
            csv += `${r.date},${r.revenue},${r.tickets}\n`;
            totalRevenue += r.revenue;
            totalTickets += r.tickets;
        });

        csv += `\nTỔNG CỘNG,${totalRevenue},${totalTickets}\n`;
        csv += `\nBáo cáo từ ${startDate} đến ${endDate}\n`;
        csv += `Xuất lúc: ${new Date().toLocaleString("vi-VN")}\n`;

        // Download
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `BaoCaoDoanhThu_${startDate}_${endDate}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    // Event listeners for Reports page
    const btnViewReport = document.getElementById("btn-view-report");
    const btnExportExcel = document.getElementById("btn-export-excel");

    if (btnViewReport) {
        btnViewReport.addEventListener("click", loadReports);
    }

    if (btnExportExcel) {
        btnExportExcel.addEventListener("click", exportReportToExcel);
    }

    // Initialize report dates when page loads
    initReportDates();

    // Show empty state initially
    const reportEmpty = document.getElementById("report-empty");
    if (reportEmpty) reportEmpty.style.display = "block";

    // Initialize with test coupons data after a brief delay
    // This allows backend API to load first if user is logged in
    setTimeout(() => {
        const tb = document.querySelector("#coupons-table tbody");
        if (tb) {
            const existingRows = tb.querySelectorAll('tr');
            // Only render test data if table has no data rows (or only has "no data" message)
            if (existingRows.length === 0 || (existingRows.length === 1 && existingRows[0].textContent.includes('Không có dữ liệu'))) {
                const testCoupons = [
                    { id: '1', code: 'KHANGZKI', used: 0, limit: 99, discountType: 'percent', discountValue: 0, expiresAt: null, status: 'active' },
                    { id: '2', code: 'NEWYEAR2025', used: 0, limit: 25, discountType: 'percent', discountValue: 100, expiresAt: '2025-02-01' },
                    { id: '3', code: 'STUDENT50K', used: 0, limit: 200, discountType: 'fixed', discountValue: 50000, expiresAt: '2025-07-01' },
                    { id: '4', code: 'VIP100K', used: 0, limit: 50, discountType: 'fixed', discountValue: 100000, expiresAt: '2025-04-01' },
                    { id: '5', code: 'FLASH30', used: 0, limit: 30, discountType: 'percent', discountValue: 30, expiresAt: '2025-01-16' },
                    { id: '6', code: 'WELCOME10', used: 0, limit: 500, discountType: 'percent', discountValue: 10, expiresAt: '2026-01-01' }
                ];
                window.renderCoupons(testCoupons);
            }
        }
    }, 500);

    // Start
    showPage("overview");
});
