// ========================
// CẤU HÌNH API (Gateway)
// ========================
const API_BASE = 'http://localhost:4000/api';
const EVENTS_BASE = `${API_BASE}/events`;

// ========================
// DANH SÁCH FALLBACK IMAGES (URL từ các website - Unsplash & Pexels)
// ========================
const FALLBACK_IMAGES = [
    // Unsplash - Concert & Music Events
    "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1600",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600",
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1600",
    "https://images.unsplash.com/photo-1515165562835-c3b8c2e5d43d?w=1600",
    "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=1600",
    "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1600",
    "https://images.unsplash.com/photo-1558980664-10ea8d6c1040?w=1600",
    "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1600",
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600",
    "https://images.unsplash.com/photo-1464362350603-30e6de19a68e?w=1600",
    "https://images.unsplash.com/photo-1501281668745-f7f57925c5b4?w=1600",
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600",
    "https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?w=1600",
    "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=1600",
    "https://images.unsplash.com/photo-1478147427282-58a87a120781?w=1600",
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1600",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600",
    "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=1600",
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1600",
    "https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=1600",
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1600",
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600",
    
    // Pexels - Concert & Events
    "https://images.pexels.com/photos/167491/pexels-photo-167491.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1763076/pexels-photo-1763076.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/154147/pexels-photo-154147.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/270366/pexels-photo-270366.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/167446/pexels-photo-167446.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1591373/pexels-photo-1591373.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1763077/pexels-photo-1763077.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1763078/pexels-photo-1763078.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    // Pexels - Stage & Theater
    "https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/2747450/pexels-photo-2747450.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/2747451/pexels-photo-2747451.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    // Pexels - Festival Events
    "https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    // Pexels - Jazz & Music
    "https://images.pexels.com/photos/1763079/pexels-photo-1763079.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1763080/pexels-photo-1763080.jpeg?auto=compress&cs=tinysrgb&w=1600",
];

/* --------------------------------------------------
 *  LOAD & DISPLAY EVENTS
 * -------------------------------------------------- */
