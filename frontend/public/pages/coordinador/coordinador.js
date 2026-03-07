const API = "/api/coordinador";

async function apiFetch(url, opts = {}) {
    const res = await fetch(url, { credentials: "include", ...opts });
    if (res.status === 401) { window.location.replace("/"); return null; }
    return res.json();
}

function fmt(dt) {
    if (!dt) return "—";
    return new Date(dt).toLocaleString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
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

    // Subtabs (delegación global)
    document.addEventListener("click", e => {
        const sub = e.target.closest(".subtab[data-subtab]");
        if (!sub) return;
        const parent = sub.closest(".content-section, .popup-content");
        parent.querySelectorAll(".subtab").forEach(t => t.classList.remove("active"));
        parent.querySelectorAll(".subtab-panel").forEach(p => p.classList.remove("active"));
        sub.classList.add("active");
        const panel = parent.querySelector(`#sub-${sub.dataset.subtab}`);
        if (panel) panel.classList.add("active");
    });

    initPersonal();
    initAlumnos();
    initAcademico();
    initTalleres();
    initReportes();
    initPopupAlumno();

    await Promise.all([
        cargarResumen(),
        cargarPersonal(),
        cargarAlumnos(),
        cargarAcademico(),
        cargarTalleres(),
        cargarReportes(),
    ]);
});

// ── Resumen ───────────────────────────────────────────────────────────────────
async function cargarResumen() {
    const d = await apiFetch(`${API}/resumen`);
    if (!d) return;
    document.getElementById("st-docentes").textContent = d.total_docentes ?? "—";
    document.getElementById("st-alumnos").textContent = d.total_alumnos ?? "—";
    document.getElementById("st-secciones").textContent = d.total_secciones ?? "—";
    document.getElementById("st-promedio").textContent = d.promedio_global ?? "—";
    document.getElementById("st-alertas").textContent = d.alertas ?? "0";
}

// ── Personal ──────────────────────────────────────────────────────────────────
function initPersonal() { }

async function cargarPersonal() {
    const d = await apiFetch(`${API}/personal`);
    if (!d) return;

    document.getElementById("lista-docentes").innerHTML =
        d.docentes.length === 0
            ? "<p class='txt-vacio'>Sin docentes asignados.</p>"
            : d.docentes.map(p => `
          <div class="persona-card">
            <div class="persona-avatar">${p.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</div>
            <div>
              <div class="persona-nombre">${p.full_name}</div>
              <div class="persona-info">${p.email}</div>
              <div class="persona-info">${p.secciones_activas} sección(es) · ${p.total_alumnos} alumnos</div>
            </div>
          </div>`).join("");

    document.getElementById("lista-psicologos").innerHTML =
        d.psicologos.length === 0
            ? "<p class='txt-vacio'>Sin psicólogos.</p>"
            : d.psicologos.map(p => `
          <div class="persona-card">
            <div class="persona-avatar">${p.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</div>
            <div>
              <div class="persona-nombre">${p.full_name}</div>
              <div class="persona-info">${p.email}</div>
              <div class="persona-info">${p.citas_realizadas} cita(s) realizadas</div>
            </div>
          </div>`).join("");
}

// ── Alumnos ───────────────────────────────────────────────────────────────────
let alumnosData = [];
let alumnosConfig = null;

function initAlumnos() {
    let debounce;
    document.getElementById("input-buscar-alumno").addEventListener("input", () => {
        clearTimeout(debounce);
        debounce = setTimeout(renderAlumnos, 300);
    });
    document.getElementById("chk-solo-riesgo").addEventListener("change", renderAlumnos);
}

async function cargarAlumnos() {
    const d = await apiFetch(`${API}/alumnos`);
    if (!d) return;
    alumnosData = d.alumnos;
    alumnosConfig = d.config;
    renderAlumnos();
}

function esRiesgo(a) {
    if (!alumnosConfig) return false;
    return (a.promedio !== null && a.promedio < alumnosConfig.min_promedio)
        || (a.pct_asistencia !== null && a.pct_asistencia < alumnosConfig.min_asistencia_pct);
}

