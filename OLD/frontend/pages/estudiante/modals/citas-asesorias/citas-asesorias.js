document.addEventListener('DOMContentLoaded', function () {
    const btn = document.querySelector('.popup-cita-click');
    btn.addEventListener('click', function () {
        const popup = document.querySelector('.popup-citas');
        popup.classList.add('active');
    });
});

function cerrarPopup() {
    const popup = document.querySelector('.popup-citas');
    popup.classList.remove('active');
}

window.addEventListener('click', function (event) {
    const popup = document.querySelector('.popup-citas');
    if (event.target === popup) {
        popup.classList.remove('active');
    }
});
