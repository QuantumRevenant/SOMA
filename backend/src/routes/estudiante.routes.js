import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import {
    getAllCursos, getNotasCurso, getResumen,
    getAsistenciaCurso, getMisServicios,
    getAsesorias, reservarAsesoria, cancelarAsesoria,
    getTalleres, inscribirTaller, desinscribirTaller,
    getCitas, reservarCita, cancelarCita,
} from "../controllers/estudiante.controller.js";

const router = Router();
router.use(requireAuth, requireRole("estudiante"));

router.get("/resumen", getResumen);
router.get("/cursos", getAllCursos);
router.get("/cursos/:enrollmentId/notas", getNotasCurso);
router.get("/cursos/:enrollmentId/asistencia", getAsistenciaCurso);

router.get("/mis-servicios", getMisServicios);
router.get("/asesorias", getAsesorias);
router.post("/asesorias/:id/reservar", reservarAsesoria);
router.delete("/asesorias/:id/reservar", cancelarAsesoria);
router.get("/talleres", getTalleres);
router.post("/talleres/:id/inscribir", inscribirTaller);
router.delete("/talleres/:id/inscribir", desinscribirTaller);
router.get("/citas", getCitas);
router.post("/citas/:id/reservar", reservarCita);
router.delete("/citas/:id/reservar", cancelarCita);

export default router;