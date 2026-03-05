import pool from "../config/db.js";

// Helper: verifica que el coordinador tenga acceso al curso
async function coordTieneCurso(coordId, courseId) {
    const [[r]] = await pool.query(
        "SELECT id FROM coordinator_courses WHERE coordinator_id = ? AND course_id = ?",
        [coordId, courseId]
    );
    return !!r;
}

// ── Resumen / Stats ───────────────────────────────────────────────────────────
export async function getResumen(req, res) {
    const coordId = req.user.id;
    try {
        const [[stats]] = await pool.query(`
      SELECT
        COUNT(DISTINCT cs.docente_id)                          AS total_docentes,
        COUNT(DISTINCT e.student_id)                           AS total_alumnos,
        COUNT(DISTINCT cs.id)                                  AS total_secciones,
        ROUND(AVG(g.score), 2)                                 AS promedio_global
      FROM coordinator_courses cc
      JOIN courses c          ON c.id  = cc.course_id
      JOIN course_sections cs ON cs.course_id = c.id
      JOIN periods p          ON p.id  = cs.period_id AND p.is_active = TRUE
      LEFT JOIN enrollments e ON e.course_section_id = cs.id
      LEFT JOIN evaluations ev ON ev.course_section_id = cs.id
      LEFT JOIN grades g      ON g.enrollment_id = e.id AND g.evaluation_id = ev.id
      WHERE cc.coordinator_id = ?
    `, [coordId]);

        const [alertas] = await pool.query(`
      SELECT COUNT(*) AS total FROM (
        SELECT e.student_id FROM coordinator_courses cc
        JOIN courses c          ON c.id  = cc.course_id
        JOIN course_sections cs ON cs.course_id = c.id
        JOIN periods p          ON p.id  = cs.period_id AND p.is_active = TRUE
        JOIN enrollments e      ON e.course_section_id = cs.id
        JOIN evaluations ev     ON ev.course_section_id = cs.id
        LEFT JOIN grades g      ON g.enrollment_id = e.id AND g.evaluation_id = ev.id
        WHERE cc.coordinator_id = ?
        GROUP BY e.id
        HAVING ROUND(
          SUM(CASE WHEN g.score IS NOT NULL THEN g.score * (ev.weight/100) ELSE 0 END) /
          NULLIF(SUM(CASE WHEN g.score IS NOT NULL THEN ev.weight/100 ELSE 0 END), 0)
        , 2) < (SELECT min_promedio FROM coordinator_settings WHERE id = ?)
      ) sub
    `, [coordId, coordId]);

        res.json({ ...stats, alertas: alertas[0].total });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener resumen" });
    }
}

// ── Personal (docentes y psicólogos) ─────────────────────────────────────────
export async function getPersonal(req, res) {
    const coordId = req.user.id;
    try {
        // Docentes que tienen secciones en cursos del coordinador (periodo activo)
        const [docentes] = await pool.query(`
      SELECT DISTINCT u.id, u.full_name, u.email,
        COUNT(DISTINCT cs.id) AS secciones_activas,
        COUNT(DISTINCT e.student_id) AS total_alumnos
      FROM coordinator_courses cc
      JOIN courses c          ON c.id  = cc.course_id
      JOIN course_sections cs ON cs.course_id = c.id AND cs.docente_id IS NOT NULL
      JOIN periods p          ON p.id  = cs.period_id AND p.is_active = TRUE
      JOIN users u            ON u.id  = cs.docente_id
      LEFT JOIN enrollments e ON e.course_section_id = cs.id
      WHERE cc.coordinator_id = ?
      GROUP BY u.id
      ORDER BY u.full_name
    `, [coordId]);

        // Psicólogos — todos los del sistema (no hay relación directa con cursos)
        const [psicologos] = await pool.query(`
      SELECT u.id, u.full_name, u.email,
        COUNT(DISTINCT sb.id) AS citas_realizadas
      FROM users u
      LEFT JOIN slots s        ON s.owner_id = u.id AND s.type = 'cita_psicologica'
      LEFT JOIN slot_bookings sb ON sb.slot_id = s.id AND sb.status = 'confirmada'
      WHERE u.role = 'psicologo'
      GROUP BY u.id
      ORDER BY u.full_name
    `, []);

        res.json({ docentes, psicologos });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener personal" });
    }
}

