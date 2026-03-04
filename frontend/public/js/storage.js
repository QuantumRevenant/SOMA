const KEY = "soma_auth";

export function saveToken(token) {
  localStorage.setItem(KEY, JSON.stringify(token));
}

export function getToken() {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export function removeToken() {
  localStorage.removeItem(KEY);
}

export function isLogged() {
  return !!getToken();
}