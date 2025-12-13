
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:4000/api'
    : 'https://gateway-production-6a61.up.railway.app/api';
const urlParams = new URLSearchParams(window.location.search);

let orderId = urlParams.get('orderId');

// Lấy các phần tử DOM
const statusIcon = document.getElementById('statusIcon');
const statusTitle = document.getElementById('statusTitle');
const statusMessage = document.getElementById('statusMessage');
const orderInfo = document.getElementById('orderInfo');
const orderIdEl = document.getElementById('orderId');
const orderStatusEl = document.getElementById('orderStatus');
const orderAmountEl = document.getElementById('orderAmount');
const actions = document.getElementById('actions');
function getAuthToken() {
    const authStr = localStorage.getItem('auth') || sessionStorage.getItem('auth');
    if (authStr) {
        try {
            const auth = JSON.parse(authStr);
            if (auth?.token) return auth.token;
        } catch { }
    }
    return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || null;
}

async function checkPaymentStatus() {
    if (!orderId) {
        showError('Không tìm thấy mã đơn hàng.');
        return;
    }

    const token = getAuthToken();
    if (!token) {
        showError('Vui lòng đăng nhập để xem trạng thái thanh toán.');
        return;
    }

    try {

        const response = await fetch(`${API_BASE}/payments/status/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(
                'payments/status error:',
                response.status,
                response.statusText,
                text
            );
            throw new Error('Lỗi khi lấy trạng thái thanh toán.');
        }

        const data = await response.json();

        // Cập nhật giao diện
        orderIdEl.textContent = data.orderId || orderId;
        orderStatusEl.textContent = getStatusText(data.orderStatus);
        orderAmountEl.textContent = formatCurrency(data.payment?.amount || 0);

        // Hiển thị trạng thái phù hợp
        if (data.orderStatus === 'paid' && data.payment?.status === 'succeeded') {
            showSuccess('Thanh toán thành công!');
        } else if (data.orderStatus === 'failed' || data.payment?.status === 'failed') {
            showFailed('Thanh toán thất bại.');
        } else if (data.orderStatus === 'pending') {
            showPending('Đang chờ thanh toán...');
        } else {
            showPending('Đang xử lý...');
        }

        orderInfo.style.display = 'block';
        actions.style.display = 'flex';

    } catch (error) {
        console.error('Error checking payment status:', error);
        showError('Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại sau.');
    }
}

// === Các hàm trợ giúp hiển thị UI ===

function showSuccess(message) {
    statusIcon.className = 'icon success';
    statusIcon.innerHTML = '✓';
    statusTitle.textContent = 'Thanh toán thành công!';
    statusMessage.textContent = message;
}

function showFailed(message) {
    statusIcon.className = 'icon failed';
    statusIcon.innerHTML = '✕';
    statusTitle.textContent = 'Thanh toán thất bại';
    statusMessage.textContent = message;
}

function showPending(message) {
    statusIcon.className = 'icon pending';
    statusIcon.innerHTML = '⏳';
    statusTitle.textContent = 'Đang xử lý';
    statusMessage.textContent = message;
}

function showError(message) {
    statusIcon.className = 'icon failed';
    statusIcon.innerHTML = '✕';
    statusTitle.textContent = 'Lỗi';
    statusMessage.textContent = message;
    actions.style.display = 'flex';
}

function getStatusText(status) {
    const statusMap = {
        'paid': 'Đã thanh toán',
        'pending': 'Chờ thanh toán',
        'failed': 'Thanh toán thất bại',
        'cancelled': 'Đã hủy'
    };
    return statusMap[status] || status;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// === Chạy khi tải trang ===

// Bắt đầu kiểm tra trạng thái thanh toán
checkPaymentStatus();

// (Tùy chọn) Vòng lặp kiểm tra lại (Polling)
// Bạn có thể giữ lại hoặc bỏ đi nếu không cần
let pollCount = 0;
const maxPolls = 10;
const pollInterval = setInterval(() => {
    pollCount++;
    if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
        return;
    }
    // Chỉ gọi lại nếu trạng thái vẫn là "pending"
    const currentStatus = orderStatusEl.textContent;
    if (currentStatus.includes('Đang') || currentStatus.includes('Chờ')) {
        checkPaymentStatus();
    } else {
        // Nếu đã thành công hoặc thất bại thì dừng polling
        clearInterval(pollInterval);
    }
}, 2000);