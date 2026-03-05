const API = "/api/estudiante";

async function apiFetch(url, opts = {}) {
    const res = await fetch(url, { credentials: "include", ...opts });
    if (res.status === 401) { window.location.replace("/"); return null; }
    return res.json();
}

function fmt(dt) {
    if (!dt) return "—";
    return new Date(dt).toLocaleString("es-PE", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
}

function fmtDate(d) {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
}

function estadoBadge(status) {
    return status === "presente" ? `<span class="badge badge-presente">✅ Presente</span>`
        : status === "tardanza" ? `<span class="badge badge-tardanza">🕐 Tardanza</span>`
            : `<span class="badge badge-ausente">❌ Ausente</span>`;
}

function isPast(dt) { return new Date(dt) < new Date(); }

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    const me = await apiFetch("/api/me");
    if (!me) return;

    document.getElementById("user-name").textContent = me.full_name;
    document.getElementById("user-avatar").textContent =
        me.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

    document.getElementById("btn-logout").addEventListener("click", async () => {
        await fetch("/api/logout", { method: "POST", credentials: "include" });
        window.location.replace("/");
    });

    // Tabs principales
    document.querySelectorAll(".tab[data-tab]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab[data-tab]").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(btn.dataset.tab).classList.add("active");
        });
    });

    // Selector de ciclo (cursos) — "" = todos, valor = filtro específico
    document.getElementById("select-ciclo").addEventListener("change", e =>
        cargarCursos(e.target.value)
    );

    // Selector de ciclo (calificaciones) — siempre tiene valor
    document.getElementById("select-ciclo-grades").addEventListener("change", e => {
        const v = e.target.value;
        const lista = todosLosCursos.filter(c => c.period_label === v);
        renderGrades(lista, v);
    });

    // Tabs de servicios
    document.querySelectorAll(".servicio-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".servicio-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".servicio-panel").forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(`srv-${btn.dataset.servicio}`).classList.add("active");
        });
    });

    initPopupCurso();

    await Promise.all([
        cargarResumen(),
        cargarCursos(),
        cargarAsesorias(),
        cargarTalleres(),
        cargarCitas(),
        cargarMisServicios(),
    ]);
});

// ── Resumen ───────────────────────────────────────────────────────────────────
async function cargarResumen() {
    const data = await apiFetch(`${API}/resumen`);
    if (!data) return;
    document.getElementById("stat-cursos").textContent =
        data.cursos_activos ?? "—";
    document.getElementById("stat-promedio").textContent =
        data.promedio_general !== null ? data.promedio_general : "—";
}

// ── Todos los cursos ─────────────────────────────────────────────────────────
let todosLosCursos = [];
let periodosCache = [];

async function cargarCursos(filtro = "") {
    // En la primera carga pedimos todo para tener periodosCache, luego filtramos
    const fetchAll = filtro === "__activo__" || periodosCache.length === 0;
    const url = fetchAll ? `${API}/cursos` : `${API}/cursos?periodo=${encodeURIComponent(filtro)}`;
    const data = await apiFetch(url);
    if (!data) return;

    // Primera carga: poblar selectores de periodo
    if (periodosCache.length === 0 && data.periodos?.length) {
        periodosCache = data.periodos;
        const activo = data.periodos.find(p => p.is_active);
        // select-ciclo (Mis Cursos): incluye "Todos los ciclos"
        const selCursos = document.getElementById("select-ciclo");
        selCursos.innerHTML = "";
        selCursos.add(new Option("Todos los ciclos", ""));
        data.periodos.forEach(p => {
            const label = p.label + (p.is_active ? " (actual)" : "");
            selCursos.add(new Option(label, p.label));
        });
        // Default: todos (muestra agrupado)
        selCursos.value = "";

        // select-ciclo-grades (Calificaciones): sin "Todos", default activo
        const selGrades = document.getElementById("select-ciclo-grades");
        selGrades.innerHTML = "";
        data.periodos.forEach(p => {
            const label = p.label + (p.is_active ? " (actual)" : "");
            selGrades.add(new Option(label, p.label));
        });
        if (activo) selGrades.value = activo.label;
        todosLosCursos = data.cursos;
        // Si era la primera carga, filtrar al activo
        if (filtro === "__activo__" && activo) {
            filtro = activo.label;
        }
    }

    // Si trajimos todo pero hay filtro, filtrar en cliente
    const cursos = (fetchAll && filtro && filtro !== "__activo__")
        ? todosLosCursos.filter(c => c.period_label === filtro)
        : data.cursos;
    const grid = document.getElementById("courses-grid");

    if (cursos.length === 0) {
        grid.innerHTML = "<p style='color:#999'>No hay cursos para este ciclo.</p>";
        renderGrades([], filtro);
        return;
    }

    if (filtro) {
        // Ciclo específico — grid plano sin subtítulo
        grid.innerHTML = `<div class="courses-grid-inner">${cursos.map(c => buildCourseCard(c)).join("")}</div>`;
    } else {
        // Todos — agrupado por ciclo, cada grupo con su propio grid
        const porPeriodo = {};
        cursos.forEach(c => {
            if (!porPeriodo[c.period_label]) porPeriodo[c.period_label] = [];
            porPeriodo[c.period_label].push(c);
        });
        grid.innerHTML = Object.entries(porPeriodo).map(([periodo, lista]) => `
      <div class="periodo-group">
        <div class="periodo-group-titulo">${periodo}${lista[0].is_active ? ' <span class="badge-actual">Actual</span>' : ""}</div>
        <div class="courses-grid-inner">${lista.map(c => buildCourseCard(c)).join("")}</div>
      </div>`).join("");
    }

    renderGrades(cursos, filtro);
}

