import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import {
    getMisSecciones,
    getAlumnosBySeccion,
    getEvaluacionesBySeccion,
    upsertNota,
    addObservacion,
    getMisAsesorias,
    createAsesoria,
} from "../controllers/docente.controller.js";

const router = Router();
router.use(requireAuth, requireRole("docente"));

// Secciones del docente (periodo activo por defecto, ?period_id=X para otros)
router.get("/secciones", getMisSecciones);

// Alumnos de una sección
router.get("/secciones/:id/alumnos", getAlumnosBySeccion);

// Evaluaciones y notas de una sección
router.get("/secciones/:id/evaluaciones", getEvaluacionesBySeccion);
router.post("/notas", upsertNota);

// Observaciones
router.post("/observaciones", addObservacion);

// Asesorías
router.get("/asesorias", getMisAsesorias);
router.post("/asesorias", createAsesoria);

export default router;