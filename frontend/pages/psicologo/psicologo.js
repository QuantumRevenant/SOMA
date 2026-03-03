// ============================
// 🔄 CAMBIO DE TABS (FUNCIONAL)
// ============================
document.addEventListener("DOMContentLoaded", () => {
    const items = document.querySelectorAll(".items li");
    const contents = document.querySelectorAll(".tab-content");

    items.forEach(item => {
        item.addEventListener("click", () => {
            // Quitar selección actual
            items.forEach(i => i.classList.remove("active"));
            contents.forEach(c => c.classList.remove("show"));

            // Activar el tab seleccionado
            item.classList.add("active");

            const tab = item.getAttribute("data-tab");
            const contentToShow = document.querySelector(`.tab-content[data-content="${tab}"]`);

            if (contentToShow) {
                contentToShow.classList.add("show");
            }
        });
    });
});

// =============================
// 🔍 BUSCAR CITAS DEL BACKEND (CON PAGINACIÓN)
// =============================

const btnBuscar = document.querySelector(".icon-search");
const inputBuscar = document.querySelector(".input-search");
const tablaBody = document.querySelector('[data-content="citas"] .body-table');

// Para "Citas Agendadas"
const inputAgendadas = document.querySelector('[data-content="citas-agendadas"] .input-search');
const btnBuscarAgendadas = document.querySelector('[data-content="citas-agendadas"] .icon-search');
const tablaAgendadas = document.querySelector('[data-content="citas-agendadas"] .body-table');

// Paginación
let limit = 30;
let offset = 0;
let lastNombreQueried = "";

/**
 * renderRowForTable:
 * - tablaTarget: elemento tbody donde se insertan filas
 * - item: objeto de la API (IdCita, FechaCita, HoraCita, Estado, NombreEstudiante, ApellidoEstudiante)
 *
 * Determina el orden de columnas según la tabla (citas-agendadas usa: estudiante, fecha, hora, estado).
 */
function renderRowForTable(tablaTarget, item) {
    const fecha = item.FechaCita ? new Date(item.FechaCita).toLocaleDateString("es-PE") : "";
    const hora = item.HoraCita ? item.HoraCita.substring(0,5) : "";
    const estudiante = `${item.ApellidoEstudiante || ""} ${item.NombreEstudiante || ""}`.trim();

    // Si el tbody pertenece a "citas-agendadas", usamos: Estudiante | Fecha | Hora | Estado
    const isAgendadas = tablaTarget.closest('[data-content]') &&
                        tablaTarget.closest('[data-content]').getAttribute('data-content') === 'citas-agendadas';

    if (isAgendadas) {
        return `
            <tr class="center">
                <td>${estudiante}</td>
                <td>${fecha}</td>
                <td>${hora}</td>
                <td>${item.Estado || ""}</td>
            </tr>
        `;
    }

    // Por defecto (otras tablas): Fecha | Hora | Estado | Estudiante | Id
    return `
        <tr class="center">
            <td>${fecha}</td>
            <td>${hora}</td>
            <td>${item.Estado || ""}</td>
            <td>${estudiante}</td>
            <td>${item.IdCita || ""}</td>
        </tr>
    `;
}

// 🔄 LLAMADA AL BACKEND
function fetchYRender(nombre, limitParam, offsetParam, tablaTarget) {

    // column count (colspan) try-safe
    let colspan = 5;
    try {
        const ths = tablaTarget.closest('table').querySelectorAll('thead th');
        colspan = Math.max(1, ths.length);
    } catch (e) { /* ignore */ }

    tablaTarget.innerHTML = `<tr class="center"><td colspan="${colspan}">Cargando...</td></tr>`;

    const url = `http://localhost:3000/psicologo/citas?nombre=${encodeURIComponent(nombre)}&limit=${limitParam}&offset=${offsetParam}`;

    fetch(url)
        .then(res => res.json())
        .then(resObj => {
            // resObj puede ser { count, limit, offset, data } según backend sugerido
            const data = Array.isArray(resObj) ? resObj : (resObj.data || []);

            console.log('Respuesta paginada:', resObj);

            if (offsetParam === 0) tablaTarget.innerHTML = "";

            if (!data.length) {
                tablaTarget.innerHTML = `
                    <tr class="center">
                        <td colspan="${colspan}">No se encontraron resultados</td>
                    </tr>`;
                return;
            }

            // Agregar filas
            data.forEach(item => {
                tablaTarget.innerHTML += renderRowForTable(tablaTarget, item);
            });

            // Mostrar/crear botón "Cargar más"
            let loadMoreBtn = tablaTarget.parentElement.querySelector('.load-more-btn');
            if (!loadMoreBtn) {
                loadMoreBtn = document.createElement('button');
                loadMoreBtn.className = 'logout-btn load-more-btn';
                loadMoreBtn.textContent = 'Cargar más';
                loadMoreBtn.style.margin = '10px';
                tablaTarget.parentElement.appendChild(loadMoreBtn);

                loadMoreBtn.addEventListener('click', () => {
                    offset += limit;
                    fetchYRender(lastNombreQueried, limit, offset, tablaTarget);
                });
            }

            // Si la respuesta vino con menos elementos que el límite, ocultar botón
            const receivedCount = Array.isArray(resObj) ? resObj.length : (resObj.count || data.length);
            if (receivedCount < limitParam) {
                loadMoreBtn.style.display = 'none';
            } else {
                loadMoreBtn.style.display = 'inline-block';
            }
        })
        .catch(err => {
            console.error("Error:", err);
            tablaTarget.innerHTML = `<tr class="center"><td colspan="${colspan}">Error al cargar</td></tr>`;
        });
}

// 🔍 Buscador Citas (pestaña "citas")
if (btnBuscar && inputBuscar && tablaBody) {
    btnBuscar.addEventListener("click", () => {
        offset = 0;
        lastNombreQueried = inputBuscar.value.trim();
        fetchYRender(lastNombreQueried, limit, offset, tablaBody);
    });
}

// 🔍 Buscador Citas Agendadas
if (btnBuscarAgendadas && inputAgendadas && tablaAgendadas) {
    btnBuscarAgendadas.addEventListener("click", () => {
        offset = 0;
        lastNombreQueried = inputAgendadas.value.trim();
        fetchYRender(lastNombreQueried, limit, offset, tablaAgendadas);
    });
}

// ============================
// 👁 MOSTRAR / OCULTAR OBSERVACIONES
// ============================
function mostrarObservaciones() {
    const mostrar = document.getElementById("mostrarBusqueda");
    const container = document.getElementById("observacionesContainer");
    if (mostrar) mostrar.classList.add("hidden");
    if (container) container.classList.remove("hidden");
}

function regresar() {
    const mostrar = document.getElementById("mostrarBusqueda");
    const container = document.getElementById("observacionesContainer");
    if (mostrar) mostrar.classList.remove("hidden");
    if (container) container.classList.add("hidden");
}

// ============================
// 🔐 LOGOUT
// ============================
function logout() {
    localStorage.removeItem("token");
    window.location.href = "../../login.html";
}