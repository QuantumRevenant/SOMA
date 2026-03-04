const API = "/api/docente";
let seccionesCache = [];

async function apiFetch(url, opts = {}) {
    const res = await fetch(url, { credentials: "include", ...opts });
    if (res.status === 401) { window.location.replace("/"); return null; }
    return res.json();
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {

    // Obtener usuario desde el backend (la cookie HttpOnly no es legible por JS)
    const payload = await apiFetch("/api/me");
    if (!payload) return; // apiFetch ya redirige a / si 401

    // Datos del usuario en UI
    document.getElementById("user-name").textContent = payload.full_name;
    document.getElementById("card-name").textContent = payload.full_name;
    document.getElementById("card-email").textContent = payload.email;
    document.getElementById("user-avatar").textContent =
        payload.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

    // Logout
    document.getElementById("btn-logout").addEventListener("click", async () => {
        await fetch("/api/logout", { method: "POST", credentials: "include" });
        window.location.replace("/");
    });

    // Tabs
    document.addEventListener("click", (e) => {
        const tab = e.target.closest(".items ul li");
        if (!tab) return;
        document.querySelectorAll(".items ul li").forEach(li =>
            li.classList.toggle("active", li === tab));
        document.querySelectorAll(".tab-content").forEach(s =>
            s.classList.toggle("show", s.dataset.content === tab.dataset.tab));
    });

    await cargarSecciones();
    initNotas();
    initObservaciones();
    initPopupAsistencia();
});

// ── Secciones / Programaciones ────────────────────────────────────────────────
async function cargarSecciones(periodId = "") {
    const url = periodId ? `${API}/secciones?period_id=${periodId}` : `${API}/secciones`;
    const data = await apiFetch(url);
    if (!data) return;

    seccionesCache = data.secciones;

    // Selector de periodos
    const selPeriodo = document.getElementById("select-periodo");
    if (selPeriodo.options.length === 1) {
        data.periodos.forEach(p => {
            const opt = new Option(p.label + (p.is_active ? " (activo)" : ""), p.id);
            selPeriodo.add(opt);
        });
        selPeriodo.addEventListener("change", e => cargarSecciones(e.target.value));
    }

    // Tabla programaciones
    const tbody = document.getElementById("tbody-secciones");
    tbody.innerHTML = data.secciones.length === 0
        ? `<tr><td colspan="5">No hay secciones para este periodo.</td></tr>`
        : data.secciones.map(s => `
        <tr>
          <td>${s.code}</td>
          <td>${s.course_name}</td>
          <td>${s.section}</td>
          <td>${s.period_label}</td>
          <td>${s.total_alumnos}</td>
        </tr>`).join("");

    poblarSelectSecciones("select-seccion-notas");
    poblarSelectSecciones("select-seccion-obs");
    poblarSelectAsistencia();
}

function poblarSelectSecciones(selectId) {
    const sel = document.getElementById(selectId);
    const val = sel.value;
    sel.innerHTML = `<option value="">Seleccione una sección</option>`;
    seccionesCache.forEach(s => {
        sel.add(new Option(`${s.code} ${s.section} — ${s.period_label}`, s.id));
    });
    sel.value = val;
}

// ── Asistencia ────────────────────────────────────────────────────────────────
let seccionAsistenciaActual = null;

function poblarSelectAsistencia() {
    const lista = document.getElementById("lista-asistencia");
    lista.innerHTML = seccionesCache.map(s => `
    <div class="course-card">
      <div class="course-header">
        <div class="course-code">${s.code} — ${s.period_label}</div>
        <div class="course-title">${s.course_name} · Sección ${s.section}</div>
      </div>
      <div class="course-body">
        <div class="course-actions">
          <button class="btn btn-primary open-popup" data-seccion="${s.id}">Registrar</button>
        </div>
      </div>
    </div>`).join("") || "<p>No hay secciones disponibles.</p>";
}

