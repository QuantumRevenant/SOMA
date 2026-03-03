// Seleccionar el popup
const popup = document.querySelector('.popup');

// Seleccionar todos los botones que abren el popup
const openButtons = document.querySelectorAll('.open-popup');

// Seleccionar el botón de cerrar
const closeBtn = document.querySelector('.close-popup');

// Abrir popup para cualquier botón
openButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        popup.classList.add('active');
    });
});

// Cerrar popup con la X
closeBtn.addEventListener('click', () => {
    popup.classList.remove('active');
});

// Cerrar popup haciendo clic fuera del contenido
popup.addEventListener('click', (e) => {
    if (e.target === popup) {
        popup.classList.remove('active');
    }
});

function openTab(i) {
    document.querySelectorAll('.tab-popup').forEach((t, n) =>
        t.classList.toggle('active', n === i)
    );
    document.querySelectorAll('.content-popup').forEach((c, n) =>
        c.classList.toggle('active', n === i)
    );
}

