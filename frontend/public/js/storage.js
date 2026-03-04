const KEY = "soma_auth";

export function saveToken(token) {
  localStorage.setItem(KEY, token);
}
export function getToken() {
  return localStorage.getItem(KEY);
}

export function removeToken() {
  localStorage.removeItem(KEY);
}

export function isLogged() {
  return !!getToken();
}