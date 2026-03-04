import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import {
    getMisSecciones,
    getAlumnosBySeccion,
    getEvaluacionesBySeccion,
    getPlantillaBySeccion,
    createEvaluacion,
    updateEvaluacion,
    deleteEvaluacion,
    upsertNota,
    registrarAsistencia,
    getAsistencia,
    getObservacionesAlumno,
    addObservacion,
    updateObservacion,
    deleteObservacion,
    getMisAsesorias,
    createAsesoria,
    deleteAsesoria,
} from "../controllers/docente.controller.js";

const router = Router();
router.use(requireAuth, requireRole("docente"));

// Secciones
router.get("/secciones", getMisSecciones);
router.get("/secciones/:id/alumnos", getAlumnosBySeccion);
router.get("/secciones/:id/evaluaciones", getEvaluacionesBySeccion);
router.get("/secciones/:id/plantilla", getPlantillaBySeccion);
router.post("/secciones/:id/evaluaciones", createEvaluacion);
router.get("/secciones/:id/asistencia", getAsistencia);

// Evaluaciones
router.put("/evaluaciones/:id", updateEvaluacion);
router.delete("/evaluaciones/:id", deleteEvaluacion);

// Notas
router.post("/notas", upsertNota);

// Asistencia
router.post("/asistencia", registrarAsistencia);

// Observaciones
router.get("/alumnos/:id/observaciones", getObservacionesAlumno);
router.post("/observaciones", addObservacion);
router.put("/observaciones/:id", updateObservacion);
router.delete("/observaciones/:id", deleteObservacion);

// Asesorías
router.get("/asesorias", getMisAsesorias);
router.post("/asesorias", createAsesoria);
router.delete("/asesorias/:id", deleteAsesoria);

export default router;