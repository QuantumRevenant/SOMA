import pool from "../config/db.js";

// GET /api/estudiante/cursos?periodo=X
// Todos los cursos matriculados (activos e históricos), filtrables por periodo
export async function getAllCursos(req, res) {
    try {
        const params = [req.user.id];
        let periodoFilter = "";
        if (req.query.periodo) {
            periodoFilter = "AND p.label = ?";
            params.push(req.query.periodo);
        }

        const [cursos] = await pool.query(`
      SELECT
        cs.id AS section_id,
        c.code, c.name AS course_name, c.credits,
        p.label AS period_label, p.is_active,
        u.full_name AS docente_name,
        e.id AS enrollment_id,
        ROUND(
          SUM(CASE WHEN g.score IS NOT NULL THEN g.score * (ev.weight / 100) ELSE 0 END) /
          NULLIF(SUM(CASE WHEN g.score IS NOT NULL THEN ev.weight / 100 ELSE 0 END), 0)
        , 2) AS promedio,
        COUNT(DISTINCT ev.id)                                  AS total_evaluaciones,
        SUM(CASE WHEN g.score IS NOT NULL THEN 1 ELSE 0 END)  AS evaluaciones_registradas
      FROM enrollments e
      JOIN course_sections cs ON cs.id = e.course_section_id
      JOIN courses c          ON c.id  = cs.course_id
      JOIN periods p          ON p.id  = cs.period_id
      JOIN users u            ON u.id  = cs.docente_id
      LEFT JOIN evaluations ev ON ev.course_section_id = cs.id
      LEFT JOIN grades g       ON g.enrollment_id = e.id AND g.evaluation_id = ev.id
      WHERE e.student_id = ? ${periodoFilter}
      GROUP BY e.id
      ORDER BY p.starts_at DESC, c.name
    `, params);

        // Periodos disponibles para el selector (ordenados más reciente primero)
        const [periodos] = await pool.query(`
      SELECT DISTINCT p.label, p.is_active, p.starts_at
      FROM enrollments e
      JOIN course_sections cs ON cs.id = e.course_section_id
      JOIN periods p          ON p.id  = cs.period_id
      WHERE e.student_id = ?
      ORDER BY p.starts_at DESC
    `, [req.user.id]);

        res.json({ cursos, periodos });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener cursos" });
    }
}

