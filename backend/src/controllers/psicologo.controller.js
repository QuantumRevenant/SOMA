import pool from "../config/db.js";

const HASH = '$2a$10$M0cKElr.7X9wonS1Q8yVw.cnzLxbbNQZDQ6.vVy6590/0fG0dkWNu';

// ── Estudiantes ───────────────────────────────────────────────────────────────

// GET /api/psicologo/estudiantes?q=texto
// Devuelve: próxima cita, con historial, todos (búsqueda)
export async function getEstudiantes(req, res) {
    const psicId = req.user.id;
    const q = req.query.q?.trim() || "";

    try {
        // 1. Próxima cita confirmada del psicólogo
        const [proxima] = await pool.query(`
      SELECT
        u.id, u.full_name, u.email,
        s.starts_at AS proxima_cita
      FROM slot_bookings sb
      JOIN slots s  ON s.id  = sb.slot_id
      JOIN users u  ON u.id  = sb.student_id
      WHERE s.owner_id = ? AND s.type = 'cita_psicologica'
        AND sb.status = 'confirmada'
        AND s.starts_at > NOW()
      ORDER BY s.starts_at ASC
      LIMIT 1
    `, [psicId]);

        // 2. Alumnos con al menos una cita (pasada o futura), ordenados por última cita
        const [conHistorial] = await pool.query(`
      SELECT
        u.id, u.full_name, u.email,
        MAX(s.starts_at) AS ultima_cita,
        COUNT(sb.id)     AS total_citas
      FROM slot_bookings sb
      JOIN slots s ON s.id  = sb.slot_id
      JOIN users u ON u.id  = sb.student_id
      WHERE s.owner_id = ? AND s.type = 'cita_psicologica'
        AND sb.status != 'cancelada'
      GROUP BY u.id
      ORDER BY ultima_cita DESC
    `, [psicId]);

        // 3. Búsqueda general (todos los estudiantes)
        let general = [];
        if (q.length >= 2) {
            const [rows] = await pool.query(`
        SELECT id, full_name, email
        FROM users
        WHERE role = 'estudiante' AND (full_name LIKE ? OR email LIKE ?)
        ORDER BY full_name
        LIMIT 20
      `, [`%${q}%`, `%${q}%`]);
            general = rows;
        }

        res.json({ proxima: proxima[0] ?? null, conHistorial, general });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener estudiantes" });
    }
}

// GET /api/psicologo/estudiantes/:id
// Perfil del estudiante: datos, observaciones del psicólogo, historial de citas
export async function getPerfilEstudiante(req, res) {
    const psicId = req.user.id;
    const studentId = req.params.id;

    try {
        const [[usuario]] = await pool.query(
            "SELECT id, full_name, email FROM users WHERE id = ? AND role = 'estudiante'",
            [studentId]
        );
        if (!usuario) return res.status(404).json({ error: "Estudiante no encontrado" });

        const [observaciones] = await pool.query(`
      SELECT id, content, created_at, updated_at
      FROM observations
      WHERE author_id = ? AND student_id = ? AND type = 'psicologo'
      ORDER BY created_at DESC
    `, [psicId, studentId]);

        const [citas] = await pool.query(`
      SELECT
        s.id AS slot_id,
        s.starts_at, s.ends_at, s.location,
        sb.status
      FROM slot_bookings sb
      JOIN slots s ON s.id = sb.slot_id
      WHERE sb.student_id = ? AND s.owner_id = ? AND s.type = 'cita_psicologica'
      ORDER BY s.starts_at DESC
    `, [studentId, psicId]);

        res.json({ usuario, observaciones, citas });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener perfil" });
    }
}

// POST /api/psicologo/estudiantes/:id/observaciones
export async function addObservacion(req, res) {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Contenido requerido" });

    try {
        await pool.query(`
      INSERT INTO observations (author_id, student_id, type, content)
      VALUES (?, ?, 'psicologo', ?)
    `, [req.user.id, req.params.id, content.trim()]);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al guardar observación" });
    }
}

// PUT /api/psicologo/observaciones/:id
export async function editObservacion(req, res) {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Contenido requerido" });

    try {
        const [r] = await pool.query(
            "UPDATE observations SET content = ? WHERE id = ? AND author_id = ? AND type = 'psicologo'",
            [content.trim(), req.params.id, req.user.id]
        );
        if (r.affectedRows === 0) return res.status(403).json({ error: "No autorizado" });
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al editar observación" });
    }
}

// DELETE /api/psicologo/observaciones/:id
export async function deleteObservacion(req, res) {
    try {
        const [r] = await pool.query(
            "DELETE FROM observations WHERE id = ? AND author_id = ? AND type = 'psicologo'",
            [req.params.id, req.user.id]
        );
        if (r.affectedRows === 0) return res.status(403).json({ error: "No autorizado" });
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al eliminar observación" });
    }
}

// ── Citas / Slots ─────────────────────────────────────────────────────────────