function buildCourseCard(c) {
    return `
    <div class="course-card">
      <div class="course-header">
        <div class="course-code">${c.code} — ${c.period_label}</div>
        <div class="course-title">${c.course_name}</div>
        <div class="course-professor">Prof. ${c.docente_name}</div>
      </div>
      <div class="course-body">
        <div class="course-stats">
          <div class="stat-item">
            <div class="stat-value">${c.credits}</div>
            <div>Créditos</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${c.evaluaciones_registradas ?? 0}/${c.total_evaluaciones}</div>
            <div>Notas</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${c.promedio ?? "—"}</div>
            <div>Promedio</div>
          </div>
        </div>
        <div class="course-actions">
          <button class="btn btn-primary btn-ver-curso"
            data-enrollment="${c.enrollment_id}"
            data-nombre="${c.course_name}"
            data-docente="${c.docente_name}">
            Ver detalle
          </button>
        </div>
      </div>
    </div>`;
}

// ── Calificaciones ────────────────────────────────────────────────────────────
function renderGrades(cursos, filtro = "") {
    const wrap = document.getElementById("grades-wrap");

    // Sincronizar selector de grades con el filtro aplicado
    if (filtro) {
        const sel = document.getElementById("select-ciclo-grades");
        if (sel.value !== filtro) sel.value = filtro;
    }

    if (cursos.length === 0) {
        wrap.innerHTML = `<h2 style="margin-bottom:20px;color:#1e293b">Mis Calificaciones</h2>
      <p style="color:#999">No hay cursos para este ciclo.</p>`;
        return;
    }
    wrap.innerHTML = `
    <h2 style="margin-bottom:16px;color:#1e293b">Mis Calificaciones</h2>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      ${cursos.map((c, i) => `
        <button class="tab ${i === 0 ? "active" : ""}" data-gtab="${c.enrollment_id}"
          style="padding:8px 16px;font-size:14px">
          ${c.code}${!c.is_active ? "" : ' <small style="font-size:10px;opacity:.7">●</small>'}
        </button>`).join("")}
    </div>
    <div id="grade-content"></div>`;

    document.querySelectorAll("[data-gtab]").forEach(btn => {
        btn.addEventListener("click", async () => {
            document.querySelectorAll("[data-gtab]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            await cargarNotasGrade(btn.dataset.gtab);
        });
    });
    cargarNotasGrade(cursos[0].enrollment_id);
}

async function cargarNotasGrade(enrollmentId) {
    const wrap = document.getElementById("grade-content");
    wrap.innerHTML = "<p style='color:#999'>Cargando...</p>";
    const data = await apiFetch(`${API}/cursos/${enrollmentId}/notas`);
    if (!data) return;

    wrap.innerHTML = `
    <div class="notification-item">
      <div style="overflow-x:auto">
        <table class="notas" style="width:100%">
          <thead><tr><th>Evaluación</th><th>Peso</th><th>Nota</th></tr></thead>
          <tbody>
            ${data.notas.map(n => `
              <tr>
                <td>${n.name}</td><td>${n.weight}%</td>
                <td>${n.score !== null ? `<strong>${n.score}</strong>`
            : "<span style='color:#999'>Pendiente</span>"}</td>
              </tr>`).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2"><strong>Promedio actual</strong>
                <small style="color:#999;font-size:11px"> (${data.peso_completado ?? 0}% evaluado)</small>
              </td>
              <td><strong>${data.promedio !== null ? data.promedio : "—"}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>`;
}

// ── Popup curso (notas + asistencia) ─────────────────────────────────────────
function initPopupCurso() {
    const popup = document.getElementById("popup-curso");

    document.getElementById("close-popup-curso").addEventListener("click",
        () => popup.classList.remove("active"));
    popup.addEventListener("click", e => {
        if (e.target === popup) popup.classList.remove("active");
    });

    // Tabs del popup
    document.querySelectorAll(".tab-popup[data-ptab]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-popup").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".content-popup").forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(`panel-${btn.dataset.ptab}`).classList.add("active");
        });
    });

    // Delegación — cualquier btn-ver-curso en el documento
    document.addEventListener("click", async e => {
        const btn = e.target.closest(".btn-ver-curso");
        if (!btn) return;

        const enrollmentId = btn.dataset.enrollment;
        document.getElementById("popup-titulo").textContent = btn.dataset.nombre;
        document.getElementById("popup-docente").textContent = `Prof. ${btn.dataset.docente}`;
        document.getElementById("tbody-notas-popup").innerHTML =
            "<tr><td colspan='3' style='color:#999;text-align:center'>Cargando...</td></tr>";
        document.getElementById("tbody-asistencia").innerHTML =
            "<tr><td colspan='2' style='color:#999;text-align:center'>Cargando...</td></tr>";
        document.getElementById("resumen-asistencia").innerHTML = "";
        document.getElementById("promedio-popup").textContent = "—";
        document.getElementById("peso-completado").textContent = "";

        // Activar tab notas por defecto
        document.querySelectorAll(".tab-popup").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".content-popup").forEach(p => p.classList.remove("active"));
        document.querySelector(".tab-popup[data-ptab='notas']").classList.add("active");
        document.getElementById("panel-notas").classList.add("active");

        popup.classList.add("active");

        // Cargar ambos en paralelo
        const [notas, asist] = await Promise.all([
            apiFetch(`${API}/cursos/${enrollmentId}/notas`),
            apiFetch(`${API}/cursos/${enrollmentId}/asistencia`),
        ]);

        if (notas) {
            document.getElementById("tbody-notas-popup").innerHTML =
                notas.notas.map(n => `
          <tr>
            <td>${n.name}</td><td>${n.weight}%</td>
            <td>${n.score !== null ? `<strong>${n.score}</strong>`
                        : "<span style='color:#999'>—</span>"}</td>
          </tr>`).join("");
            document.getElementById("promedio-popup").textContent =
                notas.promedio !== null ? notas.promedio : "—";
            if (notas.peso_completado)
                document.getElementById("peso-completado").textContent =
                    ` (${notas.peso_completado}% evaluado)`;
        }

        if (asist) {
            const r = asist.resumen;
            document.getElementById("resumen-asistencia").innerHTML = `
        <div class="asist-stat"><span>${r.presente}</span>Presentes</div>
        <div class="asist-stat asist-tardanza"><span>${r.tardanza}</span>Tardanzas</div>
        <div class="asist-stat asist-ausente"><span>${r.ausente}</span>Ausencias</div>
        <div class="asist-stat asist-pct">
          <span>${r.pct !== null ? r.pct + "%" : "—"}</span>Asistencia
        </div>`;

            document.getElementById("tbody-asistencia").innerHTML =
                asist.registros.length === 0
                    ? "<tr><td colspan='2' style='color:#999;text-align:center'>Sin registros aún.</td></tr>"
                    : asist.registros.map(r =>
                        `<tr><td>${fmtDate(r.date)}</td><td>${estadoBadge(r.status)}</td></tr>`
                    ).join("");
        }
    });
}

