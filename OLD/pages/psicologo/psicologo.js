const btnBuscar = document.querySelector(".icon-search");

btnBuscar.addEventListener('click', () => {
    console.log('entro');
});

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