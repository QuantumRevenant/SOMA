const API = "/api/docente";
let seccionesCache = [];

async function apiFetch(url, opts = {}) {
    const res = await fetch(url, { credentials: "include", ...opts });
    if (res.status === 401) { window.location.replace("/"); return null; }
    return res.json();
}

function fmt(dt) {
    return new Date(dt).toLocaleString("es-PE", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

function fmtDate(d) {
    const str = typeof d === "string" ? d : d.toISOString().split("T")[0];
    const [y, m, day] = str.split("-");
    return `${day}/${m}/${y}`;
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    const payload = await apiFetch("/api/me");
    if (!payload) return;

    document.getElementById("user-name").textContent = payload.full_name;
    document.getElementById("user-avatar").textContent =
        payload.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

    document.getElementById("btn-logout").addEventListener("click", async () => {
        await fetch("/api/logout", { method: "POST", credentials: "include" });
        window.location.replace("/");
    });

    // Tabs — ahora buttons.tab con data-tab / sections con id
    document.querySelectorAll(".tab[data-tab]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab[data-tab]").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(btn.dataset.tab).classList.add("active");
        });
    });

    initPopupConfirm();
    initPopupNuevaAsesoria();
    initPopupEditarAsesoria();
    initAsistencia();
    initNotas();
    initObservaciones();

    await cargarSecciones();
    cargarAsesorias();
});

// ── Popup de confirmación ─────────────────────────────────────────────────────
let _confirmFn = null;

function initPopupConfirm() {
    document.getElementById("btn-confirm-ok").addEventListener("click", () => {
        const fn = _confirmFn;
        cerrarConfirm();
        if (fn) fn();
    });
    document.getElementById("btn-confirm-cancel").addEventListener("click", cerrarConfirm);
    document.getElementById("popup-confirm").addEventListener("click", e => {
        if (e.target === document.getElementById("popup-confirm")) cerrarConfirm();
    });
}

function cerrarConfirm() {
    document.getElementById("popup-confirm").classList.remove("active");
    _confirmFn = null;
}

function pedirConfirm({ titulo, msg, icono = "❓", labelOk = "Confirmar", labelCancel = "Volver", esDestructivo = false, onConfirm }) {
    document.getElementById("confirm-titulo").textContent = titulo;
    document.getElementById("confirm-msg").textContent = msg;
    document.getElementById("confirm-icon").textContent = icono;
    document.getElementById("btn-confirm-cancel").textContent = labelCancel;
    const btnOk = document.getElementById("btn-confirm-ok");
    btnOk.textContent = labelOk;
    btnOk.className = `btn ${esDestructivo ? "btn-cancelar" : "btn-primary"}`;
    _confirmFn = onConfirm;
    document.getElementById("popup-confirm").classList.add("active");
}

// ── Secciones / Programaciones ────────────────────────────────────────────────
async function cargarSecciones(periodId = "") {
    const url = periodId ? `${API}/secciones?period_id=${periodId}` : `${API}/secciones`;
    const data = await apiFetch(url);
    if (!data) return;
    seccionesCache = data.secciones;

    const selPeriodo = document.getElementById("select-periodo");
    if (selPeriodo.options.length === 1) {
        data.periodos.forEach(p =>
            selPeriodo.add(new Option(p.label + (p.is_active ? " (activo)" : ""), p.id)));
        selPeriodo.addEventListener("change", e => cargarSecciones(e.target.value));
    }

    document.getElementById("tbody-secciones").innerHTML =
        data.secciones.length === 0
            ? `<tr><td colspan="5">No hay secciones para este periodo.</td></tr>`
            : data.secciones.map(s => `
                <tr>
                    <td>${s.code}</td><td>${s.course_name}</td>
                    <td>${s.section}</td><td>${s.period_label}</td><td>${s.total_alumnos}</td>
                </tr>`).join("");

    poblarSelectSecciones("select-seccion-asist");
    poblarSelectSecciones("select-seccion-notas");
    poblarSelectSecciones("select-seccion-obs");
}

function poblarSelectSecciones(id) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = `<option value="">Seleccione una sección</option>`;
    seccionesCache.forEach(s =>
        sel.add(new Option(`${s.code} ${s.section} — ${s.period_label}`, s.id)));
    sel.value = val;
}