// ── Helpers servicios ─────────────────────────────────────────────────────────
function cupoLabel(reservas, capacity) {
    const libre = capacity - reservas;
    const color = libre === 0 ? "#e74c3c" : libre <= 2 ? "#f39c12" : "#27ae60";
    return `<span style="color:${color};font-weight:bold">${libre}</span>/${capacity} cupos`;
}

async function toggleServicio(endpoint, id, yaHecho, btnEl, recargar) {
    btnEl.disabled = true;
    const accion = endpoint === "talleres" ? "inscribir" : "reservar";
    const method = yaHecho ? "DELETE" : "POST";
    const res = await apiFetch(`${API}/${endpoint}/${id}/${accion}`, { method });
    if (res?.ok) { await recargar(); await cargarMisServicios(); }
    else { alert(res?.error ?? "Error"); btnEl.disabled = false; }
}

function bindServicioBtns(tipo, recargar) {
    document.querySelectorAll(`#srv-${tipo} .btn-servicio`).forEach(btn => {
        btn.addEventListener("click", () =>
            toggleServicio(tipo, btn.dataset.id, btn.dataset.hecho === "1", btn, recargar));
    });
}

function buildServicioCard(item, tipo) {
    const yaHecho = true; // siempre en "mis inscripciones"
    const pasado = isPast(item.ends_at ?? item.starts_at);
    return `
    <div class="servicio-card ${pasado ? "servicio-pasado" : ""}">
      <div class="servicio-info">
        ${pasado ? `<span class="badge-pasado">Finalizado</span>` : ""}
        <div class="servicio-titulo">
          ${tipo === "taller" ? item.title : tipo === "asesoria"
            ? `Asesoría — ${item.owner_name}` : `Cita psicológica — ${item.owner_name}`}
        </div>
        <div class="servicio-fecha">📅 ${fmt(item.starts_at)}${item.ends_at ? ` — ${fmt(item.ends_at)}` : ""}</div>
        ${item.location ? `<div class="servicio-lugar">📍 ${item.location}</div>` : ""}
      </div>
      ${!pasado && tipo !== "taller" ? `
        <button class="btn btn-cancelar btn-servicio"
          data-id="${item.id}" data-tipo="${tipo === "asesoria" ? "asesorias" : "citas"}"
          data-hecho="1">
          Cancelar
        </button>` : ""}
    </div>`;
}

