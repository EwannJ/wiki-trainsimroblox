// Le haut de page, le pied de page et le menu de langues sont déjà dans le HTML envoyé par api/translate.py
initMenus();
markActiveLink();
import("/global/translate.js")
  .then((module) => module.initTranslation())
  .catch((err) => console.error("Menu de langues indisponible", err));

function initMenus() {
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("nav");
  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      menuToggle.setAttribute("aria-expanded", nav.classList.toggle("open"));
    });
  }

  document.querySelectorAll(".dropdown-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      button.setAttribute("aria-expanded", button.parentElement.classList.toggle("open"));
    });
  });

}

/** Surligne le lien du menu correspondant à la page (seulement si un seul lien correspond). */
function markActiveLink() {
  const clean = (p) => p.replace(/index\.html$/, "").replace(/\/+$/, "") || "/";
  const here = clean(location.pathname);
  const matches = [...document.querySelectorAll(".nav > .nav-link, .nav > .dropdown > .nav-link")].filter(
    (a) => !a.target && clean(new URL(a.href, location.origin).pathname) === here
  );
  if (matches.length === 1) matches[0].classList.add("active");
}