// ── Asistencia ────────────────────────────────────────────────────────────────
function initAsistencia() {
    const selSeccion = document.getElementById("select-seccion-asist");
    const selVista = document.getElementById("select-vista-asist");
    const inputFecha = document.getElementById("input-fecha-asist");
    const selAlumno = document.getElementById("select-alumno-asist");

    selSeccion.addEventListener("change", async () => {
        selAlumno.innerHTML = `<option value="">Todos los alumnos</option>`;
        selAlumno.disabled = true;
        if (!selSeccion.value) return;
        const alumnos = await apiFetch(`${API}/secciones/${selSeccion.value}/alumnos`);
        if (!alumnos) return;
        alumnos.forEach(a => selAlumno.add(new Option(a.full_name, a.id)));
        selAlumno.disabled = false;
        renderAsistencia();
    });
    selVista.addEventListener("change", renderAsistencia);
    inputFecha.addEventListener("change", renderAsistencia);
    selAlumno.addEventListener("change", renderAsistencia);

    const popup = document.getElementById("popup-asistencia");
    const closeBtn = document.getElementById("close-popup-asistencia");

    document.getElementById("btn-abrir-registro").addEventListener("click", async () => {
        const seccionId = selSeccion.value;
        if (!seccionId) {
            pedirConfirm({ titulo: "Aviso", msg: "Seleccione una sección primero.", icono: "⚠️", labelOk: "Entendido", onConfirm: () => { } });
            return;
        }
        const today = new Date().toISOString().split("T")[0];
        const [alumnos, asistHoy] = await Promise.all([
            apiFetch(`${API}/secciones/${seccionId}/alumnos`),
            apiFetch(`${API}/secciones/${seccionId}/asistencia?date=${today}`),
        ]);
        if (!alumnos) return;
        const asistMap = {};
        (asistHoy || []).forEach(a => asistMap[a.enrollment_id] = a.status);
        document.getElementById("popup-fecha").textContent = fmtDate(today);
        document.getElementById("tbody-popup-asistencia").innerHTML =
            alumnos.map(a => `
                <tr>
                    <td>${a.full_name}</td>
                    <td>
                        <select data-enrollment="${a.enrollment_id}">
                            <option value="">—</option>
                            <option value="presente" ${asistMap[a.enrollment_id] === "presente" ? "selected" : ""}>✅ Presente</option>
                            <option value="ausente"  ${asistMap[a.enrollment_id] === "ausente" ? "selected" : ""}>❌ Ausente</option>
                            <option value="tardanza" ${asistMap[a.enrollment_id] === "tardanza" ? "selected" : ""}>⏰ Tardanza</option>
                        </select>
                    </td>
                </tr>`).join("");
        popup.classList.add("active");
    });

    closeBtn.addEventListener("click", () => popup.classList.remove("active"));
    popup.addEventListener("click", e => { if (e.target === popup) popup.classList.remove("active"); });

    document.getElementById("btn-guardar-asistencia").addEventListener("click", async () => {
        const seccionId = selSeccion.value;
        const today = new Date().toISOString().split("T")[0];
        const registros = [...document.querySelectorAll("#tbody-popup-asistencia select")]
            .filter(s => s.value !== "")
            .map(s => ({ enrollment_id: s.dataset.enrollment, status: s.value }));
        if (registros.length === 0) {
            pedirConfirm({ titulo: "Aviso", msg: "Seleccione al menos un estado.", icono: "⚠️", labelOk: "Entendido", onConfirm: () => { } });
            return;
        }
        const res = await apiFetch(`${API}/asistencia`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ section_id: seccionId, date: today, registros }),
        });
        if (res?.ok) {
            popup.classList.remove("active");
            renderAsistencia();
        } else {
            pedirConfirm({ titulo: "Error", msg: res?.error ?? "Error al guardar.", icono: "❌", labelOk: "Entendido", onConfirm: () => { } });
        }
    });
}

