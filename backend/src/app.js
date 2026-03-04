import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pool from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import { verifyPageAccess } from "./middlewares/auth.middleware.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(cookieParser());

// Archivos estáticos públicos (css, js, imágenes) — sin restricción
app.use("/js", express.static(join(__dirname, "../frontend/public/js")));
app.use("/style.css", express.static(join(__dirname, "../frontend/public/style.css")));
app.use("/resources", express.static(join(__dirname, "../frontend/public/resources")));

// Páginas protegidas — verifica cookie antes de servir el HTML
app.use("/pages", verifyPageAccess, express.static(join(__dirname, "../frontend/public/pages")));

// Página de login (pública)
app.use(express.static(join(__dirname, "../frontend/public")));

// Rutas API
app.use("/api", authRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "SOMA v0.3 running" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  pool.getConnection()
    .then(conn => {
      console.log("DB connected successfully");
      conn.release();
    })
    .catch(err => {
      console.error("DB connection failed:", err);
    });
});