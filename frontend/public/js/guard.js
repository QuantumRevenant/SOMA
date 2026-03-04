import { getToken } from "./storage.js";

const ROLE_ROUTES = {
    coordinador: "/pages/coordinador/coordinador.html",
    docente: "/pages/docente/docente.html",
    estudiante: "/pages/estudiante/estudiante.html",
    psicologo: "/pages/psicologo/psicologo.html",
};

/**
 * Llama esto al inicio de cada página protegida.
 * @param {string} expectedRole - rol que puede ver esta página
 *
 * Uso: import { guardPage } from "/js/guard.js";
 *      guardPage("docente");
 */
export function guardPage(expectedRole) {
    const token = getToken();

    // Sin token → al login
    if (!token) {
        window.location.replace("/");
        return;
    }

    try {
        // Decodifica el payload sin verificar firma (eso lo hace el backend)
        const payload = JSON.parse(atob(token.split(".")[1]));

        // Token expirado → al login
        if (payload.exp && Date.now() / 1000 > payload.exp) {
            window.location.replace("/");
            return;
        }

        // Rol incorrecto → redirige a su página correcta
        if (payload.role !== expectedRole) {
            window.location.replace(ROLE_ROUTES[payload.role] ?? "/");
            return;
        }

    } catch {
        window.location.replace("/");
    }
}