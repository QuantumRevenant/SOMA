const API = "/api/psicologo";

async function apiFetch(url, opts = {}) {
    const res = await fetch(url, { credentials: "include", ...opts });
    if (res.status === 401) { window.location.replace("/"); return null; }
    return res.json();
}

function fmt(dt) {
    if (!dt) return "—";
    return new Date(dt).toLocaleString("es-PE", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

function fmtFecha(dt) {
    if (!dt) return "—";
    return new Date(dt).toLocaleDateString("es-PE", {
        weekday: "short", day: "2-digit", month: "short"
    });
}

function isPast(dt) { return new Date(dt) < new Date(); }
function isWithin24h(dt) { return (new Date(dt) - new Date()) < 24 * 60 * 60 * 1000; }

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

    document.querySelectorAll(".tab[data-tab]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab[data-tab]").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(btn.dataset.tab).classList.add("active");
        });
    });

    initPopupConfirm();
    initEstudiantes();
    initCitas();
    initCalendario();
    initPopupPerfil();
    initPopupNuevaCita();
    initPopupCancelar();
    initPopupEditarCita();

    await Promise.all([
        cargarEstudiantes(),
        cargarCitas(),
        cargarCalendario(),
    ]);
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

// ── Estudiantes ───────────────────────────────────────────────────────────────
let estudiantesData = null;

function initEstudiantes() {
    const input = document.getElementById("input-buscar");
    const dropdown = document.getElementById("search-results");

    let debounce;
    input.addEventListener("input", () => {
        clearTimeout(debounce);
        const q = input.value.trim();
        if (q.length < 2) { dropdown.style.display = "none"; return; }
        debounce = setTimeout(async () => {
            const data = await apiFetch(`${API}/estudiantes?q=${encodeURIComponent(q)}`);
            if (!data?.general?.length) { dropdown.style.display = "none"; return; }
            dropdown.innerHTML = data.general.map(e => `
                <div class="dropdown-item" data-id="${e.id}" data-nombre="${e.full_name}" data-email="${e.email}">
                    <strong>${e.full_name}</strong>
                    <span style="font-size:12px;color:#666">${e.email}</span>
                </div>`).join("");
            dropdown.style.display = "block";
        }, 300);
    });

    dropdown.addEventListener("click", e => {
        const item = e.target.closest(".dropdown-item");
        if (!item) return;
        input.value = "";
        dropdown.style.display = "none";
        abrirPerfilEstudiante(item.dataset.id, item.dataset.nombre, item.dataset.email);
    });

    document.addEventListener("click", e => {
        if (!e.target.closest(".search-bar")) dropdown.style.display = "none";
    });
}

async function cargarEstudiantes() {
    const data = await apiFetch(`${API}/estudiantes`);
    if (!data) return;
    estudiantesData = data;

    const proxWrap = document.getElementById("proxima-cita-wrap");
    if (data.proxima) {
        proxWrap.style.display = "";
        document.getElementById("proxima-cita-card").innerHTML = `
            <div class="estudiante-card estudiante-proxima" data-id="${data.proxima.id}"
                data-nombre="${data.proxima.full_name}" data-email="${data.proxima.email}">
                <div>
                    <div class="est-nombre">${data.proxima.full_name}</div>
                    <div class="est-info">${data.proxima.email}</div>
                </div>
                <div style="text-align:right">
                    <div style="font-size:13px;font-weight:700;color:#ff6b6b">${fmt(data.proxima.proxima_cita)}</div>
                    <div style="font-size:11px;color:#999">Próxima cita</div>
                </div>
            </div>`;
    } else {
        proxWrap.style.display = "none";
    }

    const lista = document.getElementById("lista-historial");
    if (data.conHistorial.length === 0) {
        lista.innerHTML = "<p style='color:#999'>No hay estudiantes atendidos aún.</p>";
        return;
    }
    lista.innerHTML = data.conHistorial.map(e => `
        <div class="estudiante-card" data-id="${e.id}"
            data-nombre="${e.full_name}" data-email="${e.email}">
            <div>
                <div class="est-nombre">${e.full_name}</div>
                <div class="est-info">${e.email}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
                <div style="font-size:12px;color:#666">Última cita: ${fmtFecha(e.ultima_cita)}</div>
                <div style="font-size:12px;color:#999">${e.total_citas} cita${e.total_citas !== 1 ? "s" : ""}</div>
            </div>
        </div>`).join("");

    document.querySelectorAll(".estudiante-card[data-id]").forEach(card => {
        card.addEventListener("click", () =>
            abrirPerfilEstudiante(card.dataset.id, card.dataset.nombre, card.dataset.email));
    });
}

