// ========================
// CẤU HÌNH API (Gateway) - Auto-detect production/local
// ========================
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? "http://localhost:4000/api"
  : "https://gateway-production-6a61.up.railway.app/api";
const AUTH_BASE = `${API_BASE}/auth`;

// ========================
// TIỆN ÍCH CHUNG
// ========================
const $ = (s) => document.querySelector(s);
function toURL(rel) { return new URL(rel, window.location.href).toString(); }

function storage(remember) { return remember ? localStorage : sessionStorage; }
// logreg.js — patch trong saveAuth(...)
function saveAuth(token, me, remember) {
  // SỬA LỖI: Luôn dùng localStorage để đảm bảo token
  // tồn tại sau khi quay về từ cổng thanh toán.
  const st = localStorage;

  // Phần còn lại của hàm giữ nguyên
  const display =
    me.fullName || me.displayName || me.name || me.username || me.email || "User";

  st.setItem('accessToken', token);
  st.setItem('currentUser', JSON.stringify(me || {}));

  // ... (tất cả các lệnh st.setItem khác của bạn) ...

  st.setItem('user', JSON.stringify({
    id: me.id,
    fullName: me.fullName || null,
    name: display,
    email: me.email || null,
    avatar: me.avatar || me.avatarUrl || me.photoURL || null,
    roles: me.roles || me.user?.roles || []
  }));

  st.setItem('profile', JSON.stringify(me || {}));

  st.setItem('auth', JSON.stringify({
    token,
    user: {
      id: me.id,
      fullName: me.fullName || null,
      name: display,
      email: me.email || null,
      avatar: me.avatar || me.avatarUrl || me.photoURL || null,
      roles: me.roles || me.user?.roles || []
    }
  }));
}

function clearAuthAll() {
  const keys = ['auth', 'accessToken', 'token', 'user', 'profile', 'currentUser'];
  keys.forEach(k => {
    try { localStorage.removeItem(k); } catch { }
    try { sessionStorage.removeItem(k); } catch { }
  });
}

async function fetchJSON(url, opts = {}) {
  const r = await fetch(url, opts);
  let data = {};
  try { data = await r.json(); } catch (_) { }
  if (!r.ok) {
    const msg = data?.message || `HTTP ${r.status} ${url}`;
    throw new Error(msg);
  }
  return data;
}

