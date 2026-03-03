// =======================
//     IMPORTACIONES
// =======================
const express = require('express');
const cors = require('cors');
const db = require('./db');   // Conexión MySQL
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Rutas externas
const psicologoRoutes = require('./routes/psicologo'); // 👈 RUTA CORRECTA

// =======================
//   CONFIGURAR SERVIDOR
// =======================
const app = express();
app.use(cors());
app.use(express.json());


// =======================
//        LOGIN
// =======================
app.post('/login', async (req, res) => {

  console.log("RECIBIDO:", req.body);

  const { usuario, password } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ message: "Faltan datos" });
  }

  const query = `
    SELECT IdUsuario, Usuario, Contrasena, RolId
    FROM usuarios
    WHERE Usuario = ?
  `;

  db.query(query, [usuario], async (err, results) => {
    if (err) return res.status(500).json({ message: "Error DB", error: err });

    if (results.length === 0) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    const user = results[0];

    // Comparar contraseña ingresada con la guardada (hash)
    const validPass = await bcrypt.compare(password, user.Contrasena);

    if (!validPass) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    // Crear token
    const token = jwt.sign(
      { id: user.IdUsuario, rol: user.RolId },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({
      message: "Login exitoso",
      user: {
        idUsuario: user.IdUsuario,
        usuario: user.Usuario,
        rol: user.RolId,
      },
      token,
    });
  });
});


// =======================
//      RUTAS API
// =======================

// Ruta oficial del psicólogo (buscar citas, pacientes, etc.)
app.use('/psicologo', psicologoRoutes);


// =======================
//     INICIAR SERVIDOR
// =======================
app.listen(3000, () => {
  console.log("Servidor backend en http://localhost:3000");
});