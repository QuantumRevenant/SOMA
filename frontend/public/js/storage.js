// El token ahora vive en una cookie HttpOnly — el JS no lo toca
// Solo guardamos el email para el "Remember Me" visual
const EMAIL_KEY = "soma_remembered_email";

export function saveRememberedEmail(email) {
  localStorage.setItem(EMAIL_KEY, email);
}

export function getRememberedEmail() {
  return localStorage.getItem(EMAIL_KEY);
}

export function removeRememberedEmail() {
  localStorage.removeItem(EMAIL_KEY);
}