// ── Asesorías ─────────────────────────────────────────────────────────────────
async function cargarAsesorias() {
    const data = await apiFetch(`${API}/asesorias`);
    const wrap = document.getElementById("lista-asesorias");
    if (!data) return;

    const disponibles = data.filter(a => (a.capacity - a.reservas) > 0).length;
    document.getElementById("stat-asesorias").textContent = disponibles || "—";

    wrap.innerHTML = data.length === 0
        ? "<p style='color:#999'>No hay asesorías disponibles próximamente.</p>"
        : data.map(a => {
            const sinCupo = !a.ya_reservado && (a.capacity - a.reservas) <= 0;
            return `
        <div class="servicio-card">
          <div class="servicio-info">
            <div class="servicio-titulo">Prof. ${a.docente_name}</div>
            <div class="servicio-fecha">📅 ${fmt(a.starts_at)} — ${fmt(a.ends_at)}</div>
            ${a.location ? `<div class="servicio-lugar">📍 ${a.location}</div>` : ""}
            <div class="servicio-cupo">${cupoLabel(a.reservas, a.capacity)}</div>
          </div>
          <button class="btn ${a.ya_reservado ? "btn-cancelar" : sinCupo ? "btn-sin-cupo" : "btn-primary"} btn-servicio"
            data-id="${a.id}" data-tipo="asesorias" data-hecho="${a.ya_reservado ? 1 : 0}"
            ${sinCupo ? "disabled" : ""}>
            ${a.ya_reservado ? "Cancelar reserva" : sinCupo ? "Sin cupo" : "Reservar"}
          </button>
        </div>`;
        }).join("");

    bindServicioBtns("asesorias", cargarAsesorias);
}

