import pool from "../config/db.js";

// GET /api/docente/secciones?period_id=X
export async function getMisSecciones(req, res) {
    try {
        const docenteId = req.user.id;
        let periodFilter = "";
        const params = [docenteId];

        if (req.query.period_id) {
            periodFilter = "AND p.id = ?";
            params.push(req.query.period_id);
        } else {
            periodFilter = "AND p.is_active = TRUE";
        }

        const [secciones] = await pool.query(`
      SELECT
        cs.id, cs.section,
        c.code, c.name AS course_name,
        p.id AS period_id, p.label AS period_label,
        COUNT(e.id) AS total_alumnos
      FROM course_sections cs
      JOIN courses c  ON c.id  = cs.course_id
      JOIN periods p  ON p.id  = cs.period_id
      LEFT JOIN enrollments e ON e.course_section_id = cs.id
      WHERE cs.docente_id = ? ${periodFilter}
      GROUP BY cs.id
      ORDER BY p.starts_at DESC, c.name
    `, params);

        // Periodos disponibles para el selector
        const [periodos] = await pool.query(`
      SELECT DISTINCT p.id, p.label, p.is_active
      FROM course_sections cs
      JOIN periods p ON p.id = cs.period_id
      WHERE cs.docente_id = ?
      ORDER BY p.starts_at DESC
    `, [docenteId]);

        res.json({ secciones, periodos });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener secciones" });
    }
}

// GET /api/docente/secciones/:id/alumnos
export async function getAlumnosBySeccion(req, res) {
    try {
        const [rows] = await pool.query(`
      SELECT
        u.id, u.full_name, u.email,
        e.id AS enrollment_id
      FROM enrollments e
      JOIN users u ON u.id = e.student_id
      WHERE e.course_section_id = ?
      ORDER BY u.full_name
    `, [req.params.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener alumnos" });
    }
}

// GET /api/docente/secciones/:id/evaluaciones
export async function getEvaluacionesBySeccion(req, res) {
    try {
        const [evaluaciones] = await pool.query(`
      SELECT id, name, weight FROM evaluations
      WHERE course_section_id = ?
      ORDER BY id
    `, [req.params.id]);

        const [notas] = await pool.query(`
      SELECT g.enrollment_id, g.evaluation_id, g.score
      FROM grades g
      JOIN enrollments e ON e.id = g.enrollment_id
      WHERE e.course_section_id = ?
    `, [req.params.id]);

        res.json({ evaluaciones, notas });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener evaluaciones" });
    }
}

// POST /api/docente/notas { enrollment_id, evaluation_id, score }
export async function upsertNota(req, res) {
    const { enrollment_id, evaluation_id, score } = req.body;
    try {
        await pool.query(`
      INSERT INTO grades (enrollment_id, evaluation_id, score, recorded_at)
      VALUES (?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE score = VALUES(score), recorded_at = NOW()
    `, [enrollment_id, evaluation_id, score ?? null]);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al guardar nota" });
    }
}

// POST /api/docente/observaciones { student_id, content }
export async function addObservacion(req, res) {
    const { student_id, content } = req.body;
    if (!student_id || !content?.trim()) {
        return res.status(400).json({ error: "Datos incompletos" });
    }
    try {
        // Verificar que el alumno pertenece a alguna sección del docente
        const [check] = await pool.query(`
      SELECT 1 FROM enrollments e
      JOIN course_sections cs ON cs.id = e.course_section_id
      WHERE cs.docente_id = ? AND e.student_id = ?
      LIMIT 1
    `, [req.user.id, student_id]);

        if (check.length === 0) {
            return res.status(403).json({ error: "El alumno no pertenece a tus secciones" });
        }

        await pool.query(`
      INSERT INTO observations (author_id, student_id, type, content)
      VALUES (?, ?, 'docente', ?)
    `, [req.user.id, student_id, content]);

        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al guardar observación" });
    }
}

// GET /api/docente/asesorias
export async function getMisAsesorias(req, res) {
    try {
        const [rows] = await pool.query(`
      SELECT
        s.id, s.starts_at, s.ends_at, s.capacity, s.location,
        COUNT(sb.id) AS reservas
      FROM slots s
      LEFT JOIN slot_bookings sb ON sb.slot_id = s.id AND sb.status != 'cancelada'
      WHERE s.owner_id = ? AND s.type = 'asesoria'
      ORDER BY s.starts_at DESC
    `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener asesorías" });
    }
}

// POST /api/docente/asesorias { starts_at, ends_at, capacity, location }
export async function createAsesoria(req, res) {
    const { starts_at, ends_at, capacity = 5, location } = req.body;
    if (!starts_at || !ends_at) {
        return res.status(400).json({ error: "Fecha de inicio y fin requeridas" });
    }
    try {
        const [result] = await pool.query(`
      INSERT INTO slots (owner_id, type, starts_at, ends_at, capacity, location)
      VALUES (?, 'asesoria', ?, ?, ?, ?)
    `, [req.user.id, starts_at, ends_at, capacity, location ?? null]);
        res.json({ ok: true, id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al crear asesoría" });
    }
}