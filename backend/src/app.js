import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pool from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// Frontend estático
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