// ── Popup Perfil ──────────────────────────────────────────────────────────────
let perfilActual = null;

function initPopupPerfil() {
    const popup = document.getElementById("popup-perfil");
    document.getElementById("close-popup-perfil").addEventListener("click",
        () => popup.classList.remove("active"));
    popup.addEventListener("click", e => {
        if (e.target === popup) popup.classList.remove("active");
    });

    document.querySelectorAll(".tab-popup[data-ptab]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-popup").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".content-popup").forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(`panel-${btn.dataset.ptab}`).classList.add("active");
        });
    });

    document.getElementById("btn-add-obs").addEventListener("click", () => {
        document.getElementById("form-obs").style.display = "";
        document.getElementById("btn-add-obs").style.display = "none";
        document.getElementById("textarea-obs").focus();
    });
    document.getElementById("btn-cancelar-obs").addEventListener("click", () => {
        document.getElementById("form-obs").style.display = "none";
        document.getElementById("btn-add-obs").style.display = "";
        document.getElementById("textarea-obs").value = "";
    });
    document.getElementById("btn-guardar-obs").addEventListener("click", async () => {
        const content = document.getElementById("textarea-obs").value.trim();
        if (!content || !perfilActual) return;
        const res = await apiFetch(`${API}/estudiantes/${perfilActual.id}/observaciones`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
        });
        if (res?.ok) {
            document.getElementById("textarea-obs").value = "";
            document.getElementById("form-obs").style.display = "none";
            document.getElementById("btn-add-obs").style.display = "";
            await cargarObservaciones(perfilActual.id);
        }
    });
}

async function abrirPerfilEstudiante(id, nombre, email) {
    perfilActual = { id, nombre, email };
    document.getElementById("perfil-nombre").textContent = nombre;
    document.getElementById("perfil-email").textContent = email;
    document.getElementById("lista-obs").innerHTML = "<p style='color:#999'>Cargando...</p>";
    document.getElementById("lista-citas-hist").innerHTML = "<p style='color:#999'>Cargando...</p>";

    document.querySelectorAll(".tab-popup").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".content-popup").forEach(p => p.classList.remove("active"));
    document.querySelector(".tab-popup[data-ptab='obs']").classList.add("active");
    document.getElementById("panel-obs").classList.add("active");
    document.getElementById("form-obs").style.display = "none";
    document.getElementById("btn-add-obs").style.display = "";

    document.getElementById("popup-perfil").classList.add("active");

    const data = await apiFetch(`${API}/estudiantes/${id}`);
    if (!data) return;
    renderObservaciones(data.observaciones);
    renderCitasHistorial(data.citas);
}

async function cargarObservaciones(studentId) {
    const data = await apiFetch(`${API}/estudiantes/${studentId}`);
    if (!data) return;
    renderObservaciones(data.observaciones);
}

