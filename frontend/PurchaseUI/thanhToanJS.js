(() => {
  // ====== Helpers ======
  const $$ = (sel, root = document) => root.querySelector(sel);
  const $$$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const fmt = new Intl.NumberFormat("vi-VN");
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  // ====== API Config - Auto-detect production/local ======
  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? "http://localhost:4000/api"
    : "https://gateway-production-6a61.up.railway.app/api";

  // ====== Auth Helpers ======
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

  // ====== Load data from URL and sessionStorage ======
  const urlParams = new URLSearchParams(location.search);
  const purchaseDataStr = sessionStorage.getItem('purchaseData');
  let purchaseData = null;
  if (purchaseDataStr) {
    try {
      purchaseData = JSON.parse(purchaseDataStr);
    } catch (e) {
      console.error('Error parsing purchaseData:', e);
    }
  }

  const showId = urlParams.get('showId') || purchaseData?.showId;
  const holdId = urlParams.get('holdId') || purchaseData?.holdId;
  const eventId = urlParams.get('eventId') || purchaseData?.eventId || '';

  // State
  let eventInfo = null;
  let showInfo = null;
  let selectedSeats = purchaseData?.selectedSeats || {};
  let holdExpiresAt = purchaseData?.expiresAt ? new Date(purchaseData.expiresAt).getTime() : null;
  let holdReleased = false; // Flag to prevent multiple release calls

  // ====== Elements ======
  const minutesEl = $$("#minutes");
  const secondsEl = $$("#seconds");
  const countdownWrap = $$("#countdown");
  const countdownNote = $$("#countdownNote");

  const agreeCheckbox = $$("#agreeCheckbox");
  const fullName = $$("#fullName");
  const phone = $$("#phone");
  const email = $$("#email");
  const ticketNameLabel = $$("#ticket-label-name");
  const ticketName = $$("#ticket-name");

  const sidebar = $$(".ticket-summary");
  const btnMinus = $$("#btnMinus");
  const btnPlus = $$("#btnPlus");
  const qtyEl = $$("#quantity");
  const unitPriceEl = $$("#unitPrice");
  const subtotalLabel = $$("#subtotalLabel");
  const totalAmount = $$("#totalAmount");
  const saveRow = $$("#saveRow");
  const saveAmount = $$("#saveAmount");
  const noteInstruction = $$("#noteInstruction");
  const continueBtn = $$("#continueBtn");

  const collapseBtn = $$(".collapse-btn");
  const questionnaire = $$("#questionnaire");

  const voucherInput = $$("#voucherInput");
  const applyVoucherBtn = $$("#applyVoucher");
  const voucherMsg = $$("#voucherMsg");

  const modal = $$("#modal");
  const closeModal = $$("#closeModal");
  if (typeof io !== 'undefined') {
    // Kết nối tới server Socket - Auto-detect production/local
    const SOCKET_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:4000'
      : 'https://gateway-production-6a61.up.railway.app';
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    console.log('Socket initialized on Payment Page');

    // Lắng nghe sự kiện Admin xóa hold
    socket.on('server_force_release_hold', (data) => {
      console.log('[Socket] Admin đã giải phóng hold:', data);

      // Kiểm tra xem ID bị xóa có trùng với ID mình đang giữ không
      if (data.holdId && data.holdId === holdId) {

        // 1. Dừng đếm ngược ngay lập tức
        if (timerId) clearInterval(timerId);

        // 2. Đánh dấu đã release để không gọi API delete lần nữa
        holdReleased = true;

        // 3. Xóa dữ liệu phiên mua vé
        sessionStorage.removeItem('purchaseData');

        // 4. Khóa nút tiếp tục để chặn bấm
        if (continueBtn) {
          continueBtn.disabled = true;
          continueBtn.textContent = "Phiên hết hạn";
        }
        alert("⚠️ THÔNG BÁO: Phiên giữ ghế của bạn đã bị hủy bởi Quản trị viên.");

        if (showId) {
          window.location.href = `/frontend/seatmapUI/seatmapUI.html?showId=${showId}&eventId=${eventId || ''}`;
        } else {
          window.location.href = '/frontend/HomePage/source/TrangChu.html';
        }
      }
    });
  }

  // Initialize ticket name if elements exist
  if (ticketName && ticketNameLabel) {
    ticketName.textContent = ticketNameLabel.textContent;
  }

  // ====== Price / Quantity state ======
  let quantity = Object.keys(selectedSeats).length || 1;

  // Tính giá từ selectedSeats
  function calculateTotalPrice() {
    let total = 0;
    Object.values(selectedSeats).forEach(seat => {
      total += (seat.price || 0);
    });
    return total;
  }

  const UNIT_PRICE = calculateTotalPrice() / quantity || Number(sidebar?.dataset?.unitPrice || "1390000");
  if (unitPriceEl) unitPriceEl.textContent = `${fmt.format(UNIT_PRICE)} đ`;

  // Track applied coupon
  let appliedCoupon = null;

  // ====== Countdown ======
  const parseStartSeconds = () => {
    // Ưu tiên dùng expiresAt từ hold
    if (holdExpiresAt) {
      const secondsLeft = Math.max(0, Math.floor((holdExpiresAt - Date.now()) / 1000));
      return secondsLeft;
    }

    const domMin = parseInt(minutesEl?.textContent ?? "15", 10);
    const domSec = parseInt(secondsEl?.textContent ?? "0", 10);
    const m = Number.isFinite(domMin) ? domMin : 15;
    const s = Number.isFinite(domSec) ? domSec : 0;
    const dataS = Number(countdownWrap?.dataset?.seconds || NaN);
    // If author set data-seconds, use it; else use text content; fallback 15:00
    return Number.isFinite(dataS) ? dataS : (m * 60 + s || 10 * 60);
  };



  const startSeconds = parseStartSeconds();
  const SAFETY_MS = 3000;
  const endAt = holdExpiresAt
    ? holdExpiresAt - SAFETY_MS
    : Date.now() + startSeconds * 1000 - SAFETY_MS;

  const tick = () => {
    const now = Date.now();
    const leftMs = endAt - now;

    if (leftMs <= 0) {
      releaseHoldOnExpire().catch(console.error);

      minutesEl.textContent = "00";
      secondsEl.textContent = "00";
      noteInstruction.textContent = "Hết thời gian giữ chỗ. Đang quay lại trang chọn ghế...";
      countdownNote.hidden = false;
      disableAll(true);
      clearInterval(timerId);

      const qs = new URLSearchParams(location.search);
      const eventId = qs.get("eventId");
      const showId = qs.get("showId");
      let backUrl = "/frontend/seatmapUI/seatmapUI.html";
      if (eventId && showId) {
        backUrl += `?eventId=${encodeURIComponent(eventId)}&showId=${encodeURIComponent(showId)}`;
      } else if (showId) {
        backUrl += `?showId=${encodeURIComponent(showId)}`;
      }

      setTimeout(() => {
        window.location.href = backUrl;
      }, 3000);
      return;
    }

    const left = Math.floor(leftMs / 1000);
    const m = Math.floor(left / 60);
    const s = left % 60;
    minutesEl.textContent = String(m).padStart(2, "0");
    secondsEl.textContent = String(s).padStart(2, "0");
  };


  let timerId = null;

  // ====== Load Event/Show Info ======
  async function loadEventShowInfo() {
    if (!showId) {
      console.warn('No showId provided');
      return;
    }

    try {
      // Load event info trước nếu có eventId (để lấy tên event)
      if (eventId) {
        const eventRes = await fetch(`${API_BASE}/events/${eventId}`);
        if (eventRes.ok) {
          eventInfo = await eventRes.json();
          console.log('Loaded event info:', eventInfo);
        }
      }

      // Load show info
      const showRes = await fetch(`${API_BASE}/shows/${showId}`);
      if (showRes.ok) {
        showInfo = await showRes.json();
        console.log('Loaded show info:', showInfo);

        // Update UI với thông tin show và event
        if (showInfo) {
          const eventTitleEl = $$('.event-title');
          // Ưu tiên tên event, nếu không có thì dùng tên show
          if (eventTitleEl) {
            if (eventInfo?.name) {
              eventTitleEl.textContent = eventInfo.name;
            } else if (showInfo.name) {
              eventTitleEl.textContent = showInfo.name;
            }
          }

          // Update ngày giờ
          const eventDetailItems = $$$('.event-detail-item');
          if (eventDetailItems.length > 0 && showInfo.startsAt) {
            const date = new Date(showInfo.startsAt);
            const dateStr = date.toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            const dateSpan = eventDetailItems[0].querySelector('span:last-child');
            if (dateSpan) {
              dateSpan.textContent = dateStr;
            }
          }

          // Update địa điểm
          if (eventDetailItems.length > 1 && showInfo.venue) {
            const venueSpan = eventDetailItems[1].querySelector('span:last-child');
            if (venueSpan) {
              venueSpan.textContent = showInfo.venue;
            }
          }
        }
      }

      // Update seat names và giá
      const seatLabels = Object.keys(selectedSeats).sort();
      if (seatLabels.length > 0) {
        const ticketNameEl = $$("#ticket-label-name");
        const ticketNameDisplay = $$("#ticket-name");
        const seatNames = seatLabels.join(', ');
        if (ticketNameEl) ticketNameEl.textContent = seatNames;
        if (ticketNameDisplay) ticketNameDisplay.textContent = seatNames;

        // Update giá từ selectedSeats
        const totalPrice = calculateTotalPrice();
        const avgPrice = totalPrice / seatLabels.length;
        if (unitPriceEl) {
          unitPriceEl.textContent = `${fmt.format(avgPrice)} đ`;
        }

        // Update quantity
        quantity = seatLabels.length;
        updateQtyUI();
      }

      // Update totals sau khi load xong
      computeTotals();
    } catch (error) {
      console.error('Error loading event/show info:', error);
    }
  }

  // Initialize countdown timer
  if (startSeconds > 0) {
    timerId = setInterval(tick, 1000);
    tick(); // initial
  } else {
    // Hết thời gian ngay lập tức
    tick();
  }

  // Load data on page load
  loadEventShowInfo();

  // ====== Quantity & Total ======
  const updateQtyUI = () => {
    if (qtyEl) qtyEl.textContent = String(quantity);
    if (btnMinus) btnMinus.disabled = quantity <= 1;
    if (subtotalLabel) {
      const seatCount = Object.keys(selectedSeats).length;
      subtotalLabel.textContent = `Tạm tính ${seatCount} ghế`;
    }
  };

  const computeTotals = () => {
    // Tính tổng từ selectedSeats thực tế
    const baseTotal = calculateTotalPrice();
    const sub = baseTotal * quantity;

    let discount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.discountType === 'percent') {
        // Phần trăm: discountValue là %, ví dụ 20 = 20%
        discount = Math.round(sub * (appliedCoupon.discountValue / 100));
      } else if (appliedCoupon.discountType === 'fixed') {
        // Số tiền cố định: discountValue là số tiền VNĐ
        discount = appliedCoupon.discountValue;
      }
    }

    const total = Math.max(0, sub - discount); // Không để âm

    if (totalAmount) totalAmount.textContent = `${fmt.format(total)} đ`;

    if (discount > 0) {
      if (saveRow) saveRow.hidden = false;
      if (saveAmount) saveAmount.textContent = `${fmt.format(discount)} đ`;

      // Hiển thị message dựa theo loại giảm giá
      if (voucherMsg) {
        if (appliedCoupon.discountType === 'percent') {
          voucherMsg.textContent = `Tiết kiệm ${appliedCoupon.discountValue}% (${fmt.format(discount)} đ)`;
        } else {
          voucherMsg.textContent = `Tiết kiệm ${fmt.format(discount)} đ`;
        }
        voucherMsg.style.color = "#065f46";
      }
    } else {
      if (saveRow) saveRow.hidden = true;
      if (saveAmount) saveAmount.textContent = "0 đ";
      if (voucherMsg) voucherMsg.textContent = "";
    }
  };

  const updateEverything = () => {
    updateQtyUI();
    computeTotals();
    validateForm();
  };

  // Button listeners (no inline onclick)
  btnMinus?.addEventListener("click", () => {
    quantity = clamp(quantity - 1, 1, 999);
    updateEverything();
  });
  btnPlus?.addEventListener("click", () => {
    quantity = clamp(quantity + 1, 1, 999);
    updateEverything();
  });

  // ====== Voucher apply (API-based) ======
  applyVoucherBtn?.addEventListener("click", async () => {
    const code = voucherInput.value.trim().toUpperCase();

    if (!code) {
      appliedCoupon = null;
      updateEverything();
      return;
    }

    const token = getAuthToken();
    if (!token) {
      voucherMsg.textContent = "Vui lòng đăng nhập để sử dụng mã giảm giá.";
      voucherMsg.style.color = "#b91c1c";
      return;
    }

    // Disable button while validating
    applyVoucherBtn.disabled = true;
    applyVoucherBtn.textContent = "Đang kiểm tra...";
    voucherMsg.textContent = "";

    try {
      const res = await fetch(`${API_BASE}/coupons/validate/${encodeURIComponent(code)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || 'Mã giảm giá không hợp lệ';
        throw new Error(errorMsg);
      }

      const data = await res.json();

      if (data.valid && data.coupon) {
        appliedCoupon = data.coupon;
        voucherMsg.textContent = `Mã "${code}" hợp lệ!`;
        voucherMsg.style.color = "#065f46";
      } else {
        appliedCoupon = null;
        voucherMsg.textContent = "Mã giảm giá không hợp lệ.";
        voucherMsg.style.color = "#b91c1c";
      }
    } catch (error) {
      console.error('[Coupon validation error]:', error);
      appliedCoupon = null;
      voucherMsg.textContent = error.message || "Mã giảm giá không hợp lệ hoặc đã hết hạn.";
      voucherMsg.style.color = "#b91c1c";
    } finally {
      applyVoucherBtn.disabled = false;
      applyVoucherBtn.textContent = "Áp dụng";
    }

    updateEverything();
  });

  // ====== Collapse form section ======
  collapseBtn?.addEventListener("click", () => {
    const expanded = collapseBtn.getAttribute("aria-expanded") === "true";
    collapseBtn.setAttribute("aria-expanded", String(!expanded));
    questionnaire.hidden = expanded;
    collapseBtn.textContent = expanded ? "+" : "−";
  });

  // ====== Validation ======
  const errFullName = $$("#errorFullName");
  const errPhone = $$("#errorPhone");
  const errEmail = $$("#errorEmail");

  const validators = {
    fullName(v) {
      if (!v || v.trim().length < 2) return "Vui lòng nhập họ tên hợp lệ.";
      return "";
    },
    phone(v) {
      // VN: 0xxxxxxxxx (10) hoặc +84xxxxxxxxx (>= 9)
      const clean = v.replace(/\s+/g, "");
      const ok = /^(0\d{9,10}|\+84\d{9,10})$/.test(clean);
      if (!ok) return "Số điện thoại Việt Nam không hợp lệ.";
      return "";
    },
    email(v) {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      if (!ok) return "Email không hợp lệ.";
      return "";
    }
  };

  const setError = (el, msgEl, msg) => {
    if (msgEl) {
      msgEl.textContent = msg || "";
    }
    if (el) {
      el.setAttribute("aria-invalid", msg ? "true" : "false");
    }
  };

  // Payment method selection
  const paymentMomo = $$("#paymentMomo");
  const paymentVnpay = $$("#paymentVnpay");
  const momoInfo = $$("#momoInfo");
  const vnpayInfo = $$("#vnpayInfo");
  const errPaymentMethod = $$("#errorPaymentMethod");

  // Hiển thị/ẩn thông tin khi chọn phương thức thanh toán
  function updatePaymentInfo() {
    if (paymentMomo?.checked) {
      momoInfo?.removeAttribute('hidden');
      vnpayInfo?.setAttribute('hidden', '');
    } else if (paymentVnpay?.checked) {
      vnpayInfo?.removeAttribute('hidden');
      momoInfo?.setAttribute('hidden', '');
    } else {
      momoInfo?.setAttribute('hidden', '');
      vnpayInfo?.setAttribute('hidden', '');
    }
  }

  paymentMomo?.addEventListener("change", () => {
    updatePaymentInfo();
    validateForm();
  });

  paymentVnpay?.addEventListener("change", () => {
    updatePaymentInfo();
    validateForm();
  });

  function validateForm() {
    const e1 = validators.fullName(fullName.value);
    const e2 = validators.phone(phone.value);
    const e3 = validators.email(email.value);

    // Kiểm tra đã chọn phương thức thanh toán chưa
    const paymentSelected = paymentMomo?.checked || paymentVnpay?.checked;
    const e4 = paymentSelected ? null : 'Vui lòng chọn phương thức thanh toán';

    setError(fullName, errFullName, e1);
    setError(phone, errPhone, e2);
    setError(email, errEmail, e3);
    setError(null, errPaymentMethod, e4);

    const ok = agreeCheckbox.checked && !e1 && !e2 && !e3 && !e4;
    continueBtn.disabled = !ok;
    continueBtn.setAttribute("aria-disabled", String(!ok));
    return ok;
  }

  [fullName, phone, email].forEach(i => i.addEventListener("input", validateForm));
  agreeCheckbox.addEventListener("change", validateForm);


  const disableAll = (lock) => {
    [btnMinus, btnPlus, continueBtn, applyVoucherBtn, voucherInput, fullName, phone, email, agreeCheckbox].forEach(el => {
      if (!el) return;
      el.disabled = lock;
    });
  };


  // ====== Change ticket button ======
  const changeTicketBtn = $$("#changeTicketBtn");
  if (changeTicketBtn) {
    changeTicketBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // Release hold trước khi chuyển trang
      releaseHoldOnExit();
      // Quay lại seatmapUI với showId và eventId
      if (showId) {
        let url = `/frontend/seatmapUI/seatmapUI.html?showId=${encodeURIComponent(showId)}`;
        if (eventId) {
          url += `&eventId=${encodeURIComponent(eventId)}`;
        }
        window.location.href = url;
      } else {
        alert('Không tìm thấy thông tin show. Vui lòng quay lại trang chủ.');
        window.location.href = '/frontend/HomePage/source/TrangChu.html';
      }
    });
  }

  // ====== Release Hold Functions ======
  async function releaseHoldOnExit() {
    if (!holdId || holdReleased) {
      return;
    }

    holdReleased = true;
    const token = getAuthToken();

    if (!token) {
      console.warn('No auth token found, cannot release hold');
      return;
    }

    try {
      const url = `${API_BASE}/holds/${holdId}`;

      // dùng keepalive để đảm bảo request vẫn được gửi khi đóng tab
      fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        keepalive: true
      }).catch(err => {
        console.warn('Failed to release hold:', err);
      });

      console.log('Hold release requested (EXIT):', holdId);
    } catch (error) {
      console.error('Error releasing hold (EXIT):', error);
    }
  }

  async function releaseHoldOnExpire() {
    if (!holdId || holdReleased) return;

    holdReleased = true;
    const token = getAuthToken();

    if (!token) {
      console.warn('No auth token found, cannot release hold on expire');
      return;
    }

    try {
      const url = `${API_BASE}/holds/${holdId}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[hold] Released on EXPIRE:', holdId, 'status:', res.status);
    } catch (error) {
      console.error('[hold] Error releasing on EXPIRE:', error);
    }
  }

  // Release hold khi người dùng thoát khỏi trang
  // Sử dụng pagehide vì nó đáng tin cậy hơn beforeunload trong một số trường hợp
  window.addEventListener('pagehide', () => {
    releaseHoldOnExit();
  });

  // Fallback với beforeunload (có thể không hoạt động trong một số trình duyệt)
  window.addEventListener('beforeunload', () => {
    releaseHoldOnExit();
  });

  // ====== Checkout & Payment Flow ======
  let isProcessing = false;
  let currentOrderId = null;

  // Hàm kiểm tra order pending từ sessionStorage
  async function getExistingPendingOrder(token) {
    if (!showId) return null;

    try {
      // Kiểm tra orderId trong sessionStorage (từ lần checkout trước)
      const orderDataStr = sessionStorage.getItem(`pendingOrder_${showId}`);
      if (orderDataStr) {
        try {
          const orderData = JSON.parse(orderDataStr);
          const orderId = orderData.orderId;

          // Kiểm tra order có tồn tại và còn pending không
          const orderResponse = await fetch(`${API_BASE}/orders/${orderId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (orderResponse.ok) {
            const order = await orderResponse.json();
            // Nếu order vẫn pending và cùng showId, dùng lại
            if (order.status === 'pending' && order.showId === showId) {
              return orderId;
            } else {
              // Order đã không còn pending hoặc không cùng show, xóa khỏi sessionStorage
              sessionStorage.removeItem(`pendingOrder_${showId}`);
            }
          }
        } catch (e) {
          console.warn('Error checking existing order:', e);
          sessionStorage.removeItem(`pendingOrder_${showId}`);
        }
      }
    } catch (e) {
      console.warn('Error getting existing order:', e);
    }

    return null;
  }

  continueBtn?.addEventListener("click", async () => {
    if (!validateForm() || isProcessing) return;

    const token = getAuthToken();
    if (!token) {
      alert('Vui lòng đăng nhập để tiếp tục.');
      window.location.href = '../LoginUI/LogRegUI.html?tab=login';
      return;
    }

    isProcessing = true;
    continueBtn.disabled = true;
    continueBtn.textContent = 'Đang xử lý...';

    try {
      // Kiểm tra xem có order pending từ lần checkout trước không
      let existingOrderId = await getExistingPendingOrder(token);

      if (!existingOrderId) {
        // Không có order pending, cần checkout mới
        if (!holdId) {
          throw new Error('Không tìm thấy thông tin giữ chỗ. Vui lòng quay lại chọn ghế.');
        }

        // Step 1: Checkout (tạo order với status pending)
        const checkoutBody = { holdId };

        // Thêm couponId nếu có áp dụng mã giảm giá
        if (appliedCoupon?.id) {
          checkoutBody.couponId = appliedCoupon.id;
        }

        const checkoutResponse = await fetch(`${API_BASE}/orders/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(checkoutBody)
        });

        if (!checkoutResponse.ok) {
          const errorData = await checkoutResponse.json().catch(() => ({}));
          const errorMessage = errorData.error?.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.';

          // Nếu lỗi là "Hold is not found" (410), thử tìm order pending theo showId
          if (checkoutResponse.status === 410 && errorMessage.includes('Hold is not found')) {
            // Thử tìm order pending theo showId và userId
            console.log('[Checkout] Hold not found, trying to find existing pending order...');

            // Kiểm tra lại order pending (có thể đã có nhưng chưa lưu trong sessionStorage)
            existingOrderId = await getExistingPendingOrder(token);

            if (!existingOrderId) {
              throw new Error('Thời gian giữ chỗ đã hết hạn. Vui lòng quay lại chọn ghế mới.');
            }
          } else {
            throw new Error(errorMessage);
          }
        } else {
          // Checkout thành công, lưu orderId vào sessionStorage
          const checkoutData = await checkoutResponse.json();
          existingOrderId = checkoutData.order?.id;

          if (!existingOrderId) {
            throw new Error('Không nhận được thông tin đơn hàng.');
          }

          // Lưu orderId vào sessionStorage để dùng lại khi quay lại từ payment gateway
          if (showId) {
            sessionStorage.setItem(`pendingOrder_${showId}`, JSON.stringify({
              orderId: existingOrderId,
              showId: showId,
              createdAt: new Date().toISOString()
            }));
          }
        }
      }

      currentOrderId = existingOrderId;

      // Step 2: Tạo payment với orderId (có thể là order mới hoặc order cũ)
      const returnUrl = `${window.location.origin}/frontend/PurchaseUI/payment-return.html?orderId=${currentOrderId}`;
      const cancelUrl = `${window.location.origin}/frontend/PurchaseUI/thanhToan.html?showId=${showId}&holdId=${holdId || ''}&eventId=${eventId}`;

      // Lấy payment provider từ radio button đã chọn
      const paymentProvider = paymentMomo?.checked ? 'momo' : (paymentVnpay?.checked ? 'vnpay' : null);

      if (!paymentProvider) {
        throw new Error('Vui lòng chọn phương thức thanh toán');
      }

      const paymentResponse = await fetch(`${API_BASE}/payments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId: currentOrderId,
          provider: paymentProvider,
          returnUrl,
          cancelUrl
        })
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Không thể tạo thanh toán. Vui lòng thử lại.');
      }

      const paymentData = await paymentResponse.json();

      if (paymentData.paymentUrl) {
        // Redirect đến payment gateway
        window.location.href = paymentData.paymentUrl;
      } else {
        throw new Error('Không nhận được URL thanh toán.');
      }

    } catch (error) {
      console.error('Checkout error:', error);
      alert(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
      isProcessing = false;
      continueBtn.disabled = false;
      continueBtn.textContent = 'Next →';
    }
  });

  // Initialize
  updateEverything();
})();