async function renderAsistencia() {
    const seccionId = document.getElementById("select-seccion-asist").value;
    const vista = document.getElementById("select-vista-asist").value;
    const fecha = document.getElementById("input-fecha-asist").value;
    const wrap = document.getElementById("tabla-asistencia-wrap");
    if (!seccionId) { wrap.innerHTML = ""; return; }

    const url = fecha
        ? `${API}/secciones/${seccionId}/asistencia?date=${fecha}`
        : `${API}/secciones/${seccionId}/asistencia`;
    const rows = await apiFetch(url);
    if (!rows) return;

    if (vista === "fecha") {
        const byDate = {};
        rows.forEach(r => { if (!byDate[r.date]) byDate[r.date] = []; byDate[r.date].push(r); });
        wrap.innerHTML = Object.entries(byDate).map(([date, registros]) => `
            <div style="margin-bottom:16px">
                <strong>${fmtDate(date)}</strong>
                <table class="table" style="margin-top:8px">
                    <thead class="header-table"><tr><th>Alumno</th><th>Estado</th></tr></thead>
                    <tbody class="body-table">
                        ${registros.map(r => `<tr><td>${r.full_name}</td><td>${estadoBadge(r.status)}</td></tr>`).join("")}
                    </tbody>
                </table>
            </div>`).join("") || "<p style='color:#999'>No hay registros.</p>";
        return;
    }

    const byAlumno = {};
    rows.forEach(r => { if (!byAlumno[r.full_name]) byAlumno[r.full_name] = []; byAlumno[r.full_name].push(r); });
    wrap.innerHTML = Object.entries(byAlumno).map(([nombre, registros]) => `
        <div style="margin-bottom:16px">
            <strong>${nombre}</strong>
            <table class="table" style="margin-top:8px">
                <thead class="header-table"><tr><th>Fecha</th><th>Estado</th></tr></thead>
                <tbody class="body-table">
                    ${registros.map(r => `<tr><td>${fmtDate(r.date)}</td><td>${estadoBadge(r.status)}</td></tr>`).join("")}
                </tbody>
            </table>
        </div>`).join("") || "<p style='color:#999'>No hay registros.</p>";
}

function estadoBadge(status) {
    const map = { presente: "✅ Presente", ausente: "❌ Ausente", tardanza: "⏰ Tardanza" };
    return map[status] ?? status;
}

// ── Notas ─────────────────────────────────────────────────────────────────────
function initNotas() {
    document.getElementById("select-seccion-notas")
        .addEventListener("change", e => cargarNotas(e.target.value));
}

async function cargarNotas(seccionId) {
    const wrap = document.getElementById("notas-wrap");
    if (!seccionId) { wrap.style.display = "none"; return; }
    const [data, alumnos, plantilla] = await Promise.all([
        apiFetch(`${API}/secciones/${seccionId}/evaluaciones`),
        apiFetch(`${API}/secciones/${seccionId}/alumnos`),
        apiFetch(`${API}/secciones/${seccionId}/plantilla`),
    ]);
    if (!data || !alumnos) return;
    const { evaluaciones, notas } = data;
    const sumaActual = evaluaciones.reduce((acc, e) => acc + parseFloat(e.weight), 0);

    document.getElementById("panel-evaluaciones").innerHTML = `
        <div style="margin-bottom:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <strong>Evaluaciones (total peso: <span id="suma-pesos">${sumaActual}</span>%)</strong>
            <button class="btn btn-secondary" id="btn-from-plantilla" style="flex:none;padding:6px 10px"
                ${plantilla.length === 0 ? "disabled title='Sin plantilla definida'" : ""}>
                + Desde plantilla
            </button>
            <button class="btn btn-primary" id="btn-nueva-eval" style="flex:none;padding:6px 10px">+ Nueva</button>
        </div>
        <div id="lista-evaluaciones">
            ${evaluaciones.map(ev => rowEvaluacion(ev)).join("")}
        </div>
        <div id="form-nueva-eval" style="display:none;margin-top:12px">
            <input id="new-eval-name" placeholder="Nombre evaluación" style="padding:6px;border:1px solid #ccc;border-radius:4px;margin-right:8px">
            <input id="new-eval-weight" type="number" min="1" max="100" placeholder="Peso %" style="width:80px;padding:6px;border:1px solid #ccc;border-radius:4px;margin-right:8px">
            <button class="btn btn-primary" id="btn-confirmar-eval" style="padding:6px 12px">Guardar</button>
            <button class="btn btn-secondary" id="btn-cancelar-eval" style="padding:6px 12px">Cancelar</button>
        </div>
        <div id="select-plantilla-wrap" style="display:none;margin-top:8px">
            <select id="select-plantilla">
                <option value="">Seleccione evaluación de plantilla</option>
                ${plantilla.map(p => `<option value="${p.id}" data-name="${p.name}" data-weight="${p.weight}">${p.name} (${p.weight}%)</option>`).join("")}
            </select>
            <button class="btn btn-primary" id="btn-confirmar-plantilla" style="padding:6px 12px;margin-top:6px">Agregar</button>
        </div>`;

    wrap.style.display = "block";
    bindEvaluacionEvents(seccionId);
    renderTablaNotas(evaluaciones, alumnos, notas);
}