function renderObservaciones(obs) {
    const wrap = document.getElementById("lista-obs");
    if (obs.length === 0) {
        wrap.innerHTML = "<p style='color:#999'>Sin observaciones aún.</p>";
        return;
    }
    wrap.innerHTML = obs.map(o => `
        <div class="obs-item" data-id="${o.id}">
            <div class="obs-fecha">${fmt(o.created_at)}${o.updated_at ? " (editado)" : ""}</div>
            <div class="obs-content" id="obs-content-${o.id}">${o.content}</div>
            <div class="obs-edit-form" id="obs-form-${o.id}" style="display:none">
                <textarea rows="2" style="width:100%;padding:6px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px">${o.content}</textarea>
                <div style="display:flex;gap:6px;margin-top:6px">
                    <button class="btn btn-primary btn-save-obs" data-id="${o.id}" style="font-size:12px;padding:4px 10px">Guardar</button>
                    <button class="btn btn-secondary btn-cancel-edit" data-id="${o.id}" style="font-size:12px;padding:4px 10px">Cancelar</button>
                </div>
            </div>
            <div style="display:flex;gap:6px;margin-top:6px">
                <button class="btn btn-secondary btn-edit-obs" data-id="${o.id}" style="font-size:12px;padding:4px 10px">Editar</button>
                <button class="btn btn-cancelar btn-del-obs" data-id="${o.id}" style="font-size:12px;padding:4px 10px">Eliminar</button>
            </div>
        </div>`).join("");

    wrap.querySelectorAll(".btn-edit-obs").forEach(btn => {
        btn.addEventListener("click", () => {
            document.getElementById(`obs-content-${btn.dataset.id}`).style.display = "none";
            document.getElementById(`obs-form-${btn.dataset.id}`).style.display = "";
        });
    });
    wrap.querySelectorAll(".btn-cancel-edit").forEach(btn => {
        btn.addEventListener("click", () => {
            document.getElementById(`obs-content-${btn.dataset.id}`).style.display = "";
            document.getElementById(`obs-form-${btn.dataset.id}`).style.display = "none";
        });
    });
    wrap.querySelectorAll(".btn-save-obs").forEach(btn => {
        btn.addEventListener("click", async () => {
            const ta = document.querySelector(`#obs-form-${btn.dataset.id} textarea`);
            const res = await apiFetch(`${API}/observaciones/${btn.dataset.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: ta.value.trim() }),
            });
            if (res?.ok) await cargarObservaciones(perfilActual.id);
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
                    if (res?.ok) await cargarObservaciones(perfilActual.id);
                },
            });
        });
    });
}

function renderCitasHistorial(citas) {
    const wrap = document.getElementById("lista-citas-hist");
    if (citas.length === 0) {
        wrap.innerHTML = "<p style='color:#999'>Sin historial de citas.</p>";
        return;
    }
    wrap.innerHTML = citas.map(c => `
        <div class="obs-item" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
                <div style="font-weight:600;color:#1e293b">${fmt(c.starts_at)}</div>
                ${c.location ? `<div style="font-size:12px;color:#666">📍 ${c.location}</div>` : ""}
            </div>
            <span class="badge-estado badge-${c.status}">${c.status}</span>
        </div>`).join("");
}

// ── Citas ─────────────────────────────────────────────────────────────────────
let todasLasCitas = [];
let filtroActivo = "proximas";

function initCitas() {
    document.querySelectorAll(".citas-filtros .toggle-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".citas-filtros .toggle-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            filtroActivo = btn.dataset.filtro;
            renderCitas();
        });
    });
}

async function cargarCitas() {
    const data = await apiFetch(`${API}/citas`);
    if (!data) return;
    todasLasCitas = data;
    renderCitas();
}

function renderCitas() {
    const wrap = document.getElementById("lista-citas");
    let lista = todasLasCitas;

    if (filtroActivo === "proximas") lista = lista.filter(c => !isPast(c.starts_at));
    if (filtroActivo === "pasadas") lista = lista.filter(c => isPast(c.starts_at));
    lista = [...lista].sort((a, b) =>
        filtroActivo === "pasadas"
            ? new Date(b.starts_at) - new Date(a.starts_at)
            : new Date(a.starts_at) - new Date(b.starts_at)
    );

    if (lista.length === 0) {
        wrap.innerHTML = "<p style='color:#999'>No hay citas para mostrar.</p>";
        return;
    }

    wrap.innerHTML = lista.map(c => {
        const pasado = isPast(c.starts_at);
        const bloq24 = isWithin24h(c.starts_at) && !pasado;
        const reservada = !!c.reserva;
        return `
        <div class="cita-card ${pasado ? "cita-pasada" : ""}">
            <div class="cita-info">
                <div class="cita-fecha">📅 ${fmt(c.starts_at)} — ${fmt(c.ends_at)}</div>
                ${c.location ? `<div class="cita-lugar">📍 ${c.location}</div>` : ""}
                ${reservada
                ? `<div class="cita-alumno">👤 ${c.reserva.student_name}
                        ${bloq24 ? '<span class="badge-24h">24h</span>' : ""}
                       </div>`
                : `<div class="cita-libre">Libre</div>`}
            </div>
            ${!pasado ? `
            <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
                <button class="btn btn-secondary btn-editar-cita"
                    data-id="${c.id}"
                    data-starts="${c.starts_at}"
                    data-ends="${c.ends_at}"
                    data-location="${c.location ?? ""}"
                    data-reservada="${reservada ? 1 : 0}"
                    style="font-size:13px">✏️ Editar</button>
                <button class="btn ${reservada ? "btn-cancelar" : "btn-secondary"} btn-gestionar-cita"
                    data-id="${c.id}"
                    data-reservada="${reservada ? 1 : 0}"
                    data-nombre="${c.reserva?.student_name ?? ""}"
                    data-fecha="${fmt(c.starts_at)}"
                    style="font-size:13px">
                    ${reservada ? "Cancelar cita" : "Eliminar slot"}
                </button>
            </div>` : ""}
        </div>`;
    }).join("");

    wrap.querySelectorAll(".btn-editar-cita").forEach(btn => {
        btn.addEventListener("click", () => abrirEditarCita(btn.dataset));
    });

    wrap.querySelectorAll(".btn-gestionar-cita").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.dataset.reservada === "1") {
                abrirPopupCancelar(btn.dataset.id, btn.dataset.nombre, btn.dataset.fecha);
            } else {
                pedirConfirm({
                    titulo: "Eliminar slot",
                    msg: "¿Eliminar este slot libre? Esta acción no se puede deshacer.",
                    icono: "🗑️",
                    labelOk: "Sí, eliminar",
                    esDestructivo: true,
                    onConfirm: () => eliminarSlotDirecto(btn.dataset.id),
                });
            }
        });
    });
}

// ── Popup Editar Cita ─────────────────────────────────────────────────────────
let citaEditId = null;

function initPopupEditarCita() {
    const popup = document.getElementById("popup-editar-cita");
    document.getElementById("close-popup-editar-cita").addEventListener("click",
        () => popup.classList.remove("active"));
    popup.addEventListener("click", e => {
        if (e.target === popup) popup.classList.remove("active");
    });
    document.getElementById("btn-confirmar-editar-cita").addEventListener("click", async () => {
        const starts_at = document.getElementById("edit-cita-starts").value;
        const ends_at = document.getElementById("edit-cita-ends").value;
        const location = document.getElementById("edit-cita-location").value.trim();
        const msg = document.getElementById("msg-editar-cita");
        if (!starts_at || !ends_at) { msg.textContent = "Completa las fechas."; return; }
        if (new Date(ends_at) <= new Date(starts_at)) { msg.textContent = "El fin debe ser posterior al inicio."; return; }
        const res = await apiFetch(`${API}/citas/${citaEditId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ starts_at, ends_at, location: location || null }),
        });
        if (res?.ok) {
            popup.classList.remove("active");
            await cargarCitas();
            await cargarCalendario();
        } else {
            msg.textContent = res?.error ?? "Error al guardar.";
        }
    });
}