function renderAlumnos() {
    const q = document.getElementById("input-buscar-alumno").value.toLowerCase();
    const soloRisk = document.getElementById("chk-solo-riesgo").checked;
    const lista = alumnosData.filter(a => {
        if (q && !a.full_name.toLowerCase().includes(q) && !a.email.toLowerCase().includes(q)) return false;
        if (soloRisk && !esRiesgo(a)) return false;
        return true;
    });

    document.getElementById("lista-alumnos").innerHTML =
        lista.length === 0
            ? "<p class='txt-vacio'>Sin resultados.</p>"
            : lista.map(a => {
                const riesgo = esRiesgo(a);
                return `
            <div class="alumno-card ${riesgo ? "alumno-riesgo" : ""}" data-id="${a.id}"
              data-nombre="${a.full_name}" data-email="${a.email}">
              <div>
                <div class="persona-nombre">${a.full_name}
                  ${riesgo ? '<span class="badge-riesgo">⚠ Riesgo</span>' : ""}
                </div>
                <div class="persona-info">${a.email}</div>
              </div>
              <div class="alumno-stats">
                <div class="alumno-stat">
                  <span class="${a.promedio !== null && a.promedio < (alumnosConfig?.min_promedio ?? 11) ? "stat-danger" : ""}">${a.promedio ?? "—"}</span>
                  <small>Promedio</small>
                </div>
                <div class="alumno-stat">
                  <span class="${a.pct_asistencia !== null && a.pct_asistencia < (alumnosConfig?.min_asistencia_pct ?? 70) ? "stat-danger" : ""}">${a.pct_asistencia !== null ? a.pct_asistencia + "%" : "—"}</span>
                  <small>Asistencia</small>
                </div>
                <div class="alumno-stat">
                  <span>${a.cursos_activos}</span>
                  <small>Cursos</small>
                </div>
              </div>
            </div>`;
            }).join("");

    document.querySelectorAll(".alumno-card[data-id]").forEach(card => {
        card.addEventListener("click", () =>
            abrirPerfilAlumno(card.dataset.id, card.dataset.nombre, card.dataset.email));
    });
}

// ── Popup Alumno ──────────────────────────────────────────────────────────────
function initPopupAlumno() {
    const popup = document.getElementById("popup-alumno");
    document.getElementById("close-popup-alumno").addEventListener("click",
        () => popup.classList.remove("active"));
    popup.addEventListener("click", e => { if (e.target === popup) popup.classList.remove("active"); });
}

