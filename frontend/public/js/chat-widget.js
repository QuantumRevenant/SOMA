/**
 * SOMA — Chat Support Widget
 * Autocontenido: inyecta CSS + HTML al cargarse.
 * Uso: <script src="chat-widget.js" data-href="https://wa.me/..." data-label="¿Necesitas soporte?"></script>
 * Si no se pasan atributos, usa los valores por defecto definidos abajo.
 */
(function () {
  const script = document.currentScript;

  // ── Configuración: SOMA_CONFIG > data-attributes > defaults ──
  const _cfg = (typeof SOMA_CONFIG !== "undefined" && SOMA_CONFIG.support) || {};
  const config = {
    href: _cfg.href || script?.dataset.href || "https://wa.me/message/54ZVGH6PRSBTK1",
    label: _cfg.label || script?.dataset.label || "¿Necesitas soporte?",
    target: _cfg.target || script?.dataset.target || "_blank",
  };

  // ── CSS ──
  const css = `
    :root {
      --chat-position-x: 25px;
      --chat-position-y: 25px;
      --chat-bubble-bg: #1a75ea;
      --chat-bubble-text: #ffffff;
      --chat-icon-size: 60px;
      --chat-popup-min: 15.5rem;
      --chat-popup-max: 25rem;
      --chat-font: system-ui, sans-serif;
      --chat-font-size: 1rem;
      --chat-font-weight: 500;
      --chat-radius: 40px;
      --chat-shadow: 0 0 5px rgba(26, 117, 234, 0.7);
      --chat-popup-offset: 70px;
      --chat-popup-offset-hover: 80px;
      --chat-transition: 0.3s ease;
    }
    .chat-bubble {
      position: fixed;
      right: var(--chat-position-x);
      bottom: var(--chat-position-y);
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 10px;
      z-index: 9999;
      font-family: var(--chat-font);
    }
    .chat-wrapper {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .chat-icon svg {
      width: var(--chat-icon-size);
      height: var(--chat-icon-size);
      fill: var(--chat-bubble-bg);
      transition: transform var(--chat-transition), filter var(--chat-transition);
      cursor: pointer;
    }
    .chat-icon svg:hover {
      transform: scale(1.15);
      filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.4));
    }
    .chat-popup {
      position: absolute;
      bottom: var(--chat-popup-offset);
      right: 0;
      background-color: var(--chat-bubble-bg);
      color: var(--chat-bubble-text);
      padding: 10px 18px;
      border-radius: var(--chat-radius);
      font-size: var(--chat-font-size);
      font-weight: var(--chat-font-weight);
      min-width: var(--chat-popup-min);
      max-width: var(--chat-popup-max);
      box-shadow: var(--chat-shadow);
      opacity: 0;
      pointer-events: none;
      line-height: 1.3;
      text-align: center;
      white-space: normal;
      word-wrap: break-word;
      transition: opacity var(--chat-transition), bottom var(--chat-transition);
    }
    .chat-popup.visible {
      opacity: 1;
      pointer-events: auto;
      bottom: var(--chat-popup-offset-hover);
    }
    .chat-icon:hover ~ .chat-popup:not(.pinned),
    .chat-popup:hover {
      opacity: 1;
      pointer-events: auto;
      bottom: var(--chat-popup-offset-hover);
    }
  `;

  // ── HTML ──
  const html = `
    <div class="chat-bubble">
      <div class="chat-wrapper">
        <div class="chat-icon" id="soma-chat-icon">
          <a href="${config.href}" target="${config.target}" rel="noopener noreferrer">
            <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="24" fill="#fff"/>
              <g>
                <path fill-rule="evenodd" clip-rule="evenodd"
                  d="M24 48C10.7452 48 0 37.2548 0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24C48 37.2548 37.2548 48 24 48ZM24.7911 37.3525C32.6595 37.3493 39.059 30.9483 39.0621 23.0815C39.0637 19.2683 37.5806 15.6828 34.8862 12.9854C32.1918 10.2879 28.6086 8.80165 24.7909 8.8C16.9248 8.8 10.5228 15.2017 10.5196 23.0702C10.5186 25.5855 11.1757 28.0405 12.4246 30.2048L10.4 37.6L17.9653 35.6155C20.0498 36.7524 22.3967 37.3517 24.7852 37.3525H24.7911Z"/>
              </g>
            </svg>
          </a>
        </div>
        <div class="chat-popup" id="soma-chat-popup">
          ${config.label}
        </div>
      </div>
    </div>
  `;

  // ── Inyección ──
  function inject() {
    // CSS
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    // HTML
    const container = document.createElement("div");
    container.innerHTML = html.trim();
    document.body.appendChild(container.firstChild);

    // Toggle por click — el popup se queda visible aunque el mouse se mueva
    const icon = document.getElementById("soma-chat-icon");
    const popup = document.getElementById("soma-chat-popup");

    if (icon && popup) {
      icon.addEventListener("click", (e) => {
        // Si el click fue en el enlace, no togglear — dejar que navegue
        if (e.target.closest("a")) return;
        popup.classList.toggle("visible");
      });

      // Click fuera cierra el popup
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".chat-bubble")) {
          popup.classList.remove("visible");
        }
      });
    }
  }

  // Esperar a que el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();