function initPopupAsistencia() {
    const popup = document.getElementById("popup-asistencia");
    const closeBtn = document.getElementById("close-popup");

    document.addEventListener("click", async (e) => {
        const btn = e.target.closest(".open-popup[data-seccion]");
        if (!btn) return;
        seccionAsistenciaActual = btn.dataset.seccion;
        const alumnos = await apiFetch(`${API}/secciones/${seccionAsistenciaActual}/alumnos`);
        if (!alumnos) return;

        document.getElementById("tbody-popup-asistencia").innerHTML =
            alumnos.map(a => `
        <tr class="center">
          <td>${a.full_name}</td>
          <td>
            <select data-enrollment="${a.enrollment_id}">
              <option value="">—</option>
              <option value="1">✅ Presente</option>
              <option value="2">❌ Ausente</option>
            </select>
          </td>
        </tr>`).join("");

        popup.style.display = "flex";
    });

    closeBtn.addEventListener("click", () => popup.style.display = "none");

    document.getElementById("btn-guardar-asistencia").addEventListener("click", () => {
        alert("Asistencia guardada (pendiente conectar endpoint)");
        popup.style.display = "none";
    });
}

// ── Notas ─────────────────────────────────────────────────────────────────────
function initNotas() {
    const sel = document.getElementById("select-seccion-notas");
    sel.addEventListener("change", () => cargarNotas(sel.value));
}

async function cargarNotas(seccionId) {
    const wrap = document.getElementById("tabla-notas-wrap");
    if (!seccionId) { wrap.style.display = "none"; return; }

    const [data, alumnos] = await Promise.all([
        apiFetch(`${API}/secciones/${seccionId}/evaluaciones`),
        apiFetch(`${API}/secciones/${seccionId}/alumnos`),
    ]);
    if (!data || !alumnos) return;

    const { evaluaciones, notas } = data;

    document.getElementById("thead-notas").innerHTML =
        `<tr><th>Alumno</th>${evaluaciones.map(ev =>
            `<th>${ev.name}<br><small>${ev.weight}%</small></th>`).join("")}</tr>`;

    const notaMap = {};
    notas.forEach(n => {
        if (!notaMap[n.enrollment_id]) notaMap[n.enrollment_id] = {};
        notaMap[n.enrollment_id][n.evaluation_id] = n.score;
    });

    document.getElementById("tbody-notas").innerHTML = alumnos.map(a => `
    <tr>
      <td>${a.full_name}</td>
      ${evaluaciones.map(ev => {
        const score = notaMap[a.enrollment_id]?.[ev.id] ?? "";
        return `<td><input type="number" min="0" max="20" step="0.5"
          value="${score}" style="width:60px"
          data-enrollment="${a.enrollment_id}"
          data-evaluation="${ev.id}"></td>`;
    }).join("")}
    </tr>`).join("");

    wrap.style.display = "block";
}

document.addEventListener("click", async (e) => {
    if (e.target.id !== "btn-guardar-notas") return;
    const inputs = document.querySelectorAll("#tbody-notas input[type=number]");
    const promises = [...inputs].map(inp =>
        apiFetch("/api/docente/notas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                enrollment_id: inp.dataset.enrollment,
                evaluation_id: inp.dataset.evaluation,
                score: inp.value === "" ? null : parseFloat(inp.value),
            }),
        })
    );
    await Promise.all(promises);
    alert("Notas guardadas");
});

// ── Observaciones ─────────────────────────────────────────────────────────────
function initObservaciones() {
    const selSeccion = document.getElementById("select-seccion-obs");
    const selAlumno = document.getElementById("select-alumno-obs");

    selSeccion.addEventListener("change", async () => {
        selAlumno.innerHTML = `<option value="">Seleccione un alumno</option>`;
        selAlumno.disabled = true;
        if (!selSeccion.value) return;

        const alumnos = await apiFetch(`${API}/secciones/${selSeccion.value}/alumnos`);
        if (!alumnos) return;
        alumnos.forEach(a => selAlumno.add(new Option(a.full_name, a.id)));
        selAlumno.disabled = false;
    });

    document.getElementById("btn-guardar-obs").addEventListener("click", async () => {
        const student_id = selAlumno.value;
        const content = document.getElementById("textarea-obs").value.trim();
        const msg = document.getElementById("msg-obs");

        if (!student_id || !content) {
            msg.textContent = "Seleccione un alumno y escriba la observación.";
            return;
        }

        const res = await apiFetch(`${API}/observaciones`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id, content }),
        });

        if (res?.ok) {
            msg.textContent = "Observación guardada.";
            document.getElementById("textarea-obs").value = "";
        } else {
            msg.textContent = res?.error ?? "Error al guardar.";
        }
    });
}