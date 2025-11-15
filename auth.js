/* auth.js – versión portable sin BASE ni rutas absolutas */
(function () {
  const STORAGE_KEY = "mysite_auth";

  function readToken() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  }

  function writeToken(t) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    } catch {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); } catch { }
    }
  }

  function removeToken() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { }
    try { localStorage.removeItem(STORAGE_KEY); } catch { }
  }

  function isLogged() {
    const t = readToken();
    return !!(t && t.logged);
  }

  // --- rutas portables ---
  function getHomeByRole(role) {
    const routes = {
      estudiante: "pages/estudiante/estudiante.html",
      docente: "pages/docente/docente.html",
      psicologo: "pages/psicologo/psicologo.html",
      coordinador: "pages/coordinador/coordinador.html",
      admin: "pages/admin/admin.html"
    };

    return routes[role] || "index.html";
  }

  function protectPage(requiredRole) {
    const t = readToken() || {};

    if (!t.logged) {
      window.location.href = "../../index.html"; 
      return;
    }

    if (requiredRole && t.role !== requiredRole) {
      window.location.href = "../../index.html";
    }
  }

  function logout() {
    removeToken();
    window.location.href = "../../index.html";
  }

  window.auth = {
    readToken,
    writeToken,
    removeToken,
    isLogged,
    getHomeByRole,
    protectPage,
    logout
  };

  window.getHomeByRole = getHomeByRole;
  window.logout = logout;

  // --- Login ---
  document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    if (!loginForm) return;

    let selectedRole = "estudiante";

    // Activar por defecto estudiante
    try {
      const defaultBtn = document.querySelector('nav a[data-role="estudiante"]');
      if (defaultBtn) defaultBtn.classList.add("active");

      document.querySelectorAll("nav a[data-role]").forEach(a => {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          selectedRole = a.dataset.role || selectedRole;
          document.querySelectorAll("nav a[data-role]").forEach(x => x.classList.remove("active"));
          a.classList.add("active");
        });
      });
    } catch { }

    // Social login pendiente
    try {
      document.querySelectorAll(".social-links a").forEach(s => {
        s.addEventListener("click", (e) => {
          e.preventDefault();
          alert("Funcionalidad pendiente de implementación");
        });
      });
    } catch { }

    loginForm.addEventListener("submit", (ev) => {
      ev.preventDefault();

      writeToken({
        logged: true,
        role: selectedRole,
        time: Date.now()
      });

      window.location.href = getHomeByRole(selectedRole);
    });
  });

})();