// GET /api/estudiante/cursos/:enrollmentId/notas
// Notas detalladas de un curso (por enrollment)
export async function getNotasCurso(req, res) {
    try {
        // Verificar que el enrollment pertenece al estudiante
        const [check] = await pool.query(
            "SELECT id FROM enrollments WHERE id = ? AND student_id = ?",
            [req.params.enrollmentId, req.user.id]
        );
        if (check.length === 0) {
            return res.status(403).json({ error: "No autorizado" });
        }

        const [notas] = await pool.query(`
      SELECT
        ev.id AS evaluation_id,
        ev.name, ev.weight,
        g.score,
        g.recorded_at
      FROM evaluations ev
      LEFT JOIN grades g ON g.evaluation_id = ev.id AND g.enrollment_id = ?
      WHERE ev.course_section_id = (
        SELECT course_section_id FROM enrollments WHERE id = ?
      )
      ORDER BY ev.id
    `, [req.params.enrollmentId, req.params.enrollmentId]);

        // Promedio ponderado solo con notas registradas
        const registradas = notas.filter(n => n.score !== null);
        const pesoTotal = registradas.reduce((acc, n) => acc + parseFloat(n.weight), 0);
        const promedio = pesoTotal === 0 ? null :
            registradas.reduce((acc, n) => acc + n.score * (n.weight / 100), 0) /
            (pesoTotal / 100);

        res.json({
            notas,
            promedio: promedio !== null ? Math.round(promedio * 100) / 100 : null,
            peso_completado: pesoTotal,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener notas" });
    }
}

// GET /api/estudiante/resumen
// Stats para las tarjetas del dashboard
export async function getResumen(req, res) {
    try {
        const [rows] = await pool.query(`
      SELECT
        COUNT(DISTINCT e.id) AS cursos_activos,
        ROUND(AVG(sub.promedio), 2) AS promedio_general
      FROM enrollments e
      JOIN course_sections cs ON cs.id = e.course_section_id
      JOIN periods p          ON p.id  = cs.period_id
      LEFT JOIN (
        SELECT
          e2.id AS enrollment_id,
          SUM(CASE WHEN g.score IS NOT NULL THEN g.score * (ev.weight / 100) ELSE 0 END) /
          NULLIF(SUM(CASE WHEN g.score IS NOT NULL THEN ev.weight / 100 ELSE 0 END), 0) AS promedio
        FROM enrollments e2
        LEFT JOIN evaluations ev ON ev.course_section_id = e2.course_section_id
        LEFT JOIN grades g       ON g.enrollment_id = e2.id AND g.evaluation_id = ev.id
        WHERE e2.student_id = ?
        GROUP BY e2.id
      ) sub ON sub.enrollment_id = e.id
      WHERE e.student_id = ? AND p.is_active = TRUE
    `, [req.user.id, req.user.id]);

        res.json({
            cursos_activos: rows[0].cursos_activos ?? 0,
            promedio_general: rows[0].promedio_general ?? null,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener resumen" });
    }
}

// ── Servicios ─────────────────────────────────────────────────────────────────

// GET /api/estudiante/asesorias
// Slots de asesoría disponibles (con cupo)
export async function getAsesorias(req, res) {
    try {
        const [rows] = await pool.query(`
      SELECT
        s.id, s.starts_at, s.ends_at, s.capacity, s.location,
        u.full_name AS docente_name,
        COUNT(sb.id) AS reservas,
        EXISTS(
          SELECT 1 FROM slot_bookings sb2
          WHERE sb2.slot_id = s.id AND sb2.student_id = ? AND sb2.status != 'cancelada'
        ) AS ya_reservado
      FROM slots s
      JOIN users u ON u.id = s.owner_id
      LEFT JOIN slot_bookings sb ON sb.slot_id = s.id AND sb.status != 'cancelada'
      WHERE s.type = 'asesoria' AND s.starts_at > NOW()
      GROUP BY s.id
      ORDER BY s.starts_at ASC
    `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener asesorías" });
    }
}

// POST /api/estudiante/asesorias/:id/reservar
export async function reservarAsesoria(req, res) {
    try {
        const [slot] = await pool.query(
            "SELECT capacity FROM slots WHERE id = ? AND type = 'asesoria'",
            [req.params.id]
        );
        if (slot.length === 0) return res.status(404).json({ error: "Asesoría no encontrada" });

        const [existing] = await pool.query(
            "SELECT id FROM slot_bookings WHERE slot_id = ? AND student_id = ? AND status != 'cancelada'",
            [req.params.id, req.user.id]
        );
        if (existing.length > 0) return res.status(400).json({ error: "Ya tienes una reserva en esta asesoría" });

        const [count] = await pool.query(
            "SELECT COUNT(*) AS n FROM slot_bookings WHERE slot_id = ? AND status != 'cancelada'",
            [req.params.id]
        );
        if (count[0].n >= slot[0].capacity) return res.status(400).json({ error: "Sin cupo disponible" });

        await pool.query(
            `INSERT INTO slot_bookings (slot_id, student_id, status) VALUES (?, ?, 'confirmada')
       ON DUPLICATE KEY UPDATE status = 'confirmada'`,
            [req.params.id, req.user.id]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al reservar" });
    }
}

// DELETE /api/estudiante/asesorias/:id/reservar
export async function cancelarAsesoria(req, res) {
    try {
        await pool.query(
            "UPDATE slot_bookings SET status = 'cancelada' WHERE slot_id = ? AND student_id = ?",
            [req.params.id, req.user.id]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al cancelar" });
    }
}

// GET /api/estudiante/talleres
export async function getTalleres(req, res) {
    try {
        const [rows] = await pool.query(`
      SELECT
        w.id, w.title, w.description, w.starts_at, w.ends_at,
        w.capacity, w.location,
        u.full_name AS coordinador_name,
        COUNT(we.id) AS inscritos,
        EXISTS(
          SELECT 1 FROM workshop_enrollments we2
          WHERE we2.workshop_id = w.id AND we2.student_id = ?
        ) AS ya_inscrito
      FROM workshops w
      JOIN users u ON u.id = w.coordinator_id
      LEFT JOIN workshop_enrollments we ON we.workshop_id = w.id
      WHERE w.starts_at > NOW()
      GROUP BY w.id
      ORDER BY w.starts_at ASC
    `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener talleres" });
    }
}

// POST /api/estudiante/talleres/:id/inscribir
export async function inscribirTaller(req, res) {
    try {
        const [taller] = await pool.query("SELECT capacity FROM workshops WHERE id = ?", [req.params.id]);
        if (taller.length === 0) return res.status(404).json({ error: "Taller no encontrado" });

        const [existing] = await pool.query(
            "SELECT id FROM workshop_enrollments WHERE workshop_id = ? AND student_id = ?",
            [req.params.id, req.user.id]
        );
        if (existing.length > 0) return res.status(400).json({ error: "Ya estás inscrito" });

        const [count] = await pool.query(
            "SELECT COUNT(*) AS n FROM workshop_enrollments WHERE workshop_id = ?",
            [req.params.id]
        );
        if (count[0].n >= taller[0].capacity) return res.status(400).json({ error: "Sin cupo disponible" });

        await pool.query(
            "INSERT INTO workshop_enrollments (workshop_id, student_id) VALUES (?, ?)",
            [req.params.id, req.user.id]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al inscribir" });
    }
}

// DELETE /api/estudiante/talleres/:id/inscribir
export async function desinscribirTaller(req, res) {
    try {
        await pool.query(
            "DELETE FROM workshop_enrollments WHERE workshop_id = ? AND student_id = ?",
            [req.params.id, req.user.id]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al desinscribir" });
    }
}

// GET /api/estudiante/citas
export async function getCitas(req, res) {
    try {
        const [rows] = await pool.query(`
      SELECT
        s.id, s.starts_at, s.ends_at, s.capacity, s.location,
        u.full_name AS psicologo_name,
        COUNT(sb.id) AS reservas,
        EXISTS(
          SELECT 1 FROM slot_bookings sb2
          WHERE sb2.slot_id = s.id AND sb2.student_id = ? AND sb2.status != 'cancelada'
        ) AS ya_reservado
      FROM slots s
      JOIN users u ON u.id = s.owner_id
      LEFT JOIN slot_bookings sb ON sb.slot_id = s.id AND sb.status != 'cancelada'
      WHERE s.type = 'cita_psicologica' AND s.starts_at > NOW()
      GROUP BY s.id
      ORDER BY s.starts_at ASC
    `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener citas" });
    }
}

// POST /api/estudiante/citas/:id/reservar
export async function reservarCita(req, res) {
    try {
        const [slot] = await pool.query(
            "SELECT capacity FROM slots WHERE id = ? AND type = 'cita_psicologica'",
            [req.params.id]
        );
        if (slot.length === 0) return res.status(404).json({ error: "Cita no encontrada" });

        const [existing] = await pool.query(
            "SELECT id FROM slot_bookings WHERE slot_id = ? AND student_id = ? AND status != 'cancelada'",
            [req.params.id, req.user.id]
        );
        if (existing.length > 0) return res.status(400).json({ error: "Ya tienes una reserva en esta cita" });

        const [count] = await pool.query(
            "SELECT COUNT(*) AS n FROM slot_bookings WHERE slot_id = ? AND status != 'cancelada'",
            [req.params.id]
        );
        if (count[0].n >= slot[0].capacity) return res.status(400).json({ error: "Sin cupo disponible" });

        await pool.query(
            `INSERT INTO slot_bookings (slot_id, student_id, status) VALUES (?, ?, 'confirmada')
       ON DUPLICATE KEY UPDATE status = 'confirmada'`,
            [req.params.id, req.user.id]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al reservar cita" });
    }
}

// DELETE /api/estudiante/citas/:id/reservar
export async function cancelarCita(req, res) {
    try {
        const [[slot]] = await pool.query(
            "SELECT starts_at FROM slots WHERE id = ?",
            [req.params.id]
        );
        if (!slot) return res.status(404).json({ error: "Cita no encontrada" });

        const horasRestantes = (new Date(slot.starts_at) - new Date()) / (1000 * 60 * 60);
        if (horasRestantes < 24) {
            return res.status(400).json({
                error: "No puedes cancelar con menos de 24 horas de anticipación"
            });
        }

        await pool.query(
            "UPDATE slot_bookings SET status = 'cancelada' WHERE slot_id = ? AND student_id = ?",
            [req.params.id, req.user.id]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al cancelar cita" });
    }
}

// GET /api/estudiante/cursos/:enrollmentId/asistencia
export async function getAsistenciaCurso(req, res) {
    try {
        const [check] = await pool.query(
            "SELECT id FROM enrollments WHERE id = ? AND student_id = ?",
            [req.params.enrollmentId, req.user.id]
        );
        if (check.length === 0) return res.status(403).json({ error: "No autorizado" });

        const [rows] = await pool.query(`
      SELECT
        DATE_FORMAT(a.date, '%Y-%m-%d') AS date,
        a.status,
        u.full_name AS recorded_by_name
      FROM attendance a
      JOIN enrollments e ON e.id = a.enrollment_id
      LEFT JOIN users u  ON u.id = a.recorded_by
      WHERE a.enrollment_id = ?
      ORDER BY a.date DESC
    `, [req.params.enrollmentId]);

        // Resumen
        const total = rows.length;
        const presente = rows.filter(r => r.status === "presente").length;
        const tardanza = rows.filter(r => r.status === "tardanza").length;
        const ausente = rows.filter(r => r.status === "ausente").length;
        const pct = total === 0 ? null : Math.round((presente + tardanza) / total * 100);

        res.json({ registros: rows, resumen: { total, presente, tardanza, ausente, pct } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener asistencia" });
    }
}

// GET /api/estudiante/mis-servicios
// Servicios donde el estudiante ya está inscrito/reservado (incluyendo pasados)
export async function getMisServicios(req, res) {
    try {
        const [asesorias] = await pool.query(`
      SELECT
        s.id, s.starts_at, s.ends_at, s.location,
        u.full_name AS owner_name,
        sb.status,
        'asesoria' AS tipo
      FROM slot_bookings sb
      JOIN slots s ON s.id = sb.slot_id
      JOIN users u ON u.id = s.owner_id
      WHERE sb.student_id = ? AND sb.status != 'cancelada' AND s.type = 'asesoria'
      ORDER BY s.starts_at DESC
    `, [req.user.id]);

        const [citas] = await pool.query(`
      SELECT
        s.id, s.starts_at, s.ends_at, s.location,
        u.full_name AS owner_name,
        sb.status,
        'cita_psicologica' AS tipo
      FROM slot_bookings sb
      JOIN slots s ON s.id = sb.slot_id
      JOIN users u ON u.id = s.owner_id
      WHERE sb.student_id = ? AND sb.status != 'cancelada' AND s.type = 'cita_psicologica'
      ORDER BY s.starts_at DESC
    `, [req.user.id]);

        const [talleres] = await pool.query(`
      SELECT
        w.id, w.title, w.starts_at, w.ends_at, w.location,
        u.full_name AS owner_name,
        'taller' AS tipo
      FROM workshop_enrollments we
      JOIN workshops w ON w.id = we.workshop_id
      JOIN users u     ON u.id = w.coordinator_id
      WHERE we.student_id = ?
      ORDER BY w.starts_at DESC
    `, [req.user.id]);

        res.json({ asesorias, citas, talleres });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener servicios" });
    }
}