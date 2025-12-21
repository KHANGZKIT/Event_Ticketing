// Inspector.js - Ticket Inspector Page Logic
// ============================================

// API Configuration - detect local dev environment
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocal
    ? 'http://localhost:4000/api'
    : 'https://event-ticketing-gateway-production.up.railway.app/api';

// DOM Elements
const uploadZone = document.getElementById('upload-zone');
const qrInput = document.getElementById('qr-input');
const previewArea = document.getElementById('preview-area');
const previewImage = document.getElementById('preview-image');
const clearBtn = document.getElementById('clear-btn');
const ticketIdInput = document.getElementById('ticket-id-input');
const manualCheckinBtn = document.getElementById('manual-checkin-btn');
const resultSection = document.getElementById('result-section');
const resultCard = document.getElementById('result-card');
const loadingOverlay = document.getElementById('loading-overlay');
const toast = document.getElementById('toast');
const logoutBtn = document.getElementById('logout-btn');
const userName = document.getElementById('user-name');
const resetBtn = document.getElementById('reset-btn');

// Auth check on load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

// ============================================
// Authentication
// ============================================

function checkAuth() {
    const token = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        showToast('Vui lòng đăng nhập để sử dụng!', 'error');
        setTimeout(() => {
            // Redirect to login with return URL (use full URL for proper redirect)
            const returnUrl = encodeURIComponent(window.location.href);
            window.location.href = `../LoginUI/LogRegUI.html?redirect=${returnUrl}`;
        }, 1500);
        return;
    }

    // Check if user has required role
    const roles = user.roles || [];
    const hasAccess = roles.some(r => ['admin', 'staff', 'ticket_inspector'].includes(r));

    if (!hasAccess) {
        showToast('Bạn không có quyền truy cập trang này!', 'error');
        setTimeout(() => {
            window.location.href = '../HomePage/source/TrangChu.html';
        }, 1500);
        return;
    }

    // Display user name
    userName.textContent = user.fullName || user.email || 'Staff';
}

function getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// ============================================
// Event Listeners
// ============================================

function setupEventListeners() {
    // Upload zone click
    uploadZone.addEventListener('click', () => qrInput.click());

    // File input change
    qrInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // Clear button
    clearBtn.addEventListener('click', clearPreview);

    // Manual check-in
    manualCheckinBtn.addEventListener('click', handleManualCheckin);
    ticketIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleManualCheckin();
    });

    // Reset button
    resetBtn.addEventListener('click', resetToInitial);

    // Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '../LoginUI/LogRegUI.html';
    });
}

// ============================================
// File Handling
// ============================================

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
        showToast('Chỉ hỗ trợ file PNG, JPG, JPEG!', 'error');
        return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        uploadZone.classList.add('hidden');
        previewArea.classList.remove('hidden');

        // Decode QR from image
        decodeQRFromImage(e.target.result);
    };
    reader.readAsDataURL(file);
}

function clearPreview() {
    previewImage.src = '';
    qrInput.value = '';
    uploadZone.classList.remove('hidden');
    previewArea.classList.add('hidden');
}

// ============================================
// QR Decoding
// ============================================

function decodeQRFromImage(imageDataUrl) {
    showLoading(true);

    const img = new Image();
    img.onload = () => {
        // Create canvas to get image data
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Get image data for jsQR
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        showLoading(false);

        if (code) {
            console.log('QR decoded:', code.data);
            processQRData(code.data);
        } else {
            showToast('Không thể đọc mã QR từ ảnh!', 'error');
        }
    };

    img.onerror = () => {
        showLoading(false);
        showToast('Lỗi khi tải ảnh!', 'error');
    };

    img.src = imageDataUrl;
}

function processQRData(qrData) {
    try {
        // Parse QR payload: { tid: "...", sig: "..." }
        const payload = JSON.parse(qrData);

        if (!payload.tid || !payload.sig) {
            showToast('Mã QR không hợp lệ!', 'error');
            return;
        }

        // Call check-in API
        checkinFromQR(payload);
    } catch (e) {
        console.error('QR parse error:', e);
        showToast('Mã QR không đúng định dạng!', 'error');
    }
}

