import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import {
    getEstudiantes, getPerfilEstudiante,
    addObservacion, editObservacion, deleteObservacion,
    getMisCitas, crearSlot, eliminarSlot,
    getCalendario,
} from "../controllers/psicologo.controller.js";

const router = Router();
router.use(requireAuth, requireRole("psicologo"));

// Estudiantes
router.get("/estudiantes", getEstudiantes);
router.get("/estudiantes/:id", getPerfilEstudiante);
router.post("/estudiantes/:id/observaciones", addObservacion);
router.put("/observaciones/:id", editObservacion);
router.delete("/observaciones/:id", deleteObservacion);

// Citas
router.get("/citas", getMisCitas);
router.post("/citas", crearSlot);
router.delete("/citas/:id", eliminarSlot);

// Calendario
router.get("/calendario", getCalendario);

export default router;