// ================================
// HOLDS MONITOR FUNCTIONALITY (FIXED & EXPORTED)
// ================================

(function () {
    let holdsAutoRefreshInterval = null;
    let socket = null;

    // Global helpers
    const getHostForAPI = () => {
        // Nếu frontend ở localhost/127.0.0.1 thì backend cũng ở same IP
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
            return `http://127.0.0.1:4000`;
        }
        // Production: dùng current hostname
        return `${window.location.protocol}//${window.location.hostname}:4000`;
    };

    const BASE_URL = window.DASHBOARD_BASE_URL || getHostForAPI();
    console.log('[Holds Monitor] BASE_URL:', BASE_URL);

    const getToken = () => {
        const authStr = localStorage.getItem('auth') || sessionStorage.getItem('auth');
        if (authStr) {
            try {
                const auth = JSON.parse(authStr);
                if (auth?.token) return auth.token;
            } catch (e) { }
        }
        return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || null;
    };

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatRemainingTime(seconds) {
        if (seconds <= 0) return 'Hết hạn';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins >= 60) {
            const hours = Math.floor(mins / 60);
            const remainMins = mins % 60;
            return `${hours}h ${remainMins}m`;
        }
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    }

    // Load active holds
    async function loadActiveHolds() {
        const loading = document.getElementById('holds-loading');
        const empty = document.getElementById('holds-empty');
        const table = document.getElementById('holds-table');
        const tbody = table ? table.querySelector('tbody') : null;
        const countBadge = document.getElementById('holds-count-badge');

        // Mặc định ẩn empty để tránh nháy
        if (empty) empty.style.display = 'none';

        // Chỉ hiện loading nếu bảng chưa có dữ liệu
        if (loading && (!tbody || !tbody.hasChildNodes())) {
            loading.style.display = 'block';
        }

        try {
            const token = getToken();
            if (!token) {
                if (loading) loading.style.display = 'none';
                if (empty) {
                    empty.style.display = 'block';
                    const p = empty.querySelector('p');
                    if (p) p.innerText = "Vui lòng đăng nhập để xem dữ liệu.";
                }
                return;
            }

            const res = await fetch(`${BASE_URL}/api/dashboard/active-holds`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error(`Lỗi kết nối: ${res.status}`);

            const holds = await res.json();

            if (loading) loading.style.display = 'none';

            // KHÔNG CÓ DATA -> HIỆN EMPTY STATE
            if (!holds || holds.length === 0) {
                if (empty) {
                    empty.style.display = 'block';
                    const p = empty.querySelector('p');
                    // Reset lại text gốc
                    if (p && (p.innerText.includes('Lỗi') || p.innerText.includes('đăng nhập'))) {
                        p.innerHTML = 'Hiện tại không có khách hàng nào đang giữ ghế. <br>Hệ thống đang chờ giao dịch mới xuất hiện.';
                    }
                }
                if (table) table.style.display = 'none';
                if (countBadge) {
                    countBadge.textContent = '0 holds';
                    countBadge.className = 'chip green';
                }
                return;
            }

            // CÓ DATA -> HIỆN BẢNG
            if (empty) empty.style.display = 'none';

            if (countBadge) {
                countBadge.textContent = `${holds.length} hold${holds.length > 1 ? 's' : ''}`;
                countBadge.className = 'chip ' + (holds.length > 10 ? 'red' : holds.length > 5 ? 'orange' : 'green');
            }

            if (tbody && table) {
                tbody.innerHTML = '';
                holds.forEach(hold => {
                    const tr = document.createElement('tr');
                    if (hold.remainingSeconds < 60) tr.style.backgroundColor = '#ffebee';
                    else if (hold.remainingSeconds < 300) tr.style.backgroundColor = '#fff3e0';

                    const timeStr = formatRemainingTime(hold.remainingSeconds);
                    const createdStr = hold.createdAt ? new Date(hold.createdAt).toLocaleString('vi-VN') : 'N/A';
                    const seatsStr = Array.isArray(hold.seats) ? hold.seats.join(', ') : 'N/A';

                    tr.innerHTML = `
                        <td>${escapeHtml(hold.userEmail || 'N/A')}</td>
                        <td>${escapeHtml(hold.eventName || hold.showName || 'N/A')}</td>
                        <td>${escapeHtml(seatsStr)}</td>
                        <td><span class="chip ${hold.remainingSeconds < 60 ? 'red' : hold.remainingSeconds < 300 ? 'orange' : 'green'}">${timeStr}</span></td>
                        <td>${createdStr}</td>
                        <td>
                            <button class="btn btn-sm btn-danger btn-release-hold" data-id="${hold.holdId}">
                                <i class="fa-solid fa-lock-open"></i> Giải phóng
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                const releaseButtons = tbody.querySelectorAll('.btn-release-hold');
                releaseButtons.forEach(btn => {
                    btn.addEventListener('click', function () {
                        forceReleaseHold(this.getAttribute('data-id'), this);
                    });
                });

                table.style.display = 'table';
            }
        } catch (err) {
            console.error('[Holds] Lỗi tải:', err);
            if (loading) loading.style.display = 'none';
            if (empty) {
                empty.style.display = 'block';
                const p = empty.querySelector('p');
                if (p) p.innerText = `Không thể tải dữ liệu: ${err.message}.`;
            }
            if (table) table.style.display = 'none';
        }
    }

    async function forceReleaseHold(holdId, buttonEl) {
        if (!confirm(`Bạn có chắc muốn giải phóng hold này?`)) return;
        const originalText = buttonEl.innerHTML;
        buttonEl.disabled = true;
        buttonEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';

        try {
            const token = getToken();
            const res = await fetch(`${BASE_URL}/api/dashboard/holds/${holdId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const result = await res.json();
            if (result.ok) {
                loadActiveHolds();
            } else {
                throw new Error(result.message || 'Thất bại');
            }
        } catch (err) {
            alert(`Lỗi: ${err.message}`);
            buttonEl.disabled = false;
            buttonEl.innerHTML = originalText;
        }
    }

    function handleSocketEvents() {
        if (!socket) return;
        socket.on('seat-updated', () => loadActiveHolds());
        socket.on('server_force_release_hold', () => loadActiveHolds());
    }

    // --- CÁC HÀM ĐƯỢC EXPORT ---

    function cleanupHoldsMonitor() {
        console.log('[Holds] Dọn dẹp monitor...');
        if (holdsAutoRefreshInterval) {
            clearInterval(holdsAutoRefreshInterval);
            holdsAutoRefreshInterval = null;
        }
        // Lưu ý: Không đóng socket hoàn toàn để tái sử dụng
    }

    function setupHoldsMonitor() {
        console.log('[Holds] Khởi tạo monitor...');
        // Dọn dẹp cũ
        cleanupHoldsMonitor();

        // Socket setup
        if (typeof io !== 'undefined' && !socket) {
            socket = io(BASE_URL);
            handleSocketEvents();
        }

        loadActiveHolds();

        // Refresh Button
        let refreshBtn = document.getElementById('holds-refresh');
        if (refreshBtn) {
            // Clone để xóa event listener cũ
            const newBtn = refreshBtn.cloneNode(true);
            refreshBtn.parentNode.replaceChild(newBtn, refreshBtn);
            newBtn.addEventListener('click', loadActiveHolds);
        }

        // Auto Refresh Checkbox
        let checkbox = document.getElementById('holds-auto-refresh');
        if (checkbox) {
            const newCheckbox = checkbox.cloneNode(true);
            checkbox.parentNode.replaceChild(newCheckbox, checkbox);

            newCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    loadActiveHolds();
                    if (!holdsAutoRefreshInterval) holdsAutoRefreshInterval = setInterval(loadActiveHolds, 5000);
                } else {
                    if (holdsAutoRefreshInterval) {
                        clearInterval(holdsAutoRefreshInterval);
                        holdsAutoRefreshInterval = null;
                    }
                }
            });
            // Mặc định chạy polling nếu checkbox checked
            if (newCheckbox.checked) holdsAutoRefreshInterval = setInterval(loadActiveHolds, 5000);
        }
    }

    // Export ra global window để scripts.js gọi
    window.setupHoldsMonitor = setupHoldsMonitor;
    window.cleanupHoldsMonitor = cleanupHoldsMonitor;
    window.forceReleaseHold = forceReleaseHold;
    window.loadActiveHolds = loadActiveHolds; // Export để nút "Kiểm tra ngay" gọi được

    // Auto-start if manually refreshed on holds page
    document.addEventListener('DOMContentLoaded', () => {
        // Chỉ chạy nếu page holds đang hiển thị sẵn (không có class hidden)
        const holdsPage = document.getElementById('page-holds');
        if (holdsPage && !holdsPage.classList.contains('hidden')) {
            setupHoldsMonitor();
        }
    });

})(); 