// ── Alumnos ───────────────────────────────────────────────────────────────────
export async function getAlumnos(req, res) {
    const coordId = req.user.id;
    const q = req.query.q?.trim() || "";
    try {
        let extra = "";
        const params = [coordId];
        if (q) { extra = "AND (u.full_name LIKE ? OR u.email LIKE ?)"; params.push(`%${q}%`, `%${q}%`); }

        const [alumnos] = await pool.query(`
      SELECT DISTINCT
        u.id, u.full_name, u.email,
        ROUND(
          SUM(CASE WHEN g.score IS NOT NULL THEN g.score * (ev.weight/100) ELSE 0 END) /
          NULLIF(SUM(CASE WHEN g.score IS NOT NULL THEN ev.weight/100 ELSE 0 END), 0)
        , 2) AS promedio,
        ROUND(
          SUM(CASE WHEN a.status IN ('presente','tardanza') THEN 1 ELSE 0 END) /
          NULLIF(COUNT(DISTINCT a.id), 0) * 100
        , 0) AS pct_asistencia,
        COUNT(DISTINCT e.id) AS cursos_activos
      FROM coordinator_courses cc
      JOIN courses c          ON c.id  = cc.course_id
      JOIN course_sections cs ON cs.course_id = c.id
      JOIN periods p          ON p.id  = cs.period_id AND p.is_active = TRUE
      JOIN enrollments e      ON e.course_section_id = cs.id
      JOIN users u            ON u.id  = e.student_id ${extra}
      LEFT JOIN evaluations ev ON ev.course_section_id = cs.id
      LEFT JOIN grades g       ON g.enrollment_id = e.id AND g.evaluation_id = ev.id
      LEFT JOIN attendance a   ON a.enrollment_id = e.id
      WHERE cc.coordinator_id = ?
      GROUP BY u.id
      ORDER BY u.full_name
    `, [...params, coordId]);

        const [[cfg]] = await pool.query(
            "SELECT min_promedio, min_asistencia_pct FROM coordinator_settings WHERE id = ?",
            [coordId]
        );

        res.json({ alumnos, config: cfg });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener alumnos" });
    }
}

// GET /api/coordinador/alumnos/:id — perfil completo
export async function getPerfilAlumno(req, res) {
    const coordId = req.user.id;
    const studentId = req.params.id;
    try {
        const [[usuario]] = await pool.query(
            "SELECT id, full_name, email FROM users WHERE id = ? AND role = 'estudiante'",
            [studentId]
        );
        if (!usuario) return res.status(404).json({ error: "Estudiante no encontrado" });

        // Cursos activos con notas
        const [cursos] = await pool.query(`
      SELECT
        c.code, c.name AS course_name, c.credits,
        u.full_name AS docente_name,
        e.id AS enrollment_id,
        ROUND(
          SUM(CASE WHEN g.score IS NOT NULL THEN g.score*(ev.weight/100) ELSE 0 END) /
          NULLIF(SUM(CASE WHEN g.score IS NOT NULL THEN ev.weight/100 ELSE 0 END), 0)
        , 2) AS promedio,
        ROUND(
          SUM(CASE WHEN a.status IN ('presente','tardanza') THEN 1 ELSE 0 END) /
          NULLIF(COUNT(DISTINCT a.id), 0) * 100
        , 0) AS pct_asistencia
      FROM enrollments e
      JOIN course_sections cs ON cs.id = e.course_section_id
      JOIN courses c          ON c.id  = cs.course_id
      JOIN periods p          ON p.id  = cs.period_id AND p.is_active = TRUE
      JOIN users u            ON u.id  = cs.docente_id
      LEFT JOIN evaluations ev ON ev.course_section_id = cs.id
      LEFT JOIN grades g       ON g.enrollment_id = e.id AND g.evaluation_id = ev.id
      LEFT JOIN attendance a   ON a.enrollment_id = e.id
      WHERE e.student_id = ?
      GROUP BY e.id
    `, [studentId]);

        // Observaciones (docentes y psicólogos)
        const [observaciones] = await pool.query(`
      SELECT o.id, o.content, o.type, o.created_at, u.full_name AS author_name
      FROM observations o
      JOIN users u ON u.id = o.author_id
      WHERE o.student_id = ?
      ORDER BY o.created_at DESC
    `, [studentId]);

        res.json({ usuario, cursos, observaciones });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener perfil" });
    }
}

// ── Académico ─────────────────────────────────────────────────────────────────

