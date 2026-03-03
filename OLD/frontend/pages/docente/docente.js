document.addEventListener("click", (e) => {
    const tab = e.target.closest(".items ul li");
    if (!tab) return;

    const selected = tab.dataset.tab;

    document.querySelectorAll(".items ul li").forEach(li => {
        li.classList.toggle("active", li === tab);
    });

    document.querySelectorAll(".tab-content").forEach(section => {
        section.classList.toggle("show", section.dataset.content === selected);
    });
});

function mostrarObservaciones() {
    const mostrar = document.getElementById('mostrarBusqueda');
    mostrar.classList.add('hidden');

    const container = document.getElementById('observacionesContainer');
    container.classList.remove('hidden');
}

function regresar() {
    const mostrar = document.getElementById('mostrarBusqueda');
    mostrar.classList.remove('hidden');

    const container = document.getElementById('observacionesContainer');
    container.classList.add('hidden');
}

function handleGuardar() {
    const observaciones = document.getElementById('observaciones').value;
    console.log('Observaciones:', observaciones);
    regresar();
}
