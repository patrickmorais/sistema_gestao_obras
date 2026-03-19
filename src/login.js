(function () {
  const supa = window.SGO_SUPABASE;

  const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Cdefs%3E%3CradialGradient id='g' cx='30%25' cy='25%25'%3E%3Cstop stop-color='%2360a5fa' offset='0'/%3E%3Cstop stop-color='%235eead4' offset='1'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='96' height='96' rx='48' fill='url(%23g)'/%3E%3Cpath d='M48 52c10.5 0 19-8.5 19-19S58.5 14 48 14 29 22.5 29 33s8.5 19 19 19zm0 8c-17.1 0-31 9.6-31 21.5V86h62v-4.5C79 69.6 65.1 60 48 60z' fill='rgba(7,11,20,.55)'/%3E%3C/svg%3E";

  // ── Elementos ──
  const loginForm    = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  const loginError   = document.getElementById('loginError');
  const loginBtn     = document.getElementById('loginBtn');

  const regError     = document.getElementById('registerError');
  const regSuccess   = document.getElementById('registerSuccess');
  const regBtn       = document.getElementById('registerBtn');

  const showRegisterLink = document.getElementById('showRegister');
  const showLoginLink    = document.getElementById('showLogin');

  if (!loginForm || !registerForm) return;

  // ── Helpers ──
  function showEl(el, msg) { if (!el) return; el.textContent = msg; el.hidden = false; }
  function hideEl(el)      { if (!el) return; el.textContent = ''; el.hidden = true; }

  function setBtn(btn, loading, labelDefault, labelLoading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? labelLoading : labelDefault;
  }

  // ── Validação inline ──
  function clearFieldErrors(form) {
    form.querySelectorAll('.field-error').forEach((el) => el.remove());
    form.querySelectorAll('input.input-error').forEach((el) => el.classList.remove('input-error'));
  }

  function validateRequired(form) {
    clearFieldErrors(form);
    let valid = true;
    form.querySelectorAll('input[required]').forEach((input) => {
      if (!input.value.trim()) {
        valid = false;
        input.classList.add('input-error');
        const msg = document.createElement('span');
        msg.className = 'field-error';
        msg.textContent = 'Campo obrigatório';
        input.parentElement.appendChild(msg);
      }
    });
    return valid;
  }

  // Limpar erro ao digitar
  [loginForm, registerForm].forEach((f) => {
    f.addEventListener('input', (e) => {
      const inp = e.target;
      if (inp.tagName === 'INPUT' && inp.classList.contains('input-error')) {
        inp.classList.remove('input-error');
        const err = inp.parentElement.querySelector('.field-error');
        if (err) err.remove();
      }
    });
  });

  // ── Alternar Login / Cadastro ──
  showRegisterLink?.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.hidden = true;
    registerForm.hidden = false;
    hideEl(loginError);
    hideEl(regError);
    hideEl(regSuccess);
  });

  showLoginLink?.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.hidden = true;
    loginForm.hidden = false;
    hideEl(loginError);
    hideEl(regError);
    hideEl(regSuccess);
  });

  // ── Sessão existente ──
  supa.auth.getSession().then(({ data }) => {
    if (data.session) {
      window.location.href = './app.html#/dashboard';
    }
  });

  // ── LOGIN ──
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideEl(loginError);
    if (!validateRequired(loginForm)) return;
    setBtn(loginBtn, true, 'Entrar', 'Entrando…');

    const fd       = new FormData(loginForm);
    const email    = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '').trim();

    const { data, error } = await supa.auth.signInWithPassword({ email, password });

    if (error) {
      setBtn(loginBtn, false, 'Entrar', 'Entrando…');
      showEl(loginError,
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha inválidos.'
          : error.message);
      return;
    }

    const user = {
      name: data.user.user_metadata?.name || data.user.email.split('@')[0],
      email: data.user.email,
      avatarSvg: data.user.user_metadata?.avatar_url || DEFAULT_AVATAR
    };
    localStorage.setItem('sgo_user', JSON.stringify(user));
    window.location.href = './app.html#/dashboard';
  });

  // ── CADASTRO ──
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideEl(regError);
    hideEl(regSuccess);
    if (!validateRequired(registerForm)) return;

    const fd              = new FormData(registerForm);
    const nome            = String(fd.get('nome') || '').trim();
    const email           = String(fd.get('email') || '').trim();
    const cargo           = String(fd.get('cargo') || '').trim();
    const password        = String(fd.get('password') || '');
    const passwordConfirm = String(fd.get('passwordConfirm') || '');

    if (password !== passwordConfirm) {
      showEl(regError, 'As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      showEl(regError, 'A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setBtn(regBtn, true, 'Criar Conta', 'Criando…');

    const { data, error } = await supa.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: nome,
          cargo: cargo || 'Usuário'
        }
      }
    });

    if (error) {
      setBtn(regBtn, false, 'Criar Conta', 'Criando…');
      showEl(regError,
        error.message === 'User already registered'
          ? 'Usuário já cadastrado.'
          : error.message);
      return;
    }

    setBtn(regBtn, false, 'Criar Conta', 'Criando…');
    registerForm.reset();

    // Se confirmação de e-mail estiver ativa no Supabase
    if (data.user && !data.session) {
      showEl(regSuccess, 'Conta criada! Verifique seu e-mail para confirmar o cadastro.');
      return;
    }

    // Se auto-confirm estiver ativo, loga direto
    if (data.session) {
      const user = {
        name: nome || data.user.email.split('@')[0],
        email: data.user.email,
        avatarSvg: DEFAULT_AVATAR
      };
      localStorage.setItem('sgo_user', JSON.stringify(user));
      window.location.href = './app.html#/dashboard';
      return;
    }

    showEl(regSuccess, 'Conta criada com sucesso! Faça login para continuar.');
  });
})();
