function mostrarNotificacion(mensaje, color = '#4CAF50', duracion = 2000) {
    const container = document.getElementById('notificacion-container');

    const notif = document.createElement('div');
    notif.classList.add('notificacion');
    notif.style.background = color;
    notif.textContent = mensaje;

    container.appendChild(notif);

    setTimeout(() => notif.classList.add('show'), 10);

    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => container.removeChild(notif), 300);
    }, duracion);
}
