import pool from "../config/db.js";

// ── Secciones ─────────────────────────────────────────────────────────────────

export async function getMisSecciones(req, res) {
    try {
        const docenteId = req.user.id;
        const periodFilter = req.query.period_id
            ? "AND p.id = ?" : "AND p.is_active = TRUE";
        const params = req.query.period_id
            ? [docenteId, req.query.period_id] : [docenteId];

        const [secciones] = await pool.query(`
      SELECT cs.id, cs.section,
             c.code, c.name AS course_name,
             p.id AS period_id, p.label AS period_label,
             COUNT(e.id) AS total_alumnos
      FROM course_sections cs
      JOIN courses c     ON c.id = cs.course_id
      JOIN periods p     ON p.id = cs.period_id
      LEFT JOIN enrollments e ON e.course_section_id = cs.id
      WHERE cs.docente_id = ? ${periodFilter}
      GROUP BY cs.id
      ORDER BY p.starts_at DESC, c.name
    `, params);

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

export async function getAlumnosBySeccion(req, res) {
    try {
        const [rows] = await pool.query(`
      SELECT u.id, u.full_name, u.email, e.id AS enrollment_id
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

// ── Evaluaciones ──────────────────────────────────────────────────────────────

export async function getEvaluacionesBySeccion(req, res) {
    try {
        const [evaluaciones] = await pool.query(
            "SELECT id, name, weight, template_id FROM evaluations WHERE course_section_id = ? ORDER BY id",
            [req.params.id]
        );
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

// GET /api/docente/secciones/:id/plantilla — plantilla del coordinador para ese curso
export async function getPlantillaBySeccion(req, res) {
    try {
        const [rows] = await pool.query(`
      SELECT et.id, et.name, et.weight
      FROM evaluation_templates et
      JOIN course_sections cs ON cs.course_id = et.course_id
      WHERE cs.id = ?
      ORDER BY et.id
    `, [req.params.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener plantilla" });
    }
}

// POST /api/docente/secciones/:id/evaluaciones { name, weight, template_id? }
export async function createEvaluacion(req, res) {
    const { name, weight, template_id } = req.body;
    if (!name || weight == null) {
        return res.status(400).json({ error: "Nombre y peso requeridos" });
    }

    // Verificar que la sección pertenece al docente
    const [check] = await pool.query(
        "SELECT id FROM course_sections WHERE id = ? AND docente_id = ?",
        [req.params.id, req.user.id]
    );
    if (check.length === 0) {
        return res.status(403).json({ error: "Sección no autorizada" });
    }

    // Verificar que la suma de pesos no supere 100
    const [suma] = await pool.query(
        "SELECT COALESCE(SUM(weight), 0) AS total FROM evaluations WHERE course_section_id = ?",
        [req.params.id]
    );
    if (parseFloat(suma[0].total) + parseFloat(weight) > 100) {
        return res.status(400).json({ error: `La suma de pesos superaría 100% (actual: ${suma[0].total}%)` });
    }

    try {
        const [result] = await pool.query(
            "INSERT INTO evaluations (course_section_id, template_id, name, weight) VALUES (?, ?, ?, ?)",
            [req.params.id, template_id ?? null, name, weight]
        );
        res.json({ ok: true, id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al crear evaluación" });
    }
}

// PUT /api/docente/evaluaciones/:id { name, weight }
export async function updateEvaluacion(req, res) {
    const { name, weight } = req.body;
    try {
        // Verificar que la evaluación pertenece a una sección del docente
        const [check] = await pool.query(`
      SELECT e.id FROM evaluations e
      JOIN course_sections cs ON cs.id = e.course_section_id
      WHERE e.id = ? AND cs.docente_id = ?
    `, [req.params.id, req.user.id]);
        if (check.length === 0) {
            return res.status(403).json({ error: "No autorizado" });
        }
        await pool.query(
            "UPDATE evaluations SET name = COALESCE(?, name), weight = COALESCE(?, weight) WHERE id = ?",
            [name ?? null, weight ?? null, req.params.id]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al actualizar evaluación" });
    }
}

// DELETE /api/docente/evaluaciones/:id
export async function deleteEvaluacion(req, res) {
    try {
        const [check] = await pool.query(`
      SELECT e.id FROM evaluations e
      JOIN course_sections cs ON cs.id = e.course_section_id
      WHERE e.id = ? AND cs.docente_id = ?
    `, [req.params.id, req.user.id]);
        if (check.length === 0) {
            return res.status(403).json({ error: "No autorizado" });
        }
        // Eliminar notas asociadas primero
        await pool.query("DELETE FROM grades WHERE evaluation_id = ?", [req.params.id]);
        await pool.query("DELETE FROM evaluations WHERE id = ?", [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al eliminar evaluación" });
    }
}

// ── Notas ─────────────────────────────────────────────────────────────────────

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

// ── Asistencia ────────────────────────────────────────────────────────────────

export async function registrarAsistencia(req, res) {
    const { section_id, date, registros } = req.body;
    if (!section_id || !date || !Array.isArray(registros) || registros.length === 0) {
        return res.status(400).json({ error: "Datos incompletos" });
    }
    try {
        const values = registros.map(r => [r.enrollment_id, date, r.status, req.user.id]);
        await pool.query(`
      INSERT INTO attendance (enrollment_id, date, status, recorded_by)
      VALUES ?
      ON DUPLICATE KEY UPDATE status = VALUES(status), recorded_by = VALUES(recorded_by)
    `, [values]);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al registrar asistencia" });
    }
}

export async function getAsistencia(req, res) {
    try {
        const { date } = req.query;
        const params = date ? [req.params.id, date] : [req.params.id];
        const dateFilter = date ? "AND a.date = ?" : "";
        const [rows] = await pool.query(`
      SELECT u.full_name, a.enrollment_id,
             DATE_FORMAT(a.date, '%Y-%m-%d') AS date,
             a.status
      FROM attendance a
      JOIN enrollments e ON e.id = a.enrollment_id
      JOIN users u       ON u.id = e.student_id
      WHERE e.course_section_id = ? ${dateFilter}
      ORDER BY a.date DESC, u.full_name
    `, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener asistencia" });
    }
}

// ── Observaciones ─────────────────────────────────────────────────────────────

// GET /api/docente/alumnos/:id/observaciones
export async function getObservacionesAlumno(req, res) {
    try {
        // Verificar que el alumno pertenece a alguna sección del docente
        const [check] = await pool.query(`
      SELECT 1 FROM enrollments e
      JOIN course_sections cs ON cs.id = e.course_section_id
      WHERE cs.docente_id = ? AND e.student_id = ?
      LIMIT 1
    `, [req.user.id, req.params.id]);
        if (check.length === 0) {
            return res.status(403).json({ error: "Alumno no pertenece a tus secciones" });
        }

        const [docente] = await pool.query(`
      SELECT o.id, o.content, o.created_at, o.updated_at,
             u.full_name AS author_name, o.author_id
      FROM observations o
      JOIN users u ON u.id = o.author_id
      WHERE o.student_id = ? AND o.type = 'docente'
      ORDER BY o.created_at DESC
    `, [req.params.id]);

        const [psicologo] = await pool.query(`
      SELECT o.id, o.content, o.created_at,
             u.full_name AS author_name
      FROM observations o
      JOIN users u ON u.id = o.author_id
      WHERE o.student_id = ? AND o.type = 'psicologo'
      ORDER BY o.created_at DESC
    `, [req.params.id]);

        res.json({ docente, psicologo, myId: req.user.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener observaciones" });
    }
}

export async function addObservacion(req, res) {
    const { student_id, content } = req.body;
    if (!student_id || !content?.trim()) {
        return res.status(400).json({ error: "Datos incompletos" });
    }
    try {
        const [check] = await pool.query(`
      SELECT 1 FROM enrollments e
      JOIN course_sections cs ON cs.id = e.course_section_id
      WHERE cs.docente_id = ? AND e.student_id = ?
      LIMIT 1
    `, [req.user.id, student_id]);
        if (check.length === 0) {
            return res.status(403).json({ error: "Alumno no pertenece a tus secciones" });
        }
        await pool.query(
            "INSERT INTO observations (author_id, student_id, type, content) VALUES (?, ?, 'docente', ?)",
            [req.user.id, student_id, content]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al guardar observación" });
    }
}

// PUT /api/docente/observaciones/:id
export async function updateObservacion(req, res) {
    const { content } = req.body;
    if (!content?.trim()) {
        return res.status(400).json({ error: "Contenido requerido" });
    }
    try {
        const [check] = await pool.query(
            "SELECT id FROM observations WHERE id = ? AND author_id = ? AND type = 'docente'",
            [req.params.id, req.user.id]
        );
        if (check.length === 0) {
            return res.status(403).json({ error: "No autorizado" });
        }
        await pool.query("UPDATE observations SET content = ? WHERE id = ?", [content, req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al actualizar observación" });
    }
}

// ── Asesorías ─────────────────────────────────────────────────────────────────

export async function getMisAsesorias(req, res) {
    try {
        const [rows] = await pool.query(`
      SELECT s.id, s.starts_at, s.ends_at, s.capacity, s.location,
             COUNT(sb.id) AS reservas
      FROM slots s
      LEFT JOIN slot_bookings sb ON sb.slot_id = s.id AND sb.status != 'cancelada'
      WHERE s.owner_id = ? AND s.type = 'asesoria'
      GROUP BY s.id
      ORDER BY s.starts_at DESC
    `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener asesorías" });
    }
}

export async function createAsesoria(req, res) {
    const { starts_at, ends_at, capacity = 5, location } = req.body;
    if (!starts_at || !ends_at) {
        return res.status(400).json({ error: "Fecha de inicio y fin requeridas" });
    }
    try {
        const [result] = await pool.query(
            "INSERT INTO slots (owner_id, type, starts_at, ends_at, capacity, location) VALUES (?, 'asesoria', ?, ?, ?, ?)",
            [req.user.id, starts_at, ends_at, capacity, location ?? null]
        );
        res.json({ ok: true, id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al crear asesoría" });
    }
}

export async function editarAsesoria(req, res) {
    const { starts_at, ends_at, capacity, location } = req.body;
    if (!starts_at || !ends_at)
        return res.status(400).json({ error: "Fecha de inicio y fin requeridas" });
    try {
        const [check] = await pool.query(
            "SELECT id FROM slots WHERE id = ? AND owner_id = ? AND type = 'asesoria'",
            [req.params.id, req.user.id]
        );
        if (check.length === 0) return res.status(403).json({ error: "No autorizado" });

        await pool.query(
            "UPDATE slots SET starts_at = ?, ends_at = ?, capacity = ?, location = ? WHERE id = ?",
            [starts_at, ends_at, capacity ?? 5, location ?? null, req.params.id]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al editar asesoría" });
    }
}

export async function deleteAsesoria(req, res) {
    try {
        const [check] = await pool.query(
            "SELECT id FROM slots WHERE id = ? AND owner_id = ? AND type = 'asesoria'",
            [req.params.id, req.user.id]
        );
        if (check.length === 0) {
            return res.status(403).json({ error: "No autorizado" });
        }
        await pool.query("DELETE FROM slot_bookings WHERE slot_id = ?", [req.params.id]);
        await pool.query("DELETE FROM slots WHERE id = ?", [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al eliminar asesoría" });
    }
}

// DELETE /api/docente/observaciones/:id
export async function deleteObservacion(req, res) {
    try {
        const [check] = await pool.query(
            "SELECT id FROM observations WHERE id = ? AND author_id = ? AND type = 'docente'",
            [req.params.id, req.user.id]
        );
        if (check.length === 0) {
            return res.status(403).json({ error: "No autorizado" });
        }
        await pool.query("DELETE FROM observations WHERE id = ?", [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al eliminar observación" });
    }
}