// ── Talleres ──────────────────────────────────────────────────────────────────
async function cargarTalleres() {
    const data = await apiFetch(`${API}/talleres`);
    const wrap = document.getElementById("lista-talleres");
    if (!data) return;

    const disponibles = data.filter(t => (t.capacity - t.inscritos) > 0).length;
    document.getElementById("stat-talleres").textContent = disponibles || "—";

    wrap.innerHTML = data.length === 0
        ? "<p style='color:#999'>No hay talleres disponibles próximamente.</p>"
        : data.map(t => {
            const sinCupo = !t.ya_inscrito && (t.capacity - t.inscritos) <= 0;
            return `
        <div class="servicio-card">
          <div class="servicio-info">
            <div class="servicio-titulo">${t.title}</div>
            ${t.description ? `<p style="font-size:13px;color:#555;margin:4px 0">${t.description}</p>` : ""}
            <div class="servicio-fecha">📅 ${fmt(t.starts_at)} — ${fmt(t.ends_at)}</div>
            ${t.location ? `<div class="servicio-lugar">📍 ${t.location}</div>` : ""}
            <div class="servicio-cupo">${cupoLabel(t.inscritos, t.capacity)}</div>
          </div>
          <button class="btn ${t.ya_inscrito ? "btn-cancelar" : sinCupo ? "btn-sin-cupo" : "btn-primary"} btn-servicio"
            data-id="${t.id}" data-tipo="talleres" data-hecho="${t.ya_inscrito ? 1 : 0}"
            ${sinCupo ? "disabled" : ""}>
            ${t.ya_inscrito ? "Cancelar inscripción" : sinCupo ? "Sin cupo" : "Inscribirme"}
          </button>
        </div>`;
        }).join("");

    bindServicioBtns("talleres", cargarTalleres);
}

// ── Citas ─────────────────────────────────────────────────────────────────────
async function cargarCitas() {
    const data = await apiFetch(`${API}/citas`);
    const wrap = document.getElementById("lista-citas");
    if (!data) return;

    wrap.innerHTML = data.length === 0
        ? "<p style='color:#999'>No hay citas psicológicas disponibles próximamente.</p>"
        : data.map(c => {
            const sinCupo = !c.ya_reservado && (c.capacity - c.reservas) <= 0;
            return `
        <div class="servicio-card">
          <div class="servicio-info">
            <div class="servicio-titulo">Psic. ${c.psicologo_name}</div>
            <div class="servicio-fecha">📅 ${fmt(c.starts_at)} — ${fmt(c.ends_at)}</div>
            ${c.location ? `<div class="servicio-lugar">📍 ${c.location}</div>` : ""}
            <div class="servicio-cupo">${cupoLabel(c.reservas, c.capacity)}</div>
          </div>
          <button class="btn ${c.ya_reservado ? "btn-cancelar" : sinCupo ? "btn-sin-cupo" : "btn-primary"} btn-servicio"
            data-id="${c.id}" data-tipo="citas" data-hecho="${c.ya_reservado ? 1 : 0}"
            ${sinCupo ? "disabled" : ""}>
            ${c.ya_reservado ? "Cancelar reserva" : sinCupo ? "Sin cupo" : "Reservar"}
          </button>
        </div>`;
        }).join("");

    bindServicioBtns("citas", cargarCitas);
}

// ── Mis inscripciones ─────────────────────────────────────────────────────────
async function cargarMisServicios() {
    const data = await apiFetch(`${API}/mis-servicios`);
    const wrap = document.getElementById("lista-mis-servicios");
    if (!data) return;

    const total = data.asesorias.length + data.citas.length + data.talleres.length;
    if (total === 0) {
        wrap.innerHTML = "<p style='color:#999'>No tienes inscripciones ni reservas aún.</p>";
        return;
    }

    const seccion = (titulo, items, tipo) => {
        if (items.length === 0) return "";
        return `
      <h3 style="margin:16px 0 8px;color:#1e293b">${titulo}</h3>
      ${items.map(i => buildServicioCard(i, tipo)).join("")}`;
    };

    wrap.innerHTML =
        seccion("Asesorías reservadas", data.asesorias, "asesoria") +
        seccion("Talleres inscritos", data.talleres, "taller") +
        seccion("Citas psicológicas", data.citas, "cita_psicologica");

    // Bind cancelar en mis inscripciones
    wrap.querySelectorAll(".btn-servicio").forEach(btn => {
        btn.addEventListener("click", () => {
            const tipo = btn.dataset.tipo;
            const accion = tipo === "talleres" ? "inscribir" : "reservar";
            btn.disabled = true;
            apiFetch(`${API}/${tipo}/${btn.dataset.id}/${accion}`, { method: "DELETE" })
                .then(res => {
                    if (res?.ok) { cargarMisServicios(); cargarAsesorias(); cargarCitas(); cargarTalleres(); }
                    else { alert(res?.error ?? "Error"); btn.disabled = false; }
                });
        });
    });
}