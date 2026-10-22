/* Вход, регистрация и выход. */
import { A, S } from '../core/index.js';
const { $, esc } = A;
/* ------------------------- вход / регистрация ------------------------- */
export function showFormError(msg) {
  const el = $('#formError');
  if (el) {
    el.textContent = msg;
    el.classList.add('show');
  } else A.toast(msg);
}

export function buildingOptions(selected) {
  const groups = {};
  S.chats.forEach((c) => {
    const key = c.district || 'Севастополь';
    (groups[key] = groups[key] || []).push(c);
  });
  return Object.keys(groups)
    .map(
      (d) => `
    <optgroup label="${esc(d)} район">
      ${groups[d].map((c) => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${esc(c.title)}${c.type === 'snt' ? ' (СНТ)' : ''}</option>`).join('')}
    </optgroup>`
    )
    .join('');
}

A.openAuth = function (mode, pending) {
  mode = mode || 'login';
  if (pending) S.pendingAuth = pending;
  const body = `
    <div class="auth-tabs">
      <button type="button" data-auth-tab="login" class="${mode === 'login' ? 'active' : ''}">Вход</button>
      <button type="button" data-auth-tab="register" class="${mode === 'register' ? 'active' : ''}">Регистрация</button>
    </div>
    <form id="authForm" novalidate>
      <div id="regFields" class="${mode === 'register' ? '' : 'hidden'}">
        <div class="field"><label for="afName">Как вас зовут</label><input id="afName" class="input" autocomplete="name" placeholder="Иван Петров" /></div>
      </div>
      <div class="field"><label for="afLogin">E-mail или телефон</label><input id="afLogin" class="input" autocomplete="username" inputmode="email" placeholder="ivan@example.ru" /></div>
      <div class="field"><label for="afPass">Пароль</label><input id="afPass" class="input" type="password" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}" placeholder="Минимум 6 символов" /></div>
      <div id="regFields2" class="${mode === 'register' ? '' : 'hidden'}">
        <div class="field"><label for="afHome">Мой дом или СНТ</label><select id="afHome" class="input">${buildingOptions(S.me ? S.me.buildingId : '')}</select></div>
      </div>
      <div class="form-error" id="formError"></div>
      <button class="btn" type="submit" id="afSubmit" style="margin-top:16px">${mode === 'register' ? 'Создать аккаунт' : 'Войти'}</button>
    </form>
    <div class="form-note">
      Регистрация в приложении работает без Госуслуг. Привязка к Госуслугам появится позже и будет нужна только для официальных обращений в ведомства.<br><br>
      Пароль хранится в виде хеша. В локальном режиме аккаунт действует на этом устройстве.
    </div>`;

  A.openSheet({
    title: mode === 'register' ? 'Создать аккаунт' : 'Вход в Рядом',
    body,
    mount(root) {
      let current = mode;
      const tabButtons = root.querySelectorAll('[data-auth-tab]');
      tabButtons.forEach((b) =>
        b.addEventListener('click', () => {
          current = b.dataset.authTab;
          tabButtons.forEach((x) => x.classList.toggle('active', x === b));
          $('#regFields').classList.toggle('hidden', current !== 'register');
          $('#regFields2').classList.toggle('hidden', current !== 'register');
          $('#afSubmit').textContent = current === 'register' ? 'Создать аккаунт' : 'Войти';
          $('#formError').classList.remove('show');
        })
      );

      $('#authForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = $('#formError');
        err.classList.remove('show');
        const btn = $('#afSubmit');
        const name = ($('#afName') ? $('#afName').value : '').trim();
        const login = $('#afLogin').value.trim();
        const password = $('#afPass').value;
        const buildingId = $('#afHome') ? $('#afHome').value : '';

        if (current === 'register' && name.length < 2) return showFormError('Укажите имя');
        if (!login) return showFormError('Укажите e-mail или телефон');
        if (password.length < 6) return showFormError('Пароль — минимум 6 символов');

        btn.disabled = true;
        const oldText = btn.textContent;
        btn.textContent = 'Подождите…';
        try {
          const res = await A.api(
            'POST',
            current === 'register' ? '/auth/register' : '/auth/login',
            current === 'register' ? { name, login, password, buildingId } : { login, password }
          );
          A.Store.setToken(res.token);
          A.Local.token = res.token;
          await A.refreshMe();
          await A.loadData();
          A.closeSheet();
          A.toast(current === 'register' ? 'Аккаунт создан. Добро пожаловать!' : 'С возвращением!');
          A.renderNav();
          A.setGreeting();
          A.renderAll();
          const pending = S.pendingAuth;
          S.pendingAuth = null;
          if (typeof pending === 'function') setTimeout(pending, 120);
        } catch (ex) {
          showFormError(ex.message || 'Не получилось. Попробуйте ещё раз');
          btn.disabled = false;
          btn.textContent = oldText;
        }
      });
    }
  });
};

A.requireAuth = function (cb) {
  if (S.me) return cb();
  A.openAuth('login', cb);
};

A.logout = async function () {
  try {
    await A.api('POST', '/auth/logout');
  } catch {}
  A.Store.setToken('');
  A.Local.token = '';
  S.me = null;
  S.stats = null;
  S.myBuilding = null;
  await A.loadData();
  A.renderNav();
  A.setGreeting();
  A.renderAll();
  A.toast('Вы вышли из аккаунта');
};
