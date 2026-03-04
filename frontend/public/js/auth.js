import { login } from "./api.js";
import { saveToken } from "./storage.js";

export function initLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = form.email.value;
    const password = form.password.value;

    try {
      const data = await login(email, password);
      saveToken(data.token);

      const routes = {
        coordinador: "/pages/coordinador/coordinador.html",
        docente: "/pages/docente/docente.html",
        estudiante: "/pages/estudiante/estudiante.html",
        psicologo: "/pages/psicologo/psicologo.html",
      };
      window.location.href = routes[data.role] ?? "/index.html";
    } catch (err) {
      alert("Credenciales inválidas");
    }
  });
}