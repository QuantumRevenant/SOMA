import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({ error: "No autenticado" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Token inválido o expirado" });
    }
}

export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: "Acceso denegado" });
        }
        next();
    };
}