function abrirEditarCita({ id, starts, ends, location, reservada }) {
    citaEditId = id;
    document.getElementById("edit-cita-starts").value = (starts ?? "").slice(0, 16);
    document.getElementById("edit-cita-ends").value = (ends ?? "").slice(0, 16);
    document.getElementById("edit-cita-location").value = location ?? "";
    document.getElementById("msg-editar-cita").textContent = "";
    document.getElementById("msg-editar-cita-reserva").style.display =
        reservada === "1" ? "" : "none";
    document.getElementById("popup-editar-cita").classList.add("active");
}

// ── Popup Nueva Cita ──────────────────────────────────────────────────────────
function initPopupNuevaCita() {
    const popup = document.getElementById("popup-nueva-cita");
    document.getElementById("btn-nueva-cita").addEventListener("click", () => {
        popup.classList.add("active");
        document.getElementById("msg-nueva-cita").textContent = "";
    });
    document.getElementById("close-popup-cita").addEventListener("click",
        () => popup.classList.remove("active"));
    popup.addEventListener("click", e => {
        if (e.target === popup) popup.classList.remove("active");
    });

    document.getElementById("btn-confirmar-cita").addEventListener("click", async () => {
        const starts_at = document.getElementById("input-starts").value;
        const ends_at = document.getElementById("input-ends").value;
        const location = document.getElementById("input-location").value.trim();
        const msg = document.getElementById("msg-nueva-cita");
        if (!starts_at || !ends_at) { msg.textContent = "Completa las fechas."; return; }
        if (new Date(ends_at) <= new Date(starts_at)) { msg.textContent = "El fin debe ser posterior al inicio."; return; }
        const res = await apiFetch(`${API}/citas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ starts_at, ends_at, location: location || null }),
        });
        if (res?.ok) {
            popup.classList.remove("active");
            document.getElementById("input-starts").value = "";
            document.getElementById("input-ends").value = "";
            document.getElementById("input-location").value = "";
            await cargarCitas();
            await cargarCalendario();
        } else {
            msg.textContent = res?.error ?? "Error al crear slot.";
        }
    });
}

// ── Popup Cancelar Cita ───────────────────────────────────────────────────────
let slotACancelar = null;

function initPopupCancelar() {
    const popup = document.getElementById("popup-cancelar");
    document.getElementById("close-popup-cancelar").addEventListener("click",
        () => popup.classList.remove("active"));
    document.getElementById("btn-abortar-cancelar").addEventListener("click",
        () => popup.classList.remove("active"));
    popup.addEventListener("click", e => {
        if (e.target === popup) popup.classList.remove("active");
    });

    document.getElementById("btn-confirmar-cancelar").addEventListener("click", async () => {
        const motivo = document.getElementById("textarea-motivo").value.trim();
        const msg = document.getElementById("msg-cancelar");
        if (!motivo) { msg.textContent = "El motivo es obligatorio."; return; }
        const res = await apiFetch(`${API}/citas/${slotACancelar}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ motivo }),
        });
        if (res?.ok) {
            popup.classList.remove("active");
            document.getElementById("textarea-motivo").value = "";
            await cargarCitas();
            await cargarCalendario();
        } else {
            msg.textContent = res?.error ?? "Error al cancelar.";
        }
    });
}

