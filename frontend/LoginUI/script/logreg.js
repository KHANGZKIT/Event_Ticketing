// ========================
// CẤU HÌNH API (Gateway)
// ========================
const API_BASE = 'http://localhost:4000/api';
const AUTH_BASE = `${API_BASE}/auth`;

/* --------------------------------------------------
 *  SVG MẮT (chuẩn, không có "...")
 * -------------------------------------------------- */
const eyeSVG = {
  show: `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
     stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
     class="lucide lucide-eye">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"/>
  <circle cx="12" cy="12" r="3"/>
</svg>`,
  hide: `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
     stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
     class="lucide lucide-eye-off">
  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.17-6.87"/>
  <path d="M1 1l22 22"/>
  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
</svg>`
};

/* --------------------------------------------------
 *  MẮT: LOGIN
 * -------------------------------------------------- */
(function () {
  const passInput = document.getElementById('login-password');
  const eyeWrap = document.querySelector('#togglePassLogin');
  if (!passInput || !eyeWrap) return;

  function togglePassword() {
    const isHidden = passInput.type === 'password';
    passInput.type = isHidden ? 'text' : 'password';
    eyeWrap.innerHTML = isHidden ? eyeSVG.hide : eyeSVG.show;
  }
  eyeWrap.addEventListener('click', togglePassword);
  eyeWrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePassword(); }
  });
})();

/* --------------------------------------------------
 *  MẮT: REGISTER (password)
 * -------------------------------------------------- */
(function () {
  const passInput = document.getElementById('register-password');
  const eyeWrap = document.querySelector('#togglePassregister');
  if (!passInput || !eyeWrap) return;

  function togglePasswordRegister() {
    const isHidden = passInput.type === 'password';
    passInput.type = isHidden ? 'text' : 'password';
    eyeWrap.innerHTML = isHidden ? eyeSVG.hide : eyeSVG.show;
  }
  eyeWrap.addEventListener('click', togglePasswordRegister);
  eyeWrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePasswordRegister(); }
  });
})();

/* --------------------------------------------------
 *  MẮT: REGISTER (repassword)
 * -------------------------------------------------- */
(function () {
  const passInput = document.getElementById('register-repassword');
  const eyeWrap = document.querySelector('#toggleRepassregister');
  if (!passInput || !eyeWrap) return;

  function toggleRepasswordRegister() {
    const isHidden = passInput.type === 'password';
    passInput.type = isHidden ? 'text' : 'password';
    eyeWrap.innerHTML = isHidden ? eyeSVG.hide : eyeSVG.show;
  }
  eyeWrap.addEventListener('click', toggleRepasswordRegister);
  eyeWrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRepasswordRegister(); }
  });
})();

/* --------------------------------------------------
 *  CHUYỂN LOGIN <-> REGISTER
 * -------------------------------------------------- */
const loginContainer = document.querySelector('.form-container');
const registerContainer = document.querySelector('.regisContainer');
const goregister = document.getElementById('goregister');
const goLogin = document.getElementById('goLogin');

if (goregister) {
  goregister.addEventListener('click', (e) => {
    e.preventDefault();
    loginContainer.classList.add('hidden');
    registerContainer.classList.remove('hidden');
  });
}
if (goLogin) {
  goLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerContainer.classList.add('hidden');
    loginContainer.classList.remove('hidden');
  });
}

/* --------------------------------------------------
 *  VALIDATE MẬT KHẨU TRÙNG KHỚP (REGISTER)
 * -------------------------------------------------- */
const registerForm = document.querySelector('.regisContainer .form-box');
const registerPass = document.getElementById('register-password');
const registerRepass = document.getElementById('register-repassword');
const passwordErrorEl = document.getElementById('password-error');

function validateMatch() {
  const ok = (registerPass?.value || '') === (registerRepass?.value || '');
  if (passwordErrorEl) passwordErrorEl.textContent = ok ? '' : 'Mật khẩu không trùng khớp';
  if (registerRepass) registerRepass.classList.toggle('input-error', !ok);
  return ok;
}
if (registerPass && registerRepass) {
  ['input', 'blur'].forEach(ev => {
    registerPass.addEventListener(ev, validateMatch);
    registerRepass.addEventListener(ev, validateMatch);
  });
}
if (registerForm) {
  registerForm.addEventListener('submit', (e) => {
    if (!validateMatch()) e.preventDefault();
  });
}

/* --------------------------------------------------
 *  SUBMIT LOGIN  (email + password, Remember me)
 * -------------------------------------------------- */
const loginForm = document.querySelector('.form-container .form-box');
const rememberCbx = document.getElementById('remember-me-checkbox');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = (document.getElementById('login-email')?.value || '').trim();
    const password = (document.getElementById('login-password')?.value || '').trim();
    if (!email || !password) {
      alert('Vui lòng nhập đầy đủ Email và Mật khẩu');
      return;
    }

    try {
      console.log('[login] POST ->', `${AUTH_BASE}/login`);
      const res = await fetch(`${AUTH_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }) // hoặc {identifier, password}
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.message || `Đăng nhập thất bại (HTTP ${res.status}).`);
        return;
      }

      const token = data?.token || data?.accessToken;
      const user = data?.user ?? null;
      const storage = rememberCbx?.checked ? localStorage : sessionStorage;
      if (token) storage.setItem('token', token);
      storage.setItem('user', JSON.stringify(user));

      window.location.href = '/';
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối máy chủ. Kiểm tra Gateway (http://localhost:4000).');
    }
  });
}

/* --------------------------------------------------
 *  SUBMIT REGISTER  (email + fullName + password)
 *  - Thử /register, nếu 404/405 thì fallback sang /signup
 * -------------------------------------------------- */
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    if (!validateMatch()) return;
    e.preventDefault();

    const email = (document.getElementById('register-email')?.value || '').trim();
    const fullName = (document.getElementById('register-fullname')?.value || '').trim();
    const password = (document.getElementById('register-password')?.value || '').trim();

    if (!email || !fullName || !password) {
      alert('Vui lòng điền đầy đủ Email / Tên đầy đủ / Mật khẩu');
      return;
    }

    const postJSON = async (url, payload) => {
      console.log('[register] POST ->', url);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let data = {};
      try { data = await res.json(); } catch (_) { }
      return { res, data };
    };

    try {
      // 1) Thử /register
      let { res, data } = await postJSON(`${AUTH_BASE}/register`, { email, fullName, password });

      // 2) Nếu /register không tồn tại → thử /signup
      if (res.status === 404 || res.status === 405) {
        console.warn('[register] /register 404/405 → fallback /signup');
        ({ res, data } = await postJSON(`${AUTH_BASE}/signup`, { email, fullName, password }));
      }

      if (!res.ok) {
        alert(data?.message || `Đăng ký thất bại (HTTP ${res.status}).`);
        return;
      }

      const token = data?.token || data?.accessToken;
      const user = data?.user ?? null;
      if (token) localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      window.location.href = '/';
    } catch (err) {
      console.error('[register] error:', err);
      alert('Không thể kết nối máy chủ. Kiểm tra Gateway (http://localhost:4000) & Auth service.');
    }
  });
}

/* --------------------------------------------------
 *  KHÔNG DÙNG TOP-LEVEL await
 * -------------------------------------------------- */