function rowEvaluacion(ev) {
    return `
    <div class="eval-row" data-id="${ev.id}">
        <span class="eval-name" style="flex:1">${ev.name}</span>
        <span class="eval-weight" style="width:60px;text-align:right">${ev.weight}%</span>
        <button class="btn btn-secondary btn-edit-eval" data-id="${ev.id}" style="padding:4px 8px;font-size:12px">✏️</button>
        <button class="btn btn-secondary btn-del-eval" data-id="${ev.id}" style="padding:4px 8px;font-size:12px">🗑️</button>
    </div>`;
}

function bindEvaluacionEvents(seccionId) {
    document.getElementById("btn-nueva-eval").addEventListener("click", () => {
        document.getElementById("form-nueva-eval").style.display = "flex";
        document.getElementById("select-plantilla-wrap").style.display = "none";
    });
    document.getElementById("btn-cancelar-eval").addEventListener("click", () => {
        document.getElementById("form-nueva-eval").style.display = "none";
    });
    document.getElementById("btn-confirmar-eval").addEventListener("click", async () => {
        const name = document.getElementById("new-eval-name").value.trim();
        const weight = document.getElementById("new-eval-weight").value;
        if (!name || !weight) {
            pedirConfirm({ titulo: "Aviso", msg: "Complete nombre y peso.", icono: "⚠️", labelOk: "Entendido", onConfirm: () => { } });
            return;
        }
        const res = await apiFetch(`${API}/secciones/${seccionId}/evaluaciones`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, weight: parseFloat(weight) }),
        });
        if (res?.ok) cargarNotas(seccionId);
        else pedirConfirm({ titulo: "Error", msg: res?.error ?? "Error.", icono: "❌", labelOk: "Entendido", onConfirm: () => { } });
    });
    document.getElementById("btn-from-plantilla")?.addEventListener("click", () => {
        document.getElementById("select-plantilla-wrap").style.display = "block";
        document.getElementById("form-nueva-eval").style.display = "none";
    });
    document.getElementById("btn-confirmar-plantilla")?.addEventListener("click", async () => {
        const sel = document.getElementById("select-plantilla");
        const opt = sel.selectedOptions[0];
        if (!opt?.value) {
            pedirConfirm({ titulo: "Aviso", msg: "Seleccione una evaluación.", icono: "⚠️", labelOk: "Entendido", onConfirm: () => { } });
            return;
        }
        const res = await apiFetch(`${API}/secciones/${seccionId}/evaluaciones`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: opt.dataset.name, weight: parseFloat(opt.dataset.weight), template_id: parseInt(opt.value) }),
        });
        if (res?.ok) cargarNotas(seccionId);
        else pedirConfirm({ titulo: "Error", msg: res?.error ?? "Error.", icono: "❌", labelOk: "Entendido", onConfirm: () => { } });
    });
    document.getElementById("lista-evaluaciones").addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        if (!id) return;
        if (e.target.matches(".btn-del-eval")) {
            pedirConfirm({
                titulo: "Eliminar evaluación",
                msg: "¿Eliminar esta evaluación y todas sus notas? Esta acción no se puede deshacer.",
                icono: "🗑️",
                labelOk: "Sí, eliminar",
                esDestructivo: true,
                onConfirm: async () => {
                    const res = await apiFetch(`${API}/evaluaciones/${id}`, { method: "DELETE" });
                    if (res?.ok) cargarNotas(seccionId);
                    else pedirConfirm({ titulo: "Error", msg: res?.error ?? "Error.", icono: "❌", labelOk: "Entendido", onConfirm: () => { } });
                },
            });
            return;
        }
        if (e.target.matches(".btn-edit-eval")) {
            const row = e.target.closest(".eval-row");
            const name = row.querySelector(".eval-name").textContent;
            const weight = parseFloat(row.querySelector(".eval-weight").textContent);
            const newName = prompt("Nuevo nombre:", name);
            const newWeight = parseFloat(prompt("Nuevo peso (%):", weight));
            if (!newName || isNaN(newWeight)) return;
            const res = await apiFetch(`${API}/evaluaciones/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName, weight: newWeight }),
            });
            if (res?.ok) cargarNotas(seccionId);
            else pedirConfirm({ titulo: "Error", msg: res?.error ?? "Error.", icono: "❌", labelOk: "Entendido", onConfirm: () => { } });
        }
    });
}

function renderTablaNotas(evaluaciones, alumnos, notas) {
    const notaMap = {};
    notas.forEach(n => {
        if (!notaMap[n.enrollment_id]) notaMap[n.enrollment_id] = {};
        notaMap[n.enrollment_id][n.evaluation_id] = n.score;
    });
    document.getElementById("thead-notas").innerHTML =
        `<tr><th>Alumno</th>${evaluaciones.map(ev =>
            `<th>${ev.name}<br><small>${ev.weight}%</small></th>`).join("")}</tr>`;
    document.getElementById("tbody-notas").innerHTML = alumnos.map(a => `
        <tr>
            <td>${a.full_name}</td>
            ${evaluaciones.map(ev => {
        const score = notaMap[a.enrollment_id]?.[ev.id] ?? "";
        return `<td><input type="number" min="0" max="20" step="0.5" value="${score}"
                    style="width:60px" data-enrollment="${a.enrollment_id}" data-evaluation="${ev.id}"></td>`;
    }).join("")}
        </tr>`).join("");
}

document.addEventListener("click", async (e) => {
    if (e.target.id !== "btn-guardar-notas") return;
    const inputs = document.querySelectorAll("#tbody-notas input[type=number]");
    await Promise.all([...inputs].map(inp =>
        apiFetch(`${API}/notas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                enrollment_id: inp.dataset.enrollment,
                evaluation_id: inp.dataset.evaluation,
                score: inp.value === "" ? null : parseFloat(inp.value),
            }),
        })
    ));
    pedirConfirm({ titulo: "Listo", msg: "Notas guardadas correctamente.", icono: "✅", labelOk: "Cerrar", onConfirm: () => { } });
});