async function getMe(token) {
  return fetchJSON(`${AUTH_BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

function isAdminFrom(me) {
  const roles = Array.isArray(me?.roles) ? me.roles
    : (Array.isArray(me?.user?.roles) ? me.user.roles : []);
  return (roles || []).map(r => String(r).toLowerCase()).includes("admin") || me?.isAdmin === true;
}

// ========================
// HIỂN THỊ LOGIN / REGISTER
// ========================
function showLogin() {
  $(".form-container")?.classList.remove("hidden");
  $(".regisContainer")?.classList.add("hidden");
}
function showRegister() {
  $(".form-container")?.classList.add("hidden");
  $(".regisContainer")?.classList.remove("hidden");
}

// ========================
// EYE TOGGLE (show/hide password) – dùng chung
// ========================
function setupEyeToggle(inputId, wrapperSel) {
  const input = document.getElementById(inputId);
  const wrap = document.querySelector(wrapperSel);
  if (!input || !wrap) return;

  const eyeSVG = {
    show: `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
     stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"/>
  <circle cx="12" cy="12" r="3"/>
</svg>`,
    hide: `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
     stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.17-6.87"/>
  <path d="M1 1l22 22"/>
  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
</svg>`
  };

  const toggle = () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    wrap.innerHTML = show ? eyeSVG.hide : eyeSVG.show;
  };

  wrap.addEventListener("click", toggle);
  wrap.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
  });
}

// ========================
// REGISTER: validate mật khẩu trùng khớp
// ========================
function setupRegisterValidation() {
  const pass = document.getElementById("register-password");
  const rep = document.getElementById("register-repassword");
  const err = document.getElementById("password-error");
  if (!pass || !rep) return;

  const validate = () => {
    const ok = (pass.value || "") === (rep.value || "");
    if (err) err.textContent = ok ? "" : "Mật khẩu không trùng khớp";
    rep.classList.toggle("input-error", !ok);
    return ok;
  };

  ["input", "blur"].forEach(ev => { pass.addEventListener(ev, validate); rep.addEventListener(ev, validate); });
  return validate;
}

// ========================
/* INIT */
// ========================
document.addEventListener("DOMContentLoaded", () => {
  // Chuyển tab login/register
  $("#goregister")?.addEventListener("click", (e) => { e.preventDefault(); showRegister(); });
  $("#goLogin")?.addEventListener("click", (e) => { e.preventDefault(); showLogin(); });

  // Mở theo query ?tab=
  const tab = (new URLSearchParams(location.search).get("tab") || "").toLowerCase();
  tab === "register" ? showRegister() : showLogin();

  // Eye toggles
  setupEyeToggle("login-password", "#togglePassLogin");
  setupEyeToggle("register-password", "#togglePassregister");
  setupEyeToggle("register-repassword", "#toggleRepassregister");

  // ----- LOGIN SUBMIT (DUY NHẤT) -----
  const loginForm = document.getElementById("loginForm") || $(".form-container form.form-box");
  const rememberCbx = document.getElementById("remember-me-checkbox");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = (document.getElementById("login-email")?.value || "").trim();
      const password = (document.getElementById("login-password")?.value || "").trim();
      if (!email || !password) return alert("Vui lòng nhập email và mật khẩu.");

      try {
        // 1) Đăng nhập
        const loginData = await fetchJSON(`${AUTH_BASE}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const token = loginData?.accessToken || loginData?.token;
        if (!token) throw new Error("Thiếu accessToken");

        // 2) Lấy thông tin me để biết roles
        const me = await getMe(token);
        clearAuthAll();
        saveAuth(token, me, !!(rememberCbx && rememberCbx.checked));
        const params = new URLSearchParams(location.search);
        const redirect = params.get('redirect');

        if (redirect) {
          window.location.href = redirect;
          return;
        }
        // 3) Redirect theo quyền
        if (isAdminFrom(me)) {
          // admin → Dashboard
          window.location.href = toURL("../DashboardUI/Dashboard.html");
        } else {
          // user thường → Home (đổi path nếu bạn muốn)
          window.location.href = "/frontend/HomePage/source/TrangChu.html";
        }
      } catch (err) {
        console.error("[login] error:", err);
        alert(err.message || "Đăng nhập thất bại.");
      }
    });
  }

  // ----- REGISTER SUBMIT -----
  const registerForm = $(".regisContainer .form-box");
  const validateMatch = setupRegisterValidation();

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      if (validateMatch && !validateMatch()) { e.preventDefault(); return; }
      e.preventDefault();

      const email = (document.getElementById("register-email")?.value || "").trim();
      const fullName = (document.getElementById("register-fullname")?.value || "").trim();
      const password = (document.getElementById("register-password")?.value || "").trim();
      if (!email || !fullName || !password) return alert("Điền đủ Email / Họ tên / Mật khẩu");

      try {
        const data = await fetchJSON(`${AUTH_BASE}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, fullName, password })
        });

        // Đăng ký xong → quay về trang đăng nhập
        alert("Đăng ký thành công. Vui lòng đăng nhập.");
        showLogin(); // Chuyển tab luôn thay vì reload trang
      } catch (err) {
        console.error("[register] error:", err);
        let msg = err.message || "Đăng ký thất bại.";
        // Xử lý message lỗi phổ biến
        if (msg.includes("409") || msg.includes("Conflict")) {
          msg = "Email này đã được sử dụng. Vui lòng dùng email khác hoặc đăng nhập.";
        }
        alert(msg);
      }
    });
  }
});