// GET /api/coordinador/periodos
export async function getPeriodos(req, res) {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM periods ORDER BY starts_at DESC"
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener periodos" });
    }
}

// POST /api/coordinador/periodos
export async function crearPeriodo(req, res) {
    const { year, type, label, starts_at, ends_at } = req.body;
    if (!year || type === undefined || !label || !starts_at || !ends_at)
        return res.status(400).json({ error: "Todos los campos son requeridos" });
    try {
        await pool.query(
            "INSERT INTO periods (year, type, label, is_active, starts_at, ends_at) VALUES (?,?,?,FALSE,?,?)",
            [year, type, label, starts_at, ends_at]
        );
        res.json({ ok: true });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY")
            return res.status(409).json({ error: "Ya existe un periodo con ese año y tipo" });
        res.status(500).json({ error: "Error al crear periodo" });
    }
}

// PATCH /api/coordinador/periodos/:id/activar
export async function activarPeriodo(req, res) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query("UPDATE periods SET is_active = FALSE");
        await conn.query("UPDATE periods SET is_active = TRUE WHERE id = ?", [req.params.id]);
        await conn.commit();
        res.json({ ok: true });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: "Error al activar periodo" });
    } finally {
        conn.release();
    }
}

// GET /api/coordinador/cursos
export async function getMisCursos(req, res) {
    const coordId = req.user.id;
    try {
        const [cursos] = await pool.query(`
      SELECT c.id, c.code, c.name, c.credits, c.description,
        COUNT(DISTINCT cs.id) AS total_secciones
      FROM coordinator_courses cc
      JOIN courses c          ON c.id  = cc.course_id
      LEFT JOIN course_sections cs ON cs.course_id = c.id
      WHERE cc.coordinator_id = ?
      GROUP BY c.id
      ORDER BY c.code
    `, [coordId]);
        res.json(cursos);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener cursos" });
    }
}

// GET /api/coordinador/cursos/:id/secciones
export async function getSecciones(req, res) {
    const coordId = req.user.id;
    const courseId = req.params.id;
    if (!await coordTieneCurso(coordId, courseId))
        return res.status(403).json({ error: "No autorizado" });
    try {
        const [secciones] = await pool.query(`
      SELECT cs.id, cs.section, p.label AS period_label, p.is_active,
        u.id AS docente_id, u.full_name AS docente_name,
        COUNT(DISTINCT e.id) AS inscritos
      FROM course_sections cs
      JOIN periods p      ON p.id  = cs.period_id
      JOIN users u        ON u.id  = cs.docente_id
      LEFT JOIN enrollments e ON e.course_section_id = cs.id
      WHERE cs.course_id = ?
      GROUP BY cs.id
      ORDER BY p.starts_at DESC, cs.section
    `, [courseId]);
        res.json(secciones);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener secciones" });
    }
}

// POST /api/coordinador/cursos/:id/secciones
export async function crearSeccion(req, res) {
    const coordId = req.user.id;
    const courseId = req.params.id;
    const { period_id, docente_id, section } = req.body;
    if (!await coordTieneCurso(coordId, courseId))
        return res.status(403).json({ error: "No autorizado" });
    try {
        await pool.query(
            "INSERT INTO course_sections (course_id, period_id, docente_id, section) VALUES (?,?,?,?)",
            [courseId, period_id, docente_id, section ?? "A"]
        );
        res.json({ ok: true });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY")
            return res.status(409).json({ error: "Ya existe esa sección en ese periodo" });
        res.status(500).json({ error: "Error al crear sección" });
    }
}

// ── Talleres ──────────────────────────────────────────────────────────────────
export async function getTalleres(req, res) {
    const coordId = req.user.id;
    try {
        const [talleres] = await pool.query(`
      SELECT w.*, COUNT(we.id) AS inscritos
      FROM workshops w
      LEFT JOIN workshop_enrollments we ON we.workshop_id = w.id
      WHERE w.coordinator_id = ?
      GROUP BY w.id
      ORDER BY w.starts_at DESC
    `, [coordId]);
        res.json(talleres);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener talleres" });
    }
}

export async function crearTaller(req, res) {
    const { title, description, expositor, starts_at, ends_at, capacity, location } = req.body;
    if (!title || !starts_at || !ends_at)
        return res.status(400).json({ error: "Título y fechas son requeridos" });
    try {
        const [r] = await pool.query(
            `INSERT INTO workshops (coordinator_id, title, description, expositor, starts_at, ends_at, capacity, location)
       VALUES (?,?,?,?,?,?,?,?)`,
            [req.user.id, title, description ?? null, expositor ?? null,
                starts_at, ends_at, capacity ?? 30, location ?? null]
        );
        res.json({ ok: true, id: r.insertId });
    } catch (err) {
        res.status(500).json({ error: "Error al crear taller" });
    }
}

