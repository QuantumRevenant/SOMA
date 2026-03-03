/* auth.js – versión portable con detección automática de base */
(function () {
  const STORAGE_KEY = "mysite_auth";

  // ⭐ DETECCIÓN AUTOMÁTICA: Calcula la base desde la ubicación del index.html
  function getBasePath() {
    const path = window.location.pathname;
    
    // Si estamos EN index.html o en la raíz
    if (path.endsWith('/') || path.endsWith('/index.html')) {
      // Extraer todo hasta el último /
      const base = path.replace(/index\.html$/, '');
      return base || '/';
    }
    
    // Si estamos en una subpágina (ej: /pages/estudiante/estudiante.html)
    // Buscamos hasta dónde está el directorio raíz
    // Asumimos que index.html está 2 niveles arriba de las subpáginas
    const segments = path.split('/').filter(s => s);
    
    // Si tenemos "pages" en la ruta, todo antes de "pages" es la base
    const pagesIndex = segments.indexOf('pages');
    if (pagesIndex > 0) {
      return '/' + segments.slice(0, pagesIndex).join('/') + '/';
    }
    
    // Fallback: si hostname contiene github.io, tomar el primer segmento
    if (window.location.hostname.includes('github.io')) {
      return segments.length > 0 ? `/${segments[0]}/` : '/';
    }
    
    return '/';
  }

  const BASE_PATH = getBasePath();

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
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
      } catch {}
    }
  }

  function removeToken() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  function isLogged() {
    const t = readToken();
    return !!(t && t.logged);
  }

  // --- rutas portables ---
  function getHomeByRole(role) {
    const routes = {
      estudiante: `${BASE_PATH}pages/estudiante/estudiante.html`,
      docente: `${BASE_PATH}pages/docente/docente.html`,
      psicologo: `${BASE_PATH}pages/psicologo/psicologo.html`,
      coordinador: `${BASE_PATH}pages/coordinador/coordinador.html`,
      admin: `${BASE_PATH}pages/admin/admin.html`
    };
    return routes[role] || `${BASE_PATH}index.html`;
  }

  // Ruta relativa desde subpágina hacia index
  function getIndexPath() {
    return "../../index.html";
  }

  // Ruta relativa desde subpágina hacia su home
  function getMyHome() {
    const t = readToken();
    if (!t || !t.logged || !t.role) return "../../index.html";
    
    const homeFiles = {
      estudiante: "estudiante.html",
      docente: "docente.html",
      psicologo: "psicologo.html",
      coordinador: "coordinador.html",
      admin: "admin.html"
    };
    return homeFiles[t.role] || "../../index.html";
  }

  function protectPage(requiredRole) {
    const t = readToken() || {};
    if (!t.logged) {
      window.location.href = getIndexPath();
      return;
    }
    if (requiredRole && t.role !== requiredRole) {
      window.location.href = getIndexPath();
    }
  }

  function logout() {
    removeToken();
    window.location.href = getIndexPath();
  }

  // Exponer en window.auth
  window.auth = {
    readToken,
    writeToken,
    removeToken,
    isLogged,
    getHomeByRole,
    getIndexPath,
    getMyHome,
    protectPage,
    logout,
    BASE_PATH  // ⭐ Exponer para debugging
  };

  // Exponer directo
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
    } catch {}

    // Social login pendiente
    try {
      document.querySelectorAll(".social-links a").forEach(s => {
        s.addEventListener("click", (e) => {
          e.preventDefault();
          alert("Funcionalidad pendiente de implementación");
        });
      });
    } catch {}

    loginForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      writeToken({ logged: true, role: selectedRole, time: Date.now() });
      
      // ⭐ Usar ruta absoluta con BASE_PATH
      window.location.href = getHomeByRole(selectedRole);
    });
  });
})();