// ── Observaciones ─────────────────────────────────────────────────────────────
function initObservaciones() {
    const selSeccion = document.getElementById("select-seccion-obs");
    const selAlumno = document.getElementById("select-alumno-obs");

    selSeccion.addEventListener("change", async () => {
        selAlumno.innerHTML = `<option value="">Seleccione un alumno</option>`;
        selAlumno.disabled = true;
        document.getElementById("obs-contenido").innerHTML = "";
        if (!selSeccion.value) return;
        const alumnos = await apiFetch(`${API}/secciones/${selSeccion.value}/alumnos`);
        if (!alumnos) return;
        alumnos.forEach(a => selAlumno.add(new Option(a.full_name, a.id)));
        selAlumno.disabled = false;
    });

    selAlumno.addEventListener("change", () => {
        if (selAlumno.value) cargarObservaciones(selAlumno.value);
        else document.getElementById("obs-contenido").innerHTML = "";
    });

    document.getElementById("btn-guardar-obs").addEventListener("click", async () => {
        const student_id = selAlumno.value;
        const content = document.getElementById("textarea-obs").value.trim();
        const msg = document.getElementById("msg-obs");
        if (!student_id || !content) { msg.textContent = "Seleccione alumno y escriba la observación."; return; }
        const res = await apiFetch(`${API}/observaciones`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id, content }),
        });
        if (res?.ok) {
            document.getElementById("textarea-obs").value = "";
            msg.textContent = "Observación guardada.";
            cargarObservaciones(student_id);
        } else {
            msg.textContent = res?.error ?? "Error.";
        }
    });
}

