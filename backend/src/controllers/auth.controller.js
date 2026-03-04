import pool from "../config/db.js";
import jwt from "jsonwebtoken";

export async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email y contraseña requeridos" });
    }

    try {
        const [rows] = await pool.query(
            "SELECT id, email, password, role FROM users WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        const user = rows[0];

        // Por ahora comparación directa — luego migraremos a bcrypt
        if (password !== user.password) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        return res.json({ token, role: user.role });

    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
}