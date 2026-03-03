document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        alert("Por favor, ingresa usuario y contraseña");
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Error en el login");
            return;
        }

        // Guardar token
        localStorage.setItem("token", data.token);

        // Redirección según el rol (numérico)
        switch (data.user.rol) {
            case 1:
                window.location.href = "pages/estudiante/estudiante.html";
                break;

            case 2:
                window.location.href = "pages/docente/docente.html";
                break;

            case 3:
                window.location.href = "pages/psicologo/psicologo.html";
                break;

            default:
                alert("Rol no reconocido: " + data.user.rol);
        }

    } catch (error) {
        console.error("Error:", error);
        alert("No se puede conectar con el servidor");
    }
});

function logout() {
    try { localStorage.clear(); } catch (e) { }

    const proto = window.location.protocol;
    const host = window.location.host;
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);

    if (proto === 'file:') {
        const idxFront = segments.indexOf('frontend');
        if (idxFront !== -1) {
            const depthAfterFrontend = segments.length - (idxFront + 1);
            const up = depthAfterFrontend === 0 ? '' : '../'.repeat(depthAfterFrontend);
            const rel = up + 'frontend/' + 'login.html';
            window.location.replace(rel);
            return;
        }

        window.location.replace('login.html');
        return;
    }

    if (host && host.endsWith('github.io')) {
        const repo = segments.length > 0 ? segments[0] : '';
        if (repo) {
            window.location.replace('/' + repo + '/frontend/login.html');
            return;
        } else {
            window.location.replace('/frontend/login.html');
            return;
        }
    }

    window.location.replace('/frontend/login.html');
}
