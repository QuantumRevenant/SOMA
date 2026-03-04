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

      window.location.href = "/dashboard.html";
    } catch (err) {
      alert("Credenciales inválidas");
    }
  });
}