import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pool from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import docenteRoutes from "./routes/docente.routes.js";
import estudianteRoutes from "./routes/estudiante.routes.js";
import psicologoRoutes from "./routes/psicologo.routes.js";
import coordinadorRoutes from "./routes/coordinador.routes.js";
import { verifyPageAccess } from "./middlewares/auth.middleware.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(cookieParser());

// __dirname = backend/src → frontend está en ../../frontend (raíz del proyecto)
const FRONTEND = join(__dirname, "../../frontend/public");

app.use("/js",         express.static(join(FRONTEND, "js")));
app.use("/style.css",  express.static(join(FRONTEND, "style.css")));
app.use("/resources",  express.static(join(FRONTEND, "resources")));
app.use("/pages",      verifyPageAccess, express.static(join(FRONTEND, "pages")));
app.use(express.static(FRONTEND));

app.use("/api", authRoutes);
app.use("/api/docente", docenteRoutes);
app.use("/api/estudiante", estudianteRoutes);
app.use("/api/psicologo", psicologoRoutes);
app.use("/api/coordinador", coordinadorRoutes);

app.get("/health", (req, res) => res.json({ status: "SOMA v0.3 running" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  pool.getConnection()
    .then(conn => { console.log("DB connected successfully"); conn.release(); })
    .catch(err => { console.error("DB connection failed:", err); });
});