async function abrirPerfilAlumno(id, nombre, email) {
    document.getElementById("pa-nombre").textContent = nombre;
    document.getElementById("pa-email").textContent = email;
    document.getElementById("pa-cursos-wrap").innerHTML = "<p class='txt-vacio'>Cargando...</p>";
    document.getElementById("pa-obs-wrap").innerHTML = "<p class='txt-vacio'>Cargando...</p>";
    // Reset subtabs
    document.querySelectorAll("#popup-alumno .subtab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll("#popup-alumno .subtab-panel").forEach(p => p.classList.remove("active"));
    document.querySelector("#popup-alumno .subtab[data-subtab='pa-cursos']").classList.add("active");
    document.getElementById("sub-pa-cursos").classList.add("active");
    document.getElementById("popup-alumno").classList.add("active");

    const d = await apiFetch(`${API}/alumnos/${id}`);
    if (!d) return;

    document.getElementById("pa-cursos-wrap").innerHTML =
        d.cursos.length === 0
            ? "<p class='txt-vacio'>Sin cursos activos.</p>"
            : `<table class="tabla-reporte"><thead><tr>
          <th>Curso</th><th>Docente</th><th>Promedio</th><th>Asistencia</th>
        </tr></thead><tbody>
        ${d.cursos.map(c => `<tr>
          <td>${c.code} — ${c.course_name}</td>
          <td>${c.docente_name}</td>
          <td class="${c.promedio !== null && c.promedio < (alumnosConfig?.min_promedio ?? 11) ? "td-danger" : ""}">${c.promedio ?? "—"}</td>
          <td class="${c.pct_asistencia !== null && c.pct_asistencia < (alumnosConfig?.min_asistencia_pct ?? 70) ? "td-danger" : ""}">${c.pct_asistencia !== null ? c.pct_asistencia + "%" : "—"}</td>
        </tr>`).join("")}
        </tbody></table>`;

    document.getElementById("pa-obs-wrap").innerHTML =
        d.observaciones.length === 0
            ? "<p class='txt-vacio'>Sin observaciones.</p>"
            : d.observaciones.map(o => `
          <div class="obs-item">
            <div class="obs-meta">${o.author_name} · <span class="badge-tipo-${o.type}">${o.type}</span> · ${fmtDate(o.created_at)}</div>
            <div>${o.content}</div>
          </div>`).join("");
}

// ── Académico ─────────────────────────────────────────────────────────────────
let periodosCache = [];
let cursosCache = [];

function initAcademico() {
    // Popup periodo
    const ppPer = document.getElementById("popup-periodo");
    document.getElementById("btn-nuevo-periodo").addEventListener("click",
        () => { ppPer.classList.add("active"); document.getElementById("msg-periodo").textContent = ""; });
    document.getElementById("close-popup-periodo").addEventListener("click",
        () => ppPer.classList.remove("active"));
    ppPer.addEventListener("click", e => { if (e.target === ppPer) ppPer.classList.remove("active"); });

    document.getElementById("btn-guardar-periodo").addEventListener("click", async () => {
        const body = {
            year: +document.getElementById("per-year").value,
            type: +document.getElementById("per-type").value,
            label: document.getElementById("per-label").value.trim(),
            starts_at: document.getElementById("per-starts").value,
            ends_at: document.getElementById("per-ends").value,
        };
        const msg = document.getElementById("msg-periodo");
        if (!body.label || !body.starts_at || !body.ends_at) { msg.textContent = "Completa todos los campos."; return; }
        const r = await apiFetch(`${API}/periodos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (r?.ok) { ppPer.classList.remove("active"); await cargarAcademico(); }
        else msg.textContent = r?.error ?? "Error al crear periodo.";
    });

    // Popup sección
    const ppSec = document.getElementById("popup-seccion");
    document.getElementById("btn-nueva-seccion").addEventListener("click", () => {
        // Poblar selects
        const selPer = document.getElementById("sec-periodo");
        selPer.innerHTML = periodosCache.map(p => `<option value="${p.id}">${p.label}${p.is_active ? " (actual)" : ""}</option>`).join("");
        const selDoc = document.getElementById("sec-docente");
        selDoc.innerHTML = "";
        apiFetch(`${API}/docentes-lista`).then(docs => {
            if (docs) docs.forEach(d => selDoc.add(new Option(d.full_name, d.id)));
        });
        document.getElementById("msg-seccion").textContent = "";
        ppSec.classList.add("active");
    });
    document.getElementById("close-popup-seccion").addEventListener("click",
        () => ppSec.classList.remove("active"));
    ppSec.addEventListener("click", e => { if (e.target === ppSec) ppSec.classList.remove("active"); });

    document.getElementById("btn-guardar-seccion").addEventListener("click", async () => {
        const courseId = document.getElementById("select-curso-secciones").value;
        const body = {
            period_id: +document.getElementById("sec-periodo").value,
            docente_id: +document.getElementById("sec-docente").value,
            section: document.getElementById("sec-label").value.trim() || "A",
        };
        const msg = document.getElementById("msg-seccion");
        const r = await apiFetch(`${API}/cursos/${courseId}/secciones`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
        });
        if (r?.ok) { ppSec.classList.remove("active"); cargarSecciones(courseId); }
        else msg.textContent = r?.error ?? "Error al crear sección.";
    });

    // Selector de curso para secciones
    document.getElementById("select-curso-secciones").addEventListener("change", e =>
        cargarSecciones(e.target.value));
}

async function cargarAcademico() {
    const [periodos, cursos] = await Promise.all([
        apiFetch(`${API}/periodos`),
        apiFetch(`${API}/cursos`),
    ]);

    if (periodos) {
        periodosCache = periodos;
        document.getElementById("lista-periodos").innerHTML = periodos.map(p => `
      <div class="periodo-card">
        <div>
          <div style="font-weight:700;font-size:15px;color:#1e293b">${p.label}
            ${p.is_active ? '<span class="badge-actual">Actual</span>' : ""}
          </div>
          <div style="font-size:13px;color:#666">${fmtDate(p.starts_at)} — ${fmtDate(p.ends_at)}</div>
        </div>
        ${!p.is_active ? `<button class="btn btn-secondary btn-activar-periodo" data-id="${p.id}"
          style="font-size:12px;padding:5px 12px">Activar</button>` : ""}
      </div>`).join("");

        document.querySelectorAll(".btn-activar-periodo").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (!confirm(`¿Activar este periodo? El actual quedará inactivo.`)) return;
                const r = await apiFetch(`${API}/periodos/${btn.dataset.id}/activar`, { method: "PATCH" });
                if (r?.ok) { await cargarAcademico(); await cargarResumen(); }
            });
        });
    }

    if (cursos) {
        cursosCache = cursos;
        const sel = document.getElementById("select-curso-secciones");
        sel.innerHTML = cursos.map(c => `<option value="${c.id}">${c.code} — ${c.name}</option>`).join("");
        if (cursos.length) cargarSecciones(cursos[0].id);
    }
}

async function cargarSecciones(courseId) {
    document.getElementById("lista-secciones").innerHTML = "<p class='txt-vacio'>Cargando...</p>";
    const secciones = await apiFetch(`${API}/cursos/${courseId}/secciones`);
    if (!secciones) return;
    document.getElementById("lista-secciones").innerHTML =
        secciones.length === 0
            ? "<p class='txt-vacio'>Sin secciones para este curso.</p>"
            : `<table class="tabla-reporte"><thead><tr>
          <th>Sección</th><th>Periodo</th><th>Docente</th><th>Inscritos</th>
        </tr></thead><tbody>
        ${secciones.map(s => `<tr>
          <td>${s.section}</td>
          <td>${s.period_label}${s.is_active ? ' <span class="badge-actual">Actual</span>' : ""}</td>
          <td>${s.docente_name}</td>
          <td>${s.inscritos}</td>
        </tr>`).join("")}
        </tbody></table>`;
}

// ── Talleres ──────────────────────────────────────────────────────────────────
let talleresData = [];
let tallerEditId = null;

function initTalleres() {
    const pp = document.getElementById("popup-taller");
    document.getElementById("btn-nuevo-taller").addEventListener("click", () => {
        tallerEditId = null;
        document.getElementById("taller-popup-titulo").textContent = "Nuevo taller";
        ["tal-title", "tal-desc", "tal-expositor", "tal-starts", "tal-ends", "tal-location"].forEach(id =>
            document.getElementById(id).value = "");
        document.getElementById("tal-capacity").value = "30";
        document.getElementById("msg-taller").textContent = "";
        pp.classList.add("active");
    });
    document.getElementById("close-popup-taller").addEventListener("click", () => pp.classList.remove("active"));
    pp.addEventListener("click", e => { if (e.target === pp) pp.classList.remove("active"); });

    document.getElementById("btn-guardar-taller").addEventListener("click", guardarTaller);

    // Popup inscritos
    const ppI = document.getElementById("popup-inscritos");
    document.getElementById("close-popup-inscritos").addEventListener("click", () => ppI.classList.remove("active"));
    ppI.addEventListener("click", e => { if (e.target === ppI) ppI.classList.remove("active"); });
}

async function guardarTaller() {
    const body = {
        title: document.getElementById("tal-title").value.trim(),
        description: document.getElementById("tal-desc").value.trim() || null,
        expositor: document.getElementById("tal-expositor").value.trim() || null,
        starts_at: document.getElementById("tal-starts").value,
        ends_at: document.getElementById("tal-ends").value,
        capacity: +document.getElementById("tal-capacity").value || 30,
        location: document.getElementById("tal-location").value.trim() || null,
    };
    const msg = document.getElementById("msg-taller");
    if (!body.title || !body.starts_at || !body.ends_at) { msg.textContent = "Completa los campos requeridos."; return; }

    const url = tallerEditId ? `${API}/talleres/${tallerEditId}` : `${API}/talleres`;
    const method = tallerEditId ? "PUT" : "POST";
    const r = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r?.ok) { document.getElementById("popup-taller").classList.remove("active"); await cargarTalleres(); }
    else msg.textContent = r?.error ?? "Error.";
}

async function cargarTalleres() {
    const data = await apiFetch(`${API}/talleres`);
    if (!data) return;
    talleresData = data;

    const prox = data.filter(t => !isPast(t.starts_at));
    const pas = data.filter(t => isPast(t.starts_at));

    const buildCard = t => `
    <div class="taller-card ${isPast(t.starts_at) ? "taller-pasado" : ""}">
      <div class="taller-info">
        <div class="taller-titulo">${t.title}</div>
        ${t.expositor ? `<div class="taller-exp">🎤 ${t.expositor}</div>` : ""}
        <div class="taller-fecha">📅 ${fmt(t.starts_at)} — ${fmt(t.ends_at)}</div>
        ${t.location ? `<div class="taller-fecha">📍 ${t.location}</div>` : ""}
        <div class="taller-fecha">👥 ${t.inscritos}/${t.capacity} inscritos</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
        <button class="btn btn-secondary btn-inscritos" data-id="${t.id}" data-titulo="${t.title}" style="font-size:12px">Ver inscritos</button>
        ${!isPast(t.starts_at) ? `
          <button class="btn btn-secondary btn-editar-taller" data-id="${t.id}" style="font-size:12px">Editar</button>
          <button class="btn btn-cancelar btn-eliminar-taller" data-id="${t.id}" style="font-size:12px">Eliminar</button>` : ""}
      </div>
    </div>`;

    document.getElementById("lista-talleres-prox").innerHTML =
        prox.length === 0 ? "<p class='txt-vacio'>Sin talleres próximos.</p>" : prox.map(buildCard).join("");
    document.getElementById("lista-talleres-pas").innerHTML =
        pas.length === 0 ? "<p class='txt-vacio'>Sin talleres pasados.</p>" : pas.map(buildCard).join("");

    // Bind botones
    document.querySelectorAll(".btn-inscritos").forEach(btn => {
        btn.addEventListener("click", async () => {
            document.getElementById("inscritos-titulo").textContent = `Inscritos — ${btn.dataset.titulo}`;
            document.getElementById("lista-inscritos-wrap").innerHTML = "<p class='txt-vacio'>Cargando...</p>";
            document.getElementById("popup-inscritos").classList.add("active");
            const rows = await apiFetch(`${API}/talleres/${btn.dataset.id}/inscritos`);
            document.getElementById("lista-inscritos-wrap").innerHTML =
                !rows || rows.length === 0
                    ? "<p class='txt-vacio'>Sin inscritos aún.</p>"
                    : `<table class="tabla-reporte"><thead><tr><th>Nombre</th><th>Email</th><th>Inscrito</th></tr></thead>
             <tbody>${rows.map(r => `<tr><td>${r.full_name}</td><td>${r.email}</td><td>${fmtDate(r.enrolled_at)}</td></tr>`).join("")}</tbody></table>`;
        });
    });

    document.querySelectorAll(".btn-editar-taller").forEach(btn => {
        btn.addEventListener("click", () => {
            const t = talleresData.find(x => x.id == btn.dataset.id);
            if (!t) return;
            tallerEditId = t.id;
            document.getElementById("taller-popup-titulo").textContent = "Editar taller";
            document.getElementById("tal-title").value = t.title;
            document.getElementById("tal-desc").value = t.description ?? "";
            document.getElementById("tal-expositor").value = t.expositor ?? "";
            document.getElementById("tal-starts").value = t.starts_at?.slice(0, 16);
            document.getElementById("tal-ends").value = t.ends_at?.slice(0, 16);
            document.getElementById("tal-capacity").value = t.capacity;
            document.getElementById("tal-location").value = t.location ?? "";
            document.getElementById("msg-taller").textContent = "";
            document.getElementById("popup-taller").classList.add("active");
        });
    });

    document.querySelectorAll(".btn-eliminar-taller").forEach(btn => {
        btn.addEventListener("click", async () => {
            if (!confirm("¿Eliminar este taller?")) return;
            const r = await apiFetch(`${API}/talleres/${btn.dataset.id}`, { method: "DELETE" });
            if (r?.ok) await cargarTalleres();
            else alert(r?.error ?? "Error");
        });
    });
}

// ── Reportes ──────────────────────────────────────────────────────────────────
function initReportes() { }

async function cargarReportes() {
    const [alertas, rendimiento, asistencia, servicios] = await Promise.all([
        apiFetch(`${API}/reportes/alertas`),
        apiFetch(`${API}/reportes/rendimiento`),
        apiFetch(`${API}/reportes/asistencia`),
        apiFetch(`${API}/reportes/servicios`),
    ]);

    if (alertas) renderAlertas(alertas);
    if (rendimiento) renderRendimiento(rendimiento);
    if (asistencia) renderAsistencia(asistencia);
    if (servicios) renderServicios(servicios);
}

function renderAlertas(d) {
    const cfg = d.config;
    document.getElementById("alerta-config").innerHTML = `
    <div class="config-bar">
      <span>Umbrales de alerta:</span>
      <label>Promedio mínimo
        <input type="number" id="cfg-promedio" value="${cfg.min_promedio}" min="0" max="20" step="0.5" style="width:60px">
      </label>
      <label>Asistencia mínima
        <input type="number" id="cfg-asistencia" value="${cfg.min_asistencia_pct}" min="0" max="100" style="width:60px">%
      </label>
      <button class="btn btn-primary" id="btn-guardar-config" style="padding:5px 14px;font-size:13px">Guardar</button>
    </div>`;

    document.getElementById("btn-guardar-config").addEventListener("click", async () => {
        const r = await apiFetch(`${API}/settings`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                min_promedio: +document.getElementById("cfg-promedio").value,
                min_asistencia_pct: +document.getElementById("cfg-asistencia").value,
            })
        });
        if (r?.ok) { await cargarReportes(); await cargarResumen(); await cargarAlumnos(); }
    });

    document.getElementById("lista-alertas").innerHTML =
        d.alertas.length === 0
            ? "<p class='txt-vacio'>✅ Sin alumnos en situación de riesgo.</p>"
            : `<table class="tabla-reporte"><thead><tr>
          <th>Alumno</th><th>Curso</th><th>Promedio</th><th>Asistencia</th>
        </tr></thead><tbody>
        ${d.alertas.map(a => `<tr>
          <td>${a.full_name}</td>
          <td>${a.course_code} — ${a.course_name}</td>
          <td class="${a.promedio !== null && a.promedio < cfg.min_promedio ? "td-danger" : ""}">${a.promedio ?? "—"}</td>
          <td class="${a.pct_asistencia !== null && a.pct_asistencia < cfg.min_asistencia_pct ? "td-danger" : ""}">${a.pct_asistencia !== null ? a.pct_asistencia + "%" : "—"}</td>
        </tr>`).join("")}
        </tbody></table>`;
}

function renderRendimiento(data) {
    document.getElementById("tabla-rendimiento").innerHTML =
        data.length === 0
            ? "<p class='txt-vacio'>Sin datos de rendimiento.</p>"
            : `<table class="tabla-reporte"><thead><tr>
          <th>Curso</th><th>Sección</th><th>Docente</th><th>Inscritos</th><th>Promedio</th><th>Aprobados</th><th>Desaprobados</th>
        </tr></thead><tbody>
        ${data.map(c => `<tr>
          <td>${c.code} — ${c.course_name}</td>
          <td>${c.section}</td>
          <td>${c.docente_name}</td>
          <td>${c.inscritos}</td>
          <td>${c.promedio ?? "—"}</td>
          <td style="color:#27ae60;font-weight:600">${c.aprobados}</td>
          <td style="color:#e74c3c;font-weight:600">${c.desaprobados}</td>
        </tr>`).join("")}
        </tbody></table>`;
}

function renderAsistencia(data) {
    document.getElementById("tabla-asistencia").innerHTML =
        data.length === 0
            ? "<p class='txt-vacio'>Sin datos de asistencia.</p>"
            : `<table class="tabla-reporte"><thead><tr>
          <th>Curso</th><th>Sección</th><th>Presentes</th><th>Tardanzas</th><th>Ausentes</th><th>% Asistencia</th>
        </tr></thead><tbody>
        ${data.map(c => `<tr>
          <td>${c.code} — ${c.course_name}</td>
          <td>${c.section}</td>
          <td>${c.presentes}</td>
          <td>${c.tardanzas}</td>
          <td>${c.ausentes}</td>
          <td class="${c.pct_asistencia < 70 ? "td-danger" : ""}">${c.pct_asistencia ?? "—"}%</td>
        </tr>`).join("")}
        </tbody></table>`;
}

function renderServicios(d) {
    document.getElementById("rpt-servicios-wrap").innerHTML = `
    <div class="servicios-stats">
      <div class="svc-stat"><span>${d.asesorias}</span>Asesorías reservadas</div>
      <div class="svc-stat"><span>${d.citas}</span>Citas psicológicas</div>
      <div class="svc-stat"><span>${d.talleres}</span>Inscripciones a talleres</div>
    </div>
    <h4 style="margin:16px 0 8px;color:#1e293b">Top talleres por inscripción</h4>
    <table class="tabla-reporte"><thead><tr>
      <th>Taller</th><th>Expositor</th><th>Inscritos</th><th>Capacidad</th>
    </tr></thead><tbody>
    ${d.topTalleres.map(t => `<tr>
      <td>${t.title}</td>
      <td>${t.expositor ?? "—"}</td>
      <td>${t.inscritos}</td>
      <td>${t.capacity}</td>
    </tr>`).join("")}
    </tbody></table>`;
}