// ============================================
// API Calls
// ============================================

async function checkinFromQR(payload) {
    showLoading(true);

    try {
        const res = await fetch(`${API_BASE}/tickets/checkin-from-qr`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        showLoading(false);

        if (!res.ok) {
            handleCheckinError(data);
            return;
        }

        showCheckinResult(data, 'success');
    } catch (err) {
        showLoading(false);
        console.error('Checkin error:', err);
        showToast('Lỗi kết nối server!', 'error');
    }
}

async function handleManualCheckin() {
    const ticketId = ticketIdInput.value.trim();

    if (!ticketId) {
        showToast('Vui lòng nhập Ticket ID!', 'error');
        return;
    }

    showLoading(true);

    try {
        const res = await fetch(`${API_BASE}/tickets/${ticketId}/checkin`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        const data = await res.json();
        showLoading(false);

        if (!res.ok) {
            handleCheckinError(data);
            return;
        }

        showCheckinResult(data, 'success');
    } catch (err) {
        showLoading(false);
        console.error('Checkin error:', err);
        showToast('Lỗi kết nối server!', 'error');
    }
}

function handleCheckinError(data) {
    const errorMsg = data.error?.message || data.message || 'Lỗi không xác định';

    if (errorMsg.includes('not found')) {
        showCheckinResult(null, 'error', 'Vé không tồn tại', errorMsg);
    } else if (errorMsg.includes('Invalid QR')) {
        showCheckinResult(null, 'error', 'Mã QR không hợp lệ', 'Chữ ký không khớp');
    } else {
        showCheckinResult(null, 'error', 'Lỗi check-in', errorMsg);
    }
}

// ============================================
// Result Display
// ============================================

function showCheckinResult(ticket, status, title, message) {
    // Hide upload/manual sections
    document.querySelector('.upload-section').classList.add('hidden');
    document.querySelector('.manual-section').classList.add('hidden');

    // Show result section
    resultSection.classList.remove('hidden');

    // Update icon and styling based on status
    const iconEl = resultCard.querySelector('.result-icon');
    const titleEl = document.getElementById('result-title');
    const messageEl = document.getElementById('result-message');
    const ticketInfo = document.getElementById('ticket-info');

    iconEl.className = 'result-icon ' + status;

    if (status === 'success') {
        // Check if already checked in before (checkedInAt existed before this call)
        const isAlreadyCheckedIn = ticket.alreadyCheckedIn;

        if (isAlreadyCheckedIn) {
            iconEl.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
            iconEl.className = 'result-icon warning';
            titleEl.textContent = 'Vé đã check-in trước đó!';
            messageEl.textContent = 'Vé này đã được sử dụng';
        } else {
            iconEl.innerHTML = '<i class="fas fa-check-circle"></i>';
            titleEl.textContent = 'Check-in thành công!';
            messageEl.textContent = 'Chào mừng bạn đến sự kiện';
        }

        // Show ticket info
        ticketInfo.classList.remove('hidden');
        document.getElementById('info-ticket-id').textContent = ticket.id;
        document.getElementById('info-seat').textContent = ticket.seatId || '-';
        document.getElementById('info-time').textContent = ticket.checkedInAt
            ? new Date(ticket.checkedInAt).toLocaleString('vi-VN')
            : new Date().toLocaleString('vi-VN');

    } else if (status === 'warning') {
        iconEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        titleEl.textContent = title || 'Cảnh báo';
        messageEl.textContent = message || '';
        ticketInfo.classList.add('hidden');

    } else {
        iconEl.innerHTML = '<i class="fas fa-times-circle"></i>';
        titleEl.textContent = title || 'Lỗi check-in';
        messageEl.textContent = message || 'Không thể xác thực vé';
        ticketInfo.classList.add('hidden');
    }
}

function resetToInitial() {
    // Hide result
    resultSection.classList.add('hidden');

    // Show upload/manual sections
    document.querySelector('.upload-section').classList.remove('hidden');
    document.querySelector('.manual-section').classList.remove('hidden');

    // Clear inputs
    clearPreview();
    ticketIdInput.value = '';
}

// ============================================
// UI Helpers
// ============================================

function showLoading(show) {
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}
