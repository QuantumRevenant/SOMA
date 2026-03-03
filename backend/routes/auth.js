import bcrypt from "bcrypt";
import express from "express";
import db from "../db.js";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ message: "Faltan datos" });

    const sql = `
        SELECT u.*, r.NombreRol 
        FROM usuarios u
        JOIN roles r ON u.RolId = r.IdRol
        WHERE u.Usuario = ?
    `;

    db.query(sql, [username], async (err, results) => {
        if (err) return res.status(500).json({ message: "Error en la base de datos" });

        if (results.length === 0)
            return res.status(404).json({ message: "Usuario no encontrado" });

        const user = results[0];

        // 🔥 Comparar hash bcrypt CORRECTAMENTE
        const validPass = await bcrypt.compare(password, user.Contrasena);

        if (!validPass)
            return res.status(401).json({ message: "Contraseña incorrecta" });

        const token = jwt.sign(
            { id: user.IdUsuario, rol: user.RolId },
            "secret",
            { expiresIn: "2h" }
        );

        res.json({
            message: "Login exitoso",
            user: {
                idUsuario: user.IdUsuario,
                usuario: user.Usuario,
                rol: user.RolId
            },
            token
        });
    });
});

export default router;