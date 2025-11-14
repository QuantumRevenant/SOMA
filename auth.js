/* auth.js - versión robusta para login + utilidades de navegación */
(function () {
  const STORAGE_KEY = "mysite_auth";

  // --- helpers ---
  function readToken() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function writeToken(t) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    } catch (e) {
      // si falla sessionStorage (raro), intentar localStorage
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

  // Rutas de home por rol (usar en páginas para redirigir logo)
  function getHomeByRole(role) {
    const routes = {
      estudiante: "../../pages/estudiante/estudiante.html",
      docente: "../../pages/docente/docente.html",
      psicologo: "../../pages/psicologo/psicologo.html",
      coordinador: "../../pages/coordinador/coordinador.html",
      admin: "../../pages/admin/admin.html"
    };

    return routes[role] || "index.html";
  }

  // Proteger página desde inline script (útil si prefieres no duplicar lógica)
  function protectPage(requiredRole) {
    const t = readToken() || {};
    if (!t.logged) {
      location.href = "../../index.html";
      return;
    }
    if (requiredRole && t.role !== requiredRole) {
      // si no coincide el rol, volver al login
      location.href = "../../index.html";
    }
  }

  // Logout util
  function logout() {
    removeToken();
    location.href = "../../index.html";
  }

  // Exponer utilidades globales
  window.auth = {
    readToken,
    writeToken,
    removeToken,
    isLogged,
    getHomeByRole,
    protectPage,
    logout
  };
  // Además exponer funciones sueltas por compatibilidad
  window.getHomeByRole = getHomeByRole;
  window.logout = logout;

  // --- Solo ejecutar comportamiento de login si existe loginForm ---
  document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    if (!loginForm) {
      // no es la página de login, salir sin montar listeners
      return;
    }

    // Default role
    let selectedRole = "estudiante";

    // Si hay nav con data-role, configúralos como selectores
    try {
      const roleLinks = document.querySelectorAll("nav a[data-role]");
      if (roleLinks && roleLinks.length) {
        // marcar por defecto el rol "estudiante" si existe el elemento
        roleLinks.forEach(a => a.classList.remove("active"));
        const defaultBtn = document.querySelector('nav a[data-role="estudiante"]');
        if (defaultBtn) defaultBtn.classList.add("active");
      }

      document.querySelectorAll("nav a[data-role]").forEach(a => {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          selectedRole = a.dataset.role || selectedRole;
          // Visual: marcar activo (si existe)
          document.querySelectorAll("nav a[data-role]").forEach(x => x.classList.remove("active"));
          a.classList.add("active");
        });
      });
    } catch (e) {
      // no hacer nada si nav no existe
    }

    // Redes sociales: mostrar mensaje pendiente sin romper si no existen
    try {
      document.querySelectorAll(".social-links a").forEach(social => {
        social.addEventListener("click", (e) => {
          e.preventDefault();
          alert("Funcionalidad pendiente de implementación");
        });
      });
    } catch (e) { }

    // Manejar submit del formulario
    loginForm.addEventListener("submit", (ev) => {
      ev.preventDefault();

      // si no hay selección (por cualquier razón), usar estudiante
      if (!selectedRole) selectedRole = "estudiante";

      const token = {
        logged: true,
        role: selectedRole,
        time: Date.now()
      };

      writeToken(token);

      // redirigir según rol
      const dest = getHomeByRole(selectedRole);
      // Si la ruta es relativa desde index (ej: pages/...), usarla directo
      window.location.href = dest;
    });
  });

})();