function abrirPopupCancelar(slotId, nombreAlumno, fecha) {
    slotACancelar = slotId;
    document.getElementById("cancelar-info").textContent =
        `Vas a cancelar la cita de ${nombreAlumno} del ${fecha}. Se notificará al estudiante.`;
    document.getElementById("textarea-motivo").value = "";
    document.getElementById("msg-cancelar").textContent = "";
    document.getElementById("popup-cancelar").classList.add("active");
}

async function eliminarSlotDirecto(slotId) {
    const res = await apiFetch(`${API}/citas/${slotId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
    });
    if (res?.ok) { await cargarCitas(); await cargarCalendario(); }
    else pedirConfirm({ titulo: "Error", msg: res?.error ?? "Error inesperado.", icono: "❌", labelOk: "Entendido", onConfirm: () => { } });
}

// ── Calendario ────────────────────────────────────────────────────────────────
let semanaBase = new Date();

function initCalendario() {
    document.getElementById("btn-semana-ant").addEventListener("click", () => {
        semanaBase.setDate(semanaBase.getDate() - 7);
        cargarCalendario();
    });
    document.getElementById("btn-semana-sig").addEventListener("click", () => {
        semanaBase.setDate(semanaBase.getDate() + 7);
        cargarCalendario();
    });
}

async function cargarCalendario() {
    const isoSemana = semanaBase.toISOString().slice(0, 10);
    const data = await apiFetch(`${API}/calendario?semana=${isoSemana}`);
    if (!data) return;
    renderCalendario(data);
}

function renderCalendario(data) {
    const dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const inicio = new Date(data.semana_inicio + "T00:00:00");
    const fechas = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(inicio);
        d.setDate(inicio.getDate() + i);
        return d;
    });

    document.getElementById("cal-titulo").textContent =
        `${fechas[0].toLocaleDateString("es-PE", { day: "2-digit", month: "short" })} — ` +
        `${fechas[6].toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}`;

    const porDia = Array.from({ length: 7 }, () => []);
    data.slots.forEach(s => {
        const d = new Date(s.starts_at);
        const dow = (d.getDay() + 6) % 7;
        porDia[dow].push(s);
    });

    const grid = document.getElementById("cal-grid");
    grid.innerHTML = `
    <div class="cal-table">
        <div class="cal-header">
            ${fechas.map((f, i) => `
                <div class="cal-th ${f.toDateString() === new Date().toDateString() ? "cal-hoy" : ""}">
                    <div>${dias[i]}</div>
                    <div style="font-size:18px;font-weight:700">${f.getDate()}</div>
                </div>`).join("")}
        </div>
        <div class="cal-body">
            ${porDia.map((slots, i) => `
                <div class="cal-col ${fechas[i].toDateString() === new Date().toDateString() ? "cal-col-hoy" : ""}">
                    ${slots.length === 0
            ? `<div class="cal-empty">—</div>`
            : slots.map(s => `
                            <div class="cal-slot ${s.booking_id ? "cal-slot-reservado" : "cal-slot-libre"}">
                                <div style="font-weight:700;font-size:12px">
                                    ${new Date(s.starts_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                                    — ${new Date(s.ends_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                                </div>
                                ${s.booking_id
                    ? `<div style="font-size:11px;margin-top:2px">👤 ${s.student_name}</div>`
                    : `<div style="font-size:11px;margin-top:2px;opacity:.7">Libre</div>`}
                            </div>`).join("")}
                </div>`).join("")}
        </div>
    </div>`;
}