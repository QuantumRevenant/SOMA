import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import {
    getResumen, getPersonal,
    getAlumnos, getPerfilAlumno,
    getPeriodos, crearPeriodo, activarPeriodo,
    getMisCursos, getSecciones, crearSeccion,
    getTalleres, crearTaller, editarTaller, eliminarTaller, getInscritos,
    getReporteRendimiento, getReporteAsistencia, getReporteServicios, getAlertas,
    updateSettings, getDocentesLista,
} from "../controllers/coordinador.controller.js";

const router = Router();
router.use(requireAuth, requireRole("coordinador"));

// Resumen
router.get("/resumen", getResumen);

// Personal
router.get("/personal", getPersonal);

// Alumnos
router.get("/alumnos", getAlumnos);
router.get("/alumnos/:id", getPerfilAlumno);

// Académico
router.get("/periodos", getPeriodos);
router.post("/periodos", crearPeriodo);
router.patch("/periodos/:id/activar", activarPeriodo);
router.get("/cursos", getMisCursos);
router.get("/cursos/:id/secciones", getSecciones);
router.post("/cursos/:id/secciones", crearSeccion);
router.get("/docentes-lista", getDocentesLista);

// Talleres
router.get("/talleres", getTalleres);
router.post("/talleres", crearTaller);
router.put("/talleres/:id", editarTaller);
router.delete("/talleres/:id", eliminarTaller);
router.get("/talleres/:id/inscritos", getInscritos);

// Reportes
router.get("/reportes/rendimiento", getReporteRendimiento);
router.get("/reportes/asistencia", getReporteAsistencia);
router.get("/reportes/servicios", getReporteServicios);
router.get("/reportes/alertas", getAlertas);
router.patch("/settings", updateSettings);

export default router;