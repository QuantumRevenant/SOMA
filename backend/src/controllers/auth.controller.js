import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export async function login(req, res) {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email y contraseña requeridos" });
    }
    try {
        const [rows] = await pool.query(
            "SELECT id, email, password, role, full_name FROM users WHERE email = ?",
            [email]
        );
        if (rows.length === 0) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }
        const user = rows[0];

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        const expiresIn = rememberMe ? "30d" : "8h";
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
            process.env.JWT_SECRET,
            { expiresIn }
        );
        res.cookie("soma_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000
        });
        return res.json({ role: user.role });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
}

export function logout(req, res) {
    res.clearCookie("soma_token");
    return res.json({ ok: true });
}

export function me(req, res) {
    return res.json({
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        full_name: req.user.full_name,
    });
}