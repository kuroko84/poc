const TOKEN_KEY = 'poc_token';
const USER_KEY = 'poc_user';

export const session = {
  get token() { return localStorage.getItem(TOKEN_KEY); },
  get username() { return localStorage.getItem(USER_KEY); },
  save(token, username) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, username);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export async function apiFetch(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (session.token) headers.Authorization = `Bearer ${session.token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && path !== '/login') {
    session.clear();
    location.href = '/';
    return null;
  }

  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data;
}

export function formatPrice(price) {
  return `${new Intl.NumberFormat('en-US').format(price)} VND`;
}
