//Chỉnh mắt cho Login
(function () {
  const passInput = document.getElementById('login-password');
  const eyeWrap   = document.querySelector('#togglePassLogin'); // dùng id mới

  if (!passInput || !eyeWrap) return;

  const eyeSVG = {
    show: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-icon lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>',

    hide: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off-icon lucide-eye-off"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>'
  };

  function togglePassword() {
    const isHidden = passInput.type === 'password';
    passInput.type = isHidden ? 'text' : 'password';
    eyeWrap.innerHTML = isHidden ? eyeSVG.hide : eyeSVG.show;
  }

  // Click & keyboard (Enter/Space) để accessibility tốt hơn
  eyeWrap.addEventListener('click', togglePassword);
  eyeWrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      togglePassword();
    }
  });
})();

//Chỉnh mắt cho Sign up
(function () {
  const passInput = document.getElementById('signup-password');
  const eyeWrap   = document.querySelector('#togglePassSignup'); // dùng id mới

  if (!passInput || !eyeWrap) return;

  const eyeSVG = {
    show: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-icon lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>',

    hide: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off-icon lucide-eye-off"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>'
  };

  function togglePasswordSignUp() {
    const isHidden = passInput.type === 'password';
    passInput.type = isHidden ? 'text' : 'password';
    eyeWrap.innerHTML = isHidden ? eyeSVG.hide : eyeSVG.show;
  }

  // Click & keyboard (Enter/Space) để accessibility tốt hơn
  eyeWrap.addEventListener('click', togglePasswordSignUp);
  eyeWrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      togglePasswordSignUp();
    }
  });
})();

//Chỉnh mắt cho repassword signup
(function () {
  const passInput = document.getElementById('signup-repassword');
  const eyeWrap   = document.querySelector('#toggleRepassSignup'); // dùng id mới

  if (!passInput || !eyeWrap) return;

  const eyeSVG = {
    show: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-icon lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>',

    hide: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off-icon lucide-eye-off"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>'
  };

  function toggleRepasswordSignUp() {
    const isHidden = passInput.type === 'password';
    passInput.type = isHidden ? 'text' : 'password';
    eyeWrap.innerHTML = isHidden ? eyeSVG.hide : eyeSVG.show;
  }

  // Click & keyboard (Enter/Space) để accessibility tốt hơn
  eyeWrap.addEventListener('click', toggleRepasswordSignUp);
  eyeWrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleRepasswordSignUp();
    }
  });
})();

//chuyển qua lại 2 UI 
const loginContainer = document.querySelector(".form-container");
const signupContainer = document.querySelector(".regisContainer");
const goSignup = document.getElementById("goSignup");
const goLogin = document.getElementById("goLogin");

// Khi bấm "Sign up" → ẩn form login, hiện form đăng ký
if (goSignup) {
  goSignup.addEventListener("click", (e) => {
    e.preventDefault();
    loginContainer.classList.add("hidden");
    signupContainer.classList.remove("hidden");
  });
}

// Khi bấm "Sign in" → ẩn form đăng ký, hiện form login
if (goLogin) {
  goLogin.addEventListener("click", (e) => {
    e.preventDefault();
    signupContainer.classList.add("hidden");
    loginContainer.classList.remove("hidden");
  });
}

// --- Kiểm tra "Mật khẩu không trùng khớp" cho form Sign up ---
const signupForm      = document.querySelector('.regisContainer .form-box');
const signupPass      = document.getElementById('signup-password');
const signupRepass    = document.getElementById('signup-repassword');
const passwordErrorEl = document.getElementById('password-error');

function validateMatch() {
  const ok = signupPass.value === signupRepass.value;
  // thông báo
  if (passwordErrorEl) passwordErrorEl.textContent = ok ? '' : 'Mật khẩu không trùng khớp';
  // viền đỏ ô nhập lại
  if (signupRepass) signupRepass.classList.toggle('input-error', !ok);
  return ok;
}

// validate theo thời gian thực
if (signupPass && signupRepass) {
  ['input','blur'].forEach(ev => {
    signupPass.addEventListener(ev, validateMatch);
    signupRepass.addEventListener(ev, validateMatch);
  });
}

// chặn submit nếu không khớp (không đụng icon mắt)
if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    if (!validateMatch()) {
      e.preventDefault();
      // focus vào ô nhập lại cho tiện sửa
      signupRepass && signupRepass.focus();
    }
  });
}



