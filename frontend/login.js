document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const usuario = document.getElementById("usuario").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!usuario || !password) {
        alert("Completa todos los campos");
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario, password })
        });

        const data = await response.json();
        console.log(data);

        if (data.message === "Login exitoso") {

            localStorage.setItem("token", data.token);
            localStorage.setItem("rol", data.user.rol);

            switch (data.user.rol) {

                case 2: // docente
                    window.location.href = "pages/docente/docente.html";
                    break;

                case 3: // estudiante
                    window.location.href = "pages/estudiante/estudiante.html";
                    break;

                case 4: // psicólogo
                    window.location.href = "pages/psicologo/psicologo.html";
                    break;

                default:
                    alert("Rol desconocido");
            }

        } else {
            alert("Usuario o contraseña incorrectos");
        }

    } catch (err) {
        console.error(err);
        alert("Error al conectar con el servidor");
    }
});

try {
    document.querySelectorAll(".social-links a").forEach(a => {
        a.addEventListener("click", (e) => {
            e.preventDefault();

            const w = 500, h = 600;
            const left = (screen.width - w) / 2;
            const top = (screen.height - h) / 2;

            window.open(
                a.dataset.url,
                "login",
                `width=${w},height=${h},left=${left},top=${top}`
            );
        });
    });
} catch { }
