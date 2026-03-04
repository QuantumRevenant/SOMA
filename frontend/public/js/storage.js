const TOKEN_KEY = "soma_token";
const EMAIL_KEY = "soma_remembered_email";

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isLogged() {
  return !!getToken();
}

export function saveRememberedEmail(email) {
  localStorage.setItem(EMAIL_KEY, email);
}

export function getRememberedEmail() {
  return localStorage.getItem(EMAIL_KEY);
}

export function removeRememberedEmail() {
  localStorage.removeItem(EMAIL_KEY);
}