import { apiFetch, session } from './api.js';

if (session.token) location.href = '/products.html';

const form = document.getElementById('login-form');
const errorEl = document.querySelector('[data-testid="login-error"]');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorEl.hidden = true;

  const { username, password } = Object.fromEntries(new FormData(form));
  try {
    const { token, user } = await apiFetch('/login', { method: 'POST', body: { username, password } });
    session.save(token, user.username);
    location.href = '/products.html';
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
});
