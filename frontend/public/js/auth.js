import { login } from "./api.js";
import {
  saveToken,
  saveRememberedEmail,
  getRememberedEmail,
  removeRememberedEmail
} from "./storage.js";

const ROLE_ROUTES = {
  coordinador: "/pages/coordinador/coordinador.html",
  docente: "/pages/docente/docente.html",
  estudiante: "/pages/estudiante/estudiante.html",
  psicologo: "/pages/psicologo/psicologo.html",
};

export function initLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  // Prellenar email si fue recordado
  const rememberedEmail = getRememberedEmail();
  if (rememberedEmail) {
    form.email.value = rememberedEmail;
    form.querySelector('input[type="checkbox"]').checked = true;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value;
    const password = form.password.value;
    const rememberMe = form.querySelector('input[type="checkbox"]').checked;

    try {
      const data = await login(email, password, rememberMe);
      saveToken(data.token);

      if (rememberMe) {
        saveRememberedEmail(email);
      } else {
        removeRememberedEmail();
      }

      window.location.href = ROLE_ROUTES[data.role] ?? "/";
    } catch (err) {
      alert("Credenciales inválidas");
    }
  });
}