async function loadEvents() {
  try {
    // Fetch events từ API với pageSize lớn để lấy nhiều events
    const res = await fetch(`${EVENTS_BASE}?pageSize=50`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    const events = data?.items || [];
    
    if (events.length === 0) {
      console.warn('[events] Không có sự kiện nào');
      return;
    }

    // Lọc bỏ events không có cover hoặc cover rỗng (tùy chọn - comment nếu muốn hiển thị tất cả)
    // const eventsWithCover = events.filter(e => e.cover && e.cover.trim() !== '');
    // const eventsToProcess = eventsWithCover.length > 0 ? eventsWithCover : events; // Fallback nếu tất cả đều không có cover
    
    // Load giá cho từng event (song song để tối ưu)
    const eventsWithPrice = await Promise.all(
      events.map(async (event) => {
        const price = await loadEventPrice(event.id);
        return { ...event, price };
      })
    );

    // Lấy tất cả sections
    const sections = document.querySelectorAll('.event-section');
    const sectionCount = sections.length;

    if (sectionCount === 0) return;

    // Phân phối events vào các sections
    // Mỗi section chỉ hiển thị tối đa 5 events
    const MAX_EVENTS_PER_SECTION = 5;

    for (let i = 0; i < sectionCount; i++) {
      const start = i * MAX_EVENTS_PER_SECTION;
      const end = start + MAX_EVENTS_PER_SECTION;
      const sectionEvents = eventsWithPrice.slice(start, end);
      
      if (sectionEvents.length > 0) {
        renderEventsToSection(sectionEvents, i);
      }
    }

    // Cập nhật slider với events từ DB
    updateSliderWithEvents(eventsWithPrice.slice(0, 3)); // Lấy 3 events đầu cho slider

  } catch (err) {
    console.error('[events] error:', err);
  }
}

/* --------------------------------------------------
 *  LOAD PRICE CHO TỪNG EVENT
 * -------------------------------------------------- */
async function loadEventPrice(eventId) {
  try {
    // Lấy shows của event
    const showsRes = await fetch(`${EVENTS_BASE}/${eventId}/shows`);
    if (!showsRes.ok) {
      return null;
    }
    
    const shows = await showsRes.json();
    if (!shows || shows.length === 0) {
      return null;
    }

    // Lấy show đầu tiên và seatmap của nó để lấy giá
    const firstShow = shows[0];
    if (!firstShow.seatMapId) {
      return null;
    }

    // Lấy seatmap để lấy priceTiers
    const seatmapRes = await fetch(`${API_BASE}/shows/${firstShow.id}/seatmap`);
    if (!seatmapRes.ok) {
      return null;
    }
    
    const seatmap = await seatmapRes.json();
    const priceTiers = seatmap?.template?.priceTiers || {};
    
    if (Object.keys(priceTiers).length === 0) {
      return null;
    }

    // Tính giá min và max
    const prices = Object.values(priceTiers).map(p => Number(p)).filter(p => !isNaN(p));
    if (prices.length === 0) {
      return null;
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    return {
      min: minPrice,
      max: maxPrice,
      display: minPrice === maxPrice 
        ? formatPrice(minPrice)
        : `Từ ${formatPrice(minPrice)}`
    };

  } catch (err) {
    console.error(`[events] error loading price for event ${eventId}:`, err);
    return null;
  }
}

/* --------------------------------------------------
 *  FORMAT PRICE VND
 * -------------------------------------------------- */
function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
}

/* --------------------------------------------------
 *  FORMAT DATE
 * -------------------------------------------------- */
function formatDate(dateString) {
  if (!dateString) return 'Chưa có ngày';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Chưa có ngày';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/* --------------------------------------------------
 *  RENDER EVENTS VÀO SECTION
 * -------------------------------------------------- */
function renderEventsToSection(events, sectionIndex = 0) {
  const sections = document.querySelectorAll('.event-section');
  if (!sections || sections.length === 0) return;
  
  const targetSection = sections[sectionIndex];
  if (!targetSection) return;

  const eventGrid = targetSection.querySelector('.event-grid');
  if (!eventGrid) return;

  // Xóa nội dung cũ (giữ lại các event-card tĩnh nếu không có events)
  if (events.length === 0) {
    return; // Giữ lại các event cards tĩnh nếu không có dữ liệu
  }
  
  eventGrid.innerHTML = '';

  // Render events
  events.forEach(event => {
    // Đảm bảo luôn có hình ảnh - ưu tiên cover, nếu không có hoặc rỗng thì dùng URL từ danh sách fallback
    let image = event.cover && event.cover.trim() !== '' 
      ? event.cover 
      : FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
    
    const location = event.city || 'Chưa có địa điểm';
    const price = event.price?.display || 'Liên hệ';
    const date = formatDate(event.startsAt || event.minStartsAt);
    
    const eventCard = document.createElement('a');
    eventCard.href = `#`;
    eventCard.className = 'event-card';
    eventCard.setAttribute('data-event-id', event.id);
    
    // Tạo img element riêng để xử lý error tốt hơn
    const imgElement = document.createElement('img');
    imgElement.src = image;
    imgElement.alt = event.name;
    imgElement.loading = 'lazy'; // Lazy loading để tối ưu
    
    // Track số lần thử fallback (lưu trực tiếp trên element để tránh closure issue)
    imgElement.dataset.fallbackAttempts = '0';
    const maxFallbackAttempts = 3; // Thử tối đa 3 URL khác
    const triedUrls = new Set([image]); // Track các URL đã thử để tránh lặp lại
    
    // Error handling với nhiều fallback URLs
    imgElement.onerror = function() {
      const attempts = parseInt(this.dataset.fallbackAttempts || '0');
      
      // Nếu đã thử hết fallback images, mới dùng placeholder
      if (attempts >= maxFallbackAttempts) {
        // Tạo placeholder với chữ cái đầu
        const placeholder = document.createElement('div');
        placeholder.style.cssText = 'width: 100%; height: 180px; background: linear-gradient(135deg, #2DC275 0%, #1f8a53 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 48px; font-weight: bold;';
        placeholder.textContent = event.name.charAt(0).toUpperCase();
        this.parentNode.replaceChild(placeholder, this);
        return;
      }
      
      // Thử URL khác từ danh sách fallback (tránh trùng lặp)
      let randomFallback;
      let retries = 0;
      do {
        randomFallback = FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
        retries++;
      } while (triedUrls.has(randomFallback) && retries < 10);
      
      triedUrls.add(randomFallback);
      this.src = randomFallback;
      this.dataset.fallbackAttempts = String(attempts + 1);
    };
    
    // Thêm vào card
    eventCard.appendChild(imgElement);
    
    // Tạo event info
    const eventInfo = document.createElement('div');
    eventInfo.className = 'event-info';
    eventInfo.innerHTML = `
      <p class="event-name">${event.name}</p>
      <p class="event-price">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
          <path d="M12 17.5v-11" />
        </svg>
        ${price}
      </p>
      <p class="event-date">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
        </svg>
        ${date}
      </p>
      <p class="event-location" style="margin-top: 4px; font-size: 13px; color: #666;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        ${location}
      </p>
    `;
    
    eventCard.appendChild(eventInfo);
    eventGrid.appendChild(eventCard);
  });
}

/* --------------------------------------------------
 *  UPDATE SLIDER VỚI EVENTS TỪ DB
 * -------------------------------------------------- */
function updateSliderWithEvents(events) {
  if (!events || events.length === 0) return;

  const slider = document.querySelector('.slider');
  const dotsContainer = document.querySelector('.dots');
  if (!slider || !dotsContainer) return;

  // Xóa slides cũ
  slider.innerHTML = '';
  dotsContainer.innerHTML = '';

  // Lấy tối đa 3 events cho slider
  const sliderEvents = events.slice(0, 3);

  // Tạo slides mới từ events
  sliderEvents.forEach((event, index) => {
    let image = event.cover || FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
    const img = document.createElement('img');
    img.src = image;
    img.className = `slide ${index === 0 ? 'active' : ''}`;
    img.alt = event.name;
    img.loading = 'lazy';
    
    // Track fallback attempts cho slider
    let sliderFallbackAttempts = 0;
    const maxSliderFallbacks = 3;
    
    img.onerror = function() {
      if (sliderFallbackAttempts >= maxSliderFallbacks) {
        // Nếu đã thử hết, dùng gradient placeholder
        const placeholder = document.createElement('div');
        placeholder.className = `slide ${index === 0 ? 'active' : ''}`;
        placeholder.style.cssText = 'width: 100%; height: 100%; background: linear-gradient(135deg, #2DC275 0%, #1f8a53 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 72px; font-weight: bold;';
        placeholder.textContent = event.name.charAt(0).toUpperCase();
        this.parentNode.replaceChild(placeholder, this);
        return;
      }
      
      // Thử URL khác
      const randomFallback = FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
      this.src = randomFallback;
      sliderFallbackAttempts++;
    };
    
    slider.appendChild(img);

    // Tạo dots
    const dot = document.createElement('span');
    dot.className = `dot ${index === 0 ? 'active' : ''}`;
    dotsContainer.appendChild(dot);
  });

  // Re-init slider functionality sau khi DOM đã update
  setTimeout(() => {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    let slideIndex = 0;

    function showSlide(index) {
      slides.forEach((s, i) => s.classList.toggle('active', i === index));
      dots.forEach((d, i) => d.classList.toggle('active', i === index));
    }

    // Re-attach event listeners
    const nextBtn = document.querySelector('.next');
    const prevBtn = document.querySelector('.prev');
    
    if (nextBtn) {
      nextBtn.onclick = () => {
        slideIndex = (slideIndex + 1) % slides.length;
        showSlide(slideIndex);
      };
    }
    
    if (prevBtn) {
      prevBtn.onclick = () => {
        slideIndex = (slideIndex - 1 + slides.length) % slides.length;
        showSlide(slideIndex);
      };
    }

    // Dots click handlers
    dots.forEach((dot, i) => {
      dot.onclick = () => {
        slideIndex = i;
        showSlide(slideIndex);
      };
    });

    // Auto-slide mỗi 5 giây
    if (window.sliderInterval) {
      clearInterval(window.sliderInterval);
    }
    window.sliderInterval = setInterval(() => {
      slideIndex = (slideIndex + 1) % slides.length;
      showSlide(slideIndex);
    }, 5000);
  }, 100);
}

// Load events khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
  loadEvents();
});