export async function editarTaller(req, res) {
    const { title, description, expositor, starts_at, ends_at, capacity, location } = req.body;
    try {
        const [r] = await pool.query(
            `UPDATE workshops SET title=?, description=?, expositor=?, starts_at=?, ends_at=?, capacity=?, location=?
       WHERE id=? AND coordinator_id=?`,
            [title, description ?? null, expositor ?? null, starts_at, ends_at,
                capacity ?? 30, location ?? null, req.params.id, req.user.id]
        );
        if (r.affectedRows === 0) return res.status(403).json({ error: "No autorizado" });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: "Error al editar taller" });
    }
}

export async function eliminarTaller(req, res) {
    try {
        const [r] = await pool.query(
            "DELETE FROM workshops WHERE id = ? AND coordinator_id = ?",
            [req.params.id, req.user.id]
        );
        if (r.affectedRows === 0) return res.status(403).json({ error: "No autorizado" });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: "Error al eliminar taller" });
    }
}

export async function getInscritos(req, res) {
    try {
        const [rows] = await pool.query(`
      SELECT u.full_name, u.email, we.enrolled_at
      FROM workshop_enrollments we
      JOIN users u ON u.id = we.student_id
      WHERE we.workshop_id = ?
      ORDER BY u.full_name
    `, [req.params.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener inscritos" });
    }
}

// ── Reportes ──────────────────────────────────────────────────────────────────

// GET /api/coordinador/reportes/rendimiento
export async function getReporteRendimiento(req, res) {
    const coordId = req.user.id;
    try {
        const [cursos] = await pool.query(`
      SELECT
        c.code, c.name AS course_name,
        u.full_name AS docente_name,
        cs.section,
        COUNT(DISTINCT e.id)  AS inscritos,
        ROUND(AVG(CASE WHEN g.score IS NOT NULL THEN g.score ELSE NULL END), 2) AS promedio,
        SUM(CASE WHEN g.score IS NOT NULL AND g.score < 11 THEN 1 ELSE 0 END) AS desaprobados,
        SUM(CASE WHEN g.score IS NOT NULL AND g.score >= 11 THEN 1 ELSE 0 END) AS aprobados
      FROM coordinator_courses cc
      JOIN courses c          ON c.id  = cc.course_id
      JOIN course_sections cs ON cs.course_id = c.id
      JOIN periods p          ON p.id  = cs.period_id AND p.is_active = TRUE
      JOIN users u            ON u.id  = cs.docente_id
      LEFT JOIN enrollments e  ON e.course_section_id = cs.id
      LEFT JOIN evaluations ev ON ev.course_section_id = cs.id
      LEFT JOIN grades g       ON g.enrollment_id = e.id AND g.evaluation_id = ev.id
      WHERE cc.coordinator_id = ?
      GROUP BY cs.id
      ORDER BY c.code, cs.section
    `, [coordId]);
        res.json(cursos);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener reporte" });
    }
}

// GET /api/coordinador/reportes/asistencia
export async function getReporteAsistencia(req, res) {
    const coordId = req.user.id;
    try {
        const [cursos] = await pool.query(`
      SELECT
        c.code, c.name AS course_name, cs.section,
        COUNT(DISTINCT a.id)  AS total_registros,
        SUM(CASE WHEN a.status = 'presente'  THEN 1 ELSE 0 END) AS presentes,
        SUM(CASE WHEN a.status = 'tardanza'  THEN 1 ELSE 0 END) AS tardanzas,
        SUM(CASE WHEN a.status = 'ausente'   THEN 1 ELSE 0 END) AS ausentes,
        ROUND(
          SUM(CASE WHEN a.status IN ('presente','tardanza') THEN 1 ELSE 0 END) /
          NULLIF(COUNT(DISTINCT a.id), 0) * 100
        , 0) AS pct_asistencia
      FROM coordinator_courses cc
      JOIN courses c          ON c.id  = cc.course_id
      JOIN course_sections cs ON cs.course_id = c.id
      JOIN periods p          ON p.id  = cs.period_id AND p.is_active = TRUE
      LEFT JOIN enrollments e  ON e.course_section_id = cs.id
      LEFT JOIN attendance a   ON a.enrollment_id = e.id
      WHERE cc.coordinator_id = ?
      GROUP BY cs.id
      ORDER BY c.code, cs.section
    `, [coordId]);
        res.json(cursos);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener reporte asistencia" });
    }
}

// GET /api/coordinador/reportes/servicios
export async function getReporteServicios(req, res) {
    try {
        const [[asesorias]] = await pool.query(
            "SELECT COUNT(*) AS total FROM slot_bookings sb JOIN slots s ON s.id=sb.slot_id WHERE s.type='asesoria' AND sb.status!='cancelada'"
        );
        const [[citas]] = await pool.query(
            "SELECT COUNT(*) AS total FROM slot_bookings sb JOIN slots s ON s.id=sb.slot_id WHERE s.type='cita_psicologica' AND sb.status!='cancelada'"
        );
        const [[talleres]] = await pool.query(
            "SELECT COUNT(*) AS total FROM workshop_enrollments"
        );
        const [topTalleres] = await pool.query(`
      SELECT w.title, w.expositor, COUNT(we.id) AS inscritos, w.capacity
      FROM workshops w
      LEFT JOIN workshop_enrollments we ON we.workshop_id = w.id
      GROUP BY w.id ORDER BY inscritos DESC LIMIT 5
    `);
        res.json({ asesorias: asesorias.total, citas: citas.total, talleres: talleres.total, topTalleres });
    } catch (err) {
        res.status(500).json({ error: "Error al obtener reporte servicios" });
    }
}

// GET /api/coordinador/reportes/alertas
export async function getAlertas(req, res) {
    const coordId = req.user.id;
    try {
        const [[cfg]] = await pool.query(
            "SELECT min_promedio, min_asistencia_pct FROM coordinator_settings WHERE id = ?",
            [coordId]
        );

        const [alertas] = await pool.query(`
      SELECT
        u.id, u.full_name, u.email,
        c.code AS course_code, c.name AS course_name,
        ROUND(
          SUM(CASE WHEN g.score IS NOT NULL THEN g.score*(ev.weight/100) ELSE 0 END) /
          NULLIF(SUM(CASE WHEN g.score IS NOT NULL THEN ev.weight/100 ELSE 0 END), 0)
        , 2) AS promedio,
        ROUND(
          SUM(CASE WHEN a.status IN ('presente','tardanza') THEN 1 ELSE 0 END) /
          NULLIF(COUNT(DISTINCT a.id), 0) * 100
        , 0) AS pct_asistencia
      FROM coordinator_courses cc
      JOIN courses c          ON c.id  = cc.course_id
      JOIN course_sections cs ON cs.course_id = c.id
      JOIN periods p          ON p.id  = cs.period_id AND p.is_active = TRUE
      JOIN enrollments e      ON e.course_section_id = cs.id
      JOIN users u            ON u.id  = e.student_id
      LEFT JOIN evaluations ev ON ev.course_section_id = cs.id
      LEFT JOIN grades g       ON g.enrollment_id = e.id AND g.evaluation_id = ev.id
      LEFT JOIN attendance a   ON a.enrollment_id = e.id
      WHERE cc.coordinator_id = ?
      GROUP BY e.id
      HAVING promedio < ? OR pct_asistencia < ? OR (promedio IS NULL AND pct_asistencia < ?)
      ORDER BY promedio ASC
    `, [coordId, cfg.min_promedio, cfg.min_asistencia_pct, cfg.min_asistencia_pct]);

        res.json({ alertas, config: cfg });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener alertas" });
    }
}

// PATCH /api/coordinador/settings
export async function updateSettings(req, res) {
    const { min_promedio, min_asistencia_pct } = req.body;
    try {
        await pool.query(
            `INSERT INTO coordinator_settings (id, min_promedio, min_asistencia_pct)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE min_promedio = VALUES(min_promedio), min_asistencia_pct = VALUES(min_asistencia_pct)`,
            [req.user.id, min_promedio ?? 11, min_asistencia_pct ?? 70]
        );
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: "Error al guardar configuración" });
    }
}

// GET /api/coordinador/docentes-lista — para selector al crear sección
export async function getDocentesLista(req, res) {
    try {
        const [rows] = await pool.query(
            "SELECT id, full_name FROM users WHERE role = 'docente' ORDER BY full_name"
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Error" });
    }
}