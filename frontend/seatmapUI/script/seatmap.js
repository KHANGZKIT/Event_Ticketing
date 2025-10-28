document.addEventListener("DOMContentLoaded", () => {
  const seatMap = document.getElementById("seatMap");
  const TOTAL = 140;
  const PER_ROW = 14;
  const VIP_COUNT = 70;
  const billPanel = document.getElementById("billPanel");
  const billTotalEl = document.getElementById("billTotal");
  const billSeatsEl = document.getElementById("billSeats");
  const billEventEl = document.getElementById("billEvent");
  const billDateEl = document.getElementById("billDate");
  const billPlaceEl = document.getElementById("billPlace");
  const billConfirm = document.getElementById("billConfirm");
  const billCancel = document.getElementById("billCancel");

  billEventEl.textContent = document.getElementById("eventTitle").textContent;
  billDateEl.textContent = document.getElementById("eventDate").textContent;
  billPlaceEl.textContent = document.getElementById("eventPlace").textContent;

  // Giá vé
  const PRICE = {
    vip: 150000,
    normal: 100000,
  };

  // DOM giỏ
  const cartTableBody = document.querySelector("#cartTable tbody");
  const cartTotalEl = document.getElementById("cartTotal");
  const checkoutBtn = document.getElementById("checkoutBtn");

  const selectedSeats = new Map(); // key: "A1", value: { type: 'vip'|'normal', price: number }
  const purchasingSeats = new Map(); // ghế đang chờ thanh toán
  let purchaseTimer = null; // timer 10 phút

  // Hàm load JSON (danh sách ghế đã đặt)
  async function loadBookedSeats() {
    try {
      const response = await fetch("/data/fakedata.json");
      const data = await response.json();
      return new Set(data.bookedSeats);
    } catch (err) {
      console.error("Không thể load JSON:", err);
      return new Set();
    }
  }

  // Định dạng tiền VND
  function vnd(n) {
    return n.toLocaleString("vi-VN") + "đ";
  }

  // Render giỏ
  function renderCart() {
    cartTableBody.innerHTML = "";

    let total = 0;
    for (const [label, info] of selectedSeats.entries()) {
      total += info.price;

      const tr = document.createElement("tr");
      tr.innerHTML = `
      <td>${label}</td>
      <td>${info.type === "vip" ? "VIP" : "Thường"}</td>
      <td>${vnd(info.price)}</td>
      <td class="remove">
        <button class="btn-remove" aria-label="Bỏ ghế" data-seat="${label}">×</button>
      </td>
    `;
      cartTableBody.appendChild(tr);
    }

    cartTotalEl.textContent = vnd(total);

    // Gỡ ghế bằng dấu ×
    cartTableBody.querySelectorAll(".btn-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const label = btn.dataset.seat;
        const domSeat = document.querySelector(`.seat[data-label="${label}"]`);
        if (domSeat) domSeat.classList.remove("selected");
        selectedSeats.delete(label);
        renderCart();
      });
    });
  }

  // Hủy ghế đang chờ thanh toán
  function cancelPurchasingSeats() {
    for (const [label, info] of purchasingSeats.entries()) {
      const domSeat = document.querySelector(`.seat[data-label="${label}"]`);
      if (domSeat) {
        domSeat.classList.remove("purchasing");
        // Khôi phục lại màu ban đầu
        domSeat.classList.add(info.type);
      }
    }
    purchasingSeats.clear();
  }

  // Tạo ghế
  async function generateSeats() {
    const bookedSeats = await loadBookedSeats();
    let currentRow = 0;

    for (let i = 1; i <= TOTAL; i++) {
      const rowLetter = String.fromCharCode(65 + currentRow);
      const numberInRow = ((i - 1) % PER_ROW) + 1;
      const seatLabel = `${rowLetter}${numberInRow}`;

      if (numberInRow === 8) {
        const aisle = document.createElement("div");
        aisle.className = "aisle";
        seatMap.appendChild(aisle);
      }

      const seat = document.createElement("div");
      seat.classList.add("seat");
      seat.dataset.label = seatLabel;

      // Loại ghế (VIP / Thường)
      const type = i <= VIP_COUNT ? "vip" : "normal";
      seat.classList.add(type);

      // Booked từ JSON?
      if (bookedSeats.has(seatLabel)) {
        seat.classList.add("booked");
      }

      seat.textContent = seatLabel;

      // Sự kiện chọn ghế
      seat.addEventListener("click", () => {
        if (seat.classList.contains("booked") || seat.classList.contains("purchasing")) return;

        seat.classList.toggle("selected");
        const isSelectedNow = seat.classList.contains("selected");

        if (isSelectedNow) {
          selectedSeats.set(seatLabel, { type, price: PRICE[type] });
        } else {
          selectedSeats.delete(seatLabel);
        }
        renderCart();
      });

      seatMap.appendChild(seat);

      if (i % PER_ROW === 0) currentRow++;
    }
  }

  generateSeats();

  // Đặt vé
  checkoutBtn.addEventListener("click", () => {
    if (selectedSeats.size === 0) {
      alert("Bạn chưa chọn ghế nào.");
      return;
    }

    // Tính tổng & render danh sách ghế
    let total = 0;
    const labels = [];
    for (const [label, info] of selectedSeats.entries()) {
      total += info.price;
      labels.push(label);
    }
    billTotalEl.textContent = total.toLocaleString("vi-VN") + "đ";
    billSeatsEl.textContent = "Ghế: " + labels.join(", ");

    // Chuyển ghế sang trạng thái "đang chờ thanh toán"
    for (const [label, info] of selectedSeats.entries()) {
      const domSeat = document.querySelector(`.seat[data-label="${label}"]`);
      if (domSeat) {
        domSeat.classList.remove("selected", info.type);
        domSeat.classList.add("purchasing");
        purchasingSeats.set(label, info);
      }
    }

    // Xóa khỏi giỏ hàng
    selectedSeats.clear();
    renderCart();

    // Mở BILL PANEL
    billPanel.classList.remove("hidden");

    // Đặt timer 10 phút (600000ms)
    if (purchaseTimer) clearTimeout(purchaseTimer);
    purchaseTimer = setTimeout(() => {
      // Sau 10 phút: đóng panel và hủy ghế đang chờ
      billPanel.classList.add("hidden");
      cancelPurchasingSeats();
      alert("Hết thời gian thanh toán. Ghế đã được trả lại.");
    }, 600000); // 10 phút = 600000ms
  });

  // === ĐÓNG PANEL (HỦY)
  billCancel.addEventListener("click", () => {
    billPanel.classList.add("hidden");
    
    // Hủy timer
    if (purchaseTimer) clearTimeout(purchaseTimer);
    
    // Hủy ghế đang chờ thanh toán
    cancelPurchasingSeats();
  });

  // === XÁC NHẬN (demo): đóng panel, ghế chuyển sang "booked"
  billConfirm.addEventListener("click", () => {
    // Hủy timer
    if (purchaseTimer) clearTimeout(purchaseTimer);
    
    // Chuyển ghế sang trạng thái "đã đặt"
    for (const [label] of purchasingSeats.entries()) {
      const domSeat = document.querySelector(`.seat[data-label="${label}"]`);
      if (domSeat) {
        domSeat.classList.remove("purchasing");
        domSeat.classList.add("booked");
      }
    }
    purchasingSeats.clear();
    
    billPanel.classList.add("hidden");
    alert("Thanh toán thành công!");
    // TODO: gọi API thanh toán / chuyển trang
  });
});