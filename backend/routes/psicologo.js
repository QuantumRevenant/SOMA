const express = require('express');
const router = express.Router();
const db = require('../db');

// ===============================================
//   CONSULTAR LA CITA MÁS PRÓXIMA POR ESTUDIANTE
// ===============================================
router.get('/citas', (req, res) => {
  const { nombre } = req.query;

  let sql = `
    SELECT * FROM (
        SELECT
            c.IdCita,
            c.FechaCita,
            c.HoraCita,
            c.Estado,
            p.Nombre AS NombreEstudiante,
            p.Apellido AS ApellidoEstudiante,
            ROW_NUMBER() OVER (
              PARTITION BY e.IdEstudiante
              ORDER BY c.FechaCita ASC, c.HoraCita ASC
            ) AS rn
        FROM citaspsicologicas c
        INNER JOIN estudiantes e ON e.IdEstudiante = c.EstudianteId
        INNER JOIN usuarios u ON u.IdUsuario = e.UsuarioId
        INNER JOIN personas p ON p.IdPersonas = u.PersonalId
        WHERE c.FechaCita >= CURDATE()
  `;

  if (nombre) {
    sql += ` AND (p.Nombre LIKE '%${nombre}%' OR p.Apellido LIKE '%${nombre}%')`;
  }

  sql += `
    ) AS t
    WHERE t.rn = 1
    ORDER BY t.FechaCita ASC, t.HoraCita ASC;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("ERROR SQL:", err);
      return res.status(500).json({ error: "Error al consultar citas", details: err });
    }

    return res.json(results);
  });
});

module.exports = router;