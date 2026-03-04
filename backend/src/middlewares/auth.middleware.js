import jwt from "jsonwebtoken";

// Para rutas API — responde JSON
export function requireAuth(req, res, next) {
    const token = req.cookies?.soma_token;

    if (!token) {
        return res.status(401).json({ error: "No autenticado" });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: "Token inválido o expirado" });
    }
}

// Para páginas HTML — redirige al login en vez de responder JSON
export function verifyPageAccess(req, res, next) {
    const token = req.cookies?.soma_token;

    if (!token) {
        return res.redirect("/");
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);

        // Verifica que el rol coincida con la página que pide
        const urlRole = req.path.split("/")[1]; // /docente/docente.html → "docente"
        if (urlRole && req.user.role !== urlRole) {
            return res.redirect("/");
        }

        next();
    } catch {
        return res.redirect("/");
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