async function cargarObservaciones(studentId) {
    const data = await apiFetch(`${API}/alumnos/${studentId}/observaciones`);
    if (!data) return;
    const wrap = document.getElementById("obs-contenido");

    const docenteHtml = data.docente.length === 0
        ? "<p style='color:#999'>Sin observaciones de docentes.</p>"
        : data.docente.map(o => {
            const esMia = o.author_id === data.myId;
            return `
            <div class="obs-item" data-id="${o.id}">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                    <strong>${o.author_name}</strong>
                    <small style="color:#999">${fmt(o.created_at)}${o.updated_at ? " (editada)" : ""}</small>
                </div>
                <p class="obs-text">${o.content}</p>
                ${esMia ? `
                <div style="display:flex;gap:8px;margin-top:8px">
                    <button class="btn btn-secondary btn-edit-obs" data-id="${o.id}" style="padding:4px 10px;font-size:12px">✏️ Editar</button>
                    <button class="btn btn-cancelar btn-del-obs" data-id="${o.id}" style="padding:4px 10px;font-size:12px">🗑️ Eliminar</button>
                </div>` : ""}
            </div>`;
        }).join("");

    const psicHtml = data.psicologo.length === 0
        ? "<p style='color:#999'>Sin observaciones del psicólogo.</p>"
        : data.psicologo.map(o => `
            <div style="border:1px solid #f3c6c6;border-radius:8px;padding:12px;margin-bottom:8px;background:#fff9f9">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                    <strong>${o.author_name}</strong>
                    <small style="color:#999">${fmt(o.created_at)}</small>
                </div>
                <p>${o.content}</p>
            </div>`).join("");

    wrap.innerHTML = `
        <h4 style="margin:0 0 10px;color:#1e293b">Observaciones de Docentes</h4>${docenteHtml}
        <h4 style="margin:16px 0 10px;color:#c0392b">Observaciones Psicológicas</h4>${psicHtml}`;

    wrap.querySelectorAll(".btn-edit-obs").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            const item = btn.closest(".obs-item");
            const current = item.querySelector(".obs-text").textContent;
            const nuevo = prompt("Editar observación:", current);
            if (!nuevo || nuevo === current) return;
            const res = await apiFetch(`${API}/observaciones/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: nuevo }),
            });
            if (res?.ok) cargarObservaciones(studentId);
            else pedirConfirm({ titulo: "Error", msg: res?.error ?? "Error.", icono: "❌", labelOk: "Entendido", onConfirm: () => { } });
        });
    });

    wrap.querySelectorAll(".btn-del-obs").forEach(btn => {
        btn.addEventListener("click", () => {
            pedirConfirm({
                titulo: "Eliminar observación",
                msg: "¿Seguro que quieres eliminar esta observación?",
                icono: "🗑️",
                labelOk: "Sí, eliminar",
                esDestructivo: true,
                onConfirm: async () => {
                    const res = await apiFetch(`${API}/observaciones/${btn.dataset.id}`, { method: "DELETE" });
                    if (res?.ok) cargarObservaciones(studentId);
                },
            });
        });
    });
}

// ── Asesorías ─────────────────────────────────────────────────────────────────
function initPopupNuevaAsesoria() {
    const popup = document.getElementById("popup-nueva-asesoria");
    document.getElementById("btn-nueva-asesoria").addEventListener("click", () => {
        document.getElementById("msg-nueva-asesoria").textContent = "";
        popup.classList.add("active");
    });
    document.getElementById("close-popup-nueva-asesoria").addEventListener("click",
        () => popup.classList.remove("active"));
    popup.addEventListener("click", e => {
        if (e.target === popup) popup.classList.remove("active");
    });
    document.getElementById("btn-guardar-asesoria").addEventListener("click", async () => {
        const starts_at = document.getElementById("asesoria-inicio").value;
        const ends_at = document.getElementById("asesoria-fin").value;
        const capacity = document.getElementById("asesoria-cupo").value;
        const location = document.getElementById("asesoria-lugar").value;
        const msg = document.getElementById("msg-nueva-asesoria");
        if (!starts_at || !ends_at) { msg.textContent = "Complete fecha de inicio y fin."; return; }
        if (new Date(ends_at) <= new Date(starts_at)) { msg.textContent = "El fin debe ser posterior al inicio."; return; }
        const res = await apiFetch(`${API}/asesorias`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ starts_at, ends_at, capacity: parseInt(capacity) || 5, location }),
        });
        if (res?.ok) {
            popup.classList.remove("active");
            document.getElementById("asesoria-inicio").value = "";
            document.getElementById("asesoria-fin").value = "";
            document.getElementById("asesoria-lugar").value = "";
            cargarAsesorias();
        } else {
            msg.textContent = res?.error ?? "Error.";
        }
    });
}

async function cargarAsesorias() {
    const rows = await apiFetch(`${API}/asesorias`);
    if (!rows) return;
    const wrap = document.getElementById("lista-asesorias");
    wrap.innerHTML = rows.length === 0
        ? "<p style='color:#999'>No hay asesorías creadas.</p>"
        : rows.map(s => `
            <div style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
                <div>
                    <div style="font-weight:700;font-size:14px;color:#1e293b">📅 ${fmt(s.starts_at)} — ${fmt(s.ends_at)}</div>
                    ${s.location ? `<div style="font-size:13px;color:#555;margin-top:2px">📍 ${s.location}</div>` : ""}
                    <div style="font-size:13px;color:#555;margin-top:4px">
                        Cupo: ${s.reservas}/${s.capacity}
                        ${s.reservas > 0 ? '<span style="color:#f39c12;font-size:12px;margin-left:6px">⚠️ Con reservas</span>' : ""}
                    </div>
                </div>
                <div style="display:flex;gap:8px;flex-shrink:0">
                    <button class="btn btn-secondary btn-edit-asesoria"
                        data-id="${s.id}" data-starts="${s.starts_at}" data-ends="${s.ends_at}"
                        data-capacity="${s.capacity}" data-location="${s.location ?? ""}"
                        data-reservas="${s.reservas}" style="font-size:13px">✏️ Editar</button>
                    <button class="btn btn-secondary btn-del-asesoria" data-id="${s.id}"
                        style="font-size:13px">🗑️ Eliminar</button>
                </div>
            </div>`).join("");

    wrap.querySelectorAll(".btn-del-asesoria").forEach(btn => {
        btn.addEventListener("click", () => {
            pedirConfirm({
                titulo: "Eliminar asesoría",
                msg: "¿Eliminar esta asesoría? Los alumnos inscritos perderán su reserva.",
                icono: "🗑️",
                labelOk: "Sí, eliminar",
                esDestructivo: true,
                onConfirm: async () => {
                    const res = await apiFetch(`${API}/asesorias/${btn.dataset.id}`, { method: "DELETE" });
                    if (res?.ok) cargarAsesorias();
                    else pedirConfirm({ titulo: "Error", msg: res?.error ?? "Error.", icono: "❌", labelOk: "Entendido", onConfirm: () => { } });
                },
            });
        });
    });

    wrap.querySelectorAll(".btn-edit-asesoria").forEach(btn => {
        btn.addEventListener("click", () => abrirEditarAsesoria(btn.dataset));
    });
}

let asesoriaEditId = null;

function initPopupEditarAsesoria() {
    const popup = document.getElementById("popup-editar-asesoria");
    document.getElementById("close-popup-editar-asesoria").addEventListener("click",
        () => popup.classList.remove("active"));
    popup.addEventListener("click", e => {
        if (e.target === popup) popup.classList.remove("active");
    });
    document.getElementById("btn-confirmar-editar-asesoria").addEventListener("click", async () => {
        const starts_at = document.getElementById("edit-asesoria-inicio").value;
        const ends_at = document.getElementById("edit-asesoria-fin").value;
        const capacity = document.getElementById("edit-asesoria-cupo").value;
        const location = document.getElementById("edit-asesoria-lugar").value;
        const msg = document.getElementById("msg-editar-asesoria");
        if (!starts_at || !ends_at) { msg.textContent = "Completa las fechas."; return; }
        if (new Date(ends_at) <= new Date(starts_at)) { msg.textContent = "El fin debe ser posterior al inicio."; return; }
        const res = await apiFetch(`${API}/asesorias/${asesoriaEditId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ starts_at, ends_at, capacity: parseInt(capacity) || 5, location }),
        });
        if (res?.ok) {
            popup.classList.remove("active");
            cargarAsesorias();
        } else {
            msg.textContent = res?.error ?? "Error al guardar.";
        }
    });
}

function abrirEditarAsesoria({ id, starts, ends, capacity, location, reservas }) {
    asesoriaEditId = id;
    document.getElementById("edit-asesoria-inicio").value = (starts ?? "").slice(0, 16);
    document.getElementById("edit-asesoria-fin").value = (ends ?? "").slice(0, 16);
    document.getElementById("edit-asesoria-cupo").value = capacity ?? 5;
    document.getElementById("edit-asesoria-lugar").value = location ?? "";
    document.getElementById("msg-editar-asesoria").textContent = "";
    document.getElementById("msg-editar-asesoria-reservas").style.display =
        parseInt(reservas) > 0 ? "" : "none";
    document.getElementById("popup-editar-asesoria").classList.add("active");
}