// GET /api/psicologo/citas
// Todos los slots del psicólogo con sus reservas
export async function getMisCitas(req, res) {
    try {
        const [slots] = await pool.query(`
      SELECT
        s.id, s.starts_at, s.ends_at, s.location,
        sb.id        AS booking_id,
        sb.student_id,
        sb.status    AS booking_status,
        u.full_name  AS student_name,
        u.email      AS student_email
      FROM slots s
      LEFT JOIN slot_bookings sb ON sb.slot_id = s.id AND sb.status != 'cancelada'
      LEFT JOIN users u          ON u.id = sb.student_id
      WHERE s.owner_id = ? AND s.type = 'cita_psicologica'
      ORDER BY s.starts_at DESC
    `, [req.user.id]);

        // Agrupar: un slot puede tener una reserva (capacity=1 para citas)
        const mapa = {};
        slots.forEach(r => {
            if (!mapa[r.id]) {
                mapa[r.id] = {
                    id: r.id, starts_at: r.starts_at, ends_at: r.ends_at,
                    location: r.location, reserva: null
                };
            }
            if (r.booking_id) {
                mapa[r.id].reserva = {
                    booking_id: r.booking_id,
                    student_id: r.student_id,
                    student_name: r.student_name,
                    student_email: r.student_email,
                    status: r.booking_status
                };
            }
        });

        res.json(Object.values(mapa));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener citas" });
    }
}

// POST /api/psicologo/citas { starts_at, ends_at, location }
export async function crearSlot(req, res) {
    const { starts_at, ends_at, location } = req.body;
    if (!starts_at || !ends_at) return res.status(400).json({ error: "Fecha requerida" });

    try {
        const [r] = await pool.query(`
      INSERT INTO slots (owner_id, type, starts_at, ends_at, capacity, location)
      VALUES (?, 'cita_psicologica', ?, ?, 1, ?)
    `, [req.user.id, starts_at, ends_at, location ?? null]);
        res.json({ ok: true, id: r.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al crear slot" });
    }
}

// DELETE /api/psicologo/citas/:id
// Si tiene reserva: requiere motivo, guarda observación + notificación
export async function editarSlot(req, res) {
    const { starts_at, ends_at, location, capacity } = req.body;
    if (!starts_at || !ends_at)
        return res.status(400).json({ error: "Fecha de inicio y fin requeridas" });

    try {
        const [[slot]] = await pool.query(
            "SELECT id FROM slots WHERE id = ? AND owner_id = ? AND type = 'cita_psicologica'",
            [req.params.id, req.user.id]
        );
        if (!slot) return res.status(403).json({ error: "No autorizado" });

        await pool.query(
            "UPDATE slots SET starts_at = ?, ends_at = ?, location = ?, capacity = ? WHERE id = ?",
            [starts_at, ends_at, location ?? null, capacity ?? 1, req.params.id]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al editar slot" });
    }
}

export async function eliminarSlot(req, res) {
    const { motivo } = req.body;
    const psicId = req.user.id;
    const slotId = req.params.id;

    try {
        // Verificar que el slot es suyo
        const [[slot]] = await pool.query(
            "SELECT id, starts_at FROM slots WHERE id = ? AND owner_id = ? AND type = 'cita_psicologica'",
            [slotId, psicId]
        );
        if (!slot) return res.status(404).json({ error: "Slot no encontrado" });

        // Verificar si tiene reserva activa
        const [[booking]] = await pool.query(
            "SELECT id, student_id FROM slot_bookings WHERE slot_id = ? AND status != 'cancelada'",
            [slotId]
        );

        if (booking) {
            if (!motivo?.trim()) {
                return res.status(400).json({ error: "Se requiere un motivo para cancelar una cita reservada" });
            }

            // Cancelar la reserva
            await pool.query(
                "UPDATE slot_bookings SET status = 'cancelada' WHERE id = ?",
                [booking.id]
            );

            // Observación al alumno
            await pool.query(`
        INSERT INTO observations (author_id, student_id, type, content)
        VALUES (?, ?, 'psicologo', ?)
      `, [psicId, booking.student_id,
                `Cita del ${new Date(slot.starts_at).toLocaleString("es-PE")} cancelada. Motivo: ${motivo.trim()}`
            ]);

            // Notificación (preparada para uso futuro)
            await pool.query(`
        INSERT INTO notifications (user_id, type, title, body)
        VALUES (?, 'cita_cancelada', 'Cita psicológica cancelada', ?)
      `, [booking.student_id,
            `Tu cita del ${new Date(slot.starts_at).toLocaleString("es-PE")} fue cancelada. Motivo: ${motivo.trim()}`
            ]);
        }

        // Eliminar el slot
        await pool.query("DELETE FROM slots WHERE id = ?", [slotId]);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al eliminar slot" });
    }
}

// ── Calendario ────────────────────────────────────────────────────────────────

// GET /api/psicologo/calendario?semana=YYYY-MM-DD
// Slots de la semana indicada (lunes a domingo)
export async function getCalendario(req, res) {
    const psicId = req.user.id;

    // Calcular lunes de la semana
    const base = req.query.semana ? new Date(req.query.semana) : new Date();
    const day = base.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    const lunes = new Date(base);
    lunes.setDate(base.getDate() + diff);
    lunes.setHours(0, 0, 0, 0);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    domingo.setHours(23, 59, 59, 999);

    try {
        const [slots] = await pool.query(`
      SELECT
        s.id, s.starts_at, s.ends_at, s.location,
        sb.id       AS booking_id,
        u.full_name AS student_name,
        sb.status   AS booking_status
      FROM slots s
      LEFT JOIN slot_bookings sb ON sb.slot_id = s.id AND sb.status != 'cancelada'
      LEFT JOIN users u          ON u.id = sb.student_id
      WHERE s.owner_id = ? AND s.type = 'cita_psicologica'
        AND s.starts_at BETWEEN ? AND ?
      ORDER BY s.starts_at ASC
    `, [psicId, lunes, domingo]);

        res.json({
            semana_inicio: lunes.toISOString().slice(0, 10),
            semana_fin: domingo.toISOString().slice(0, 10),
            slots